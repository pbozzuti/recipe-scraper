from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List
from supabase import create_client
import requests
from recipe_scrapers import scrape_html
import os
from dotenv import load_dotenv
load_dotenv()

# --- Supabase setup ---
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# --- FastAPI setup ---
app = FastAPI(title="Recipe Cleaner API")

# CORS for frontend
origins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "https://recipe-scraper-mu-azure.vercel.app",
    "https://recipe-scraper-git-main-pbozzutis-projects.vercel.app",
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Models ---
class Ingredient(BaseModel):
    id: int | None
    raw_text: str
    amount: str | None = None
    unit: str | None = None
    name: str

class Step(BaseModel):
    number: int
    text: str

class Recipe(BaseModel):
    id: int | None
    title: str
    source_url: str
    ingredients: List[Ingredient]
    steps: List[Step]

class ScrapeRequest(BaseModel):
    url: str

class SubstituteRequest(BaseModel):
    ingredient: str
    constraints: str | None = None

class SubstituteOption(BaseModel):
    name: str
    ratio: str
    instructions: str | None = None
    caveats: str | None = None

class SubstituteResponse(BaseModel):
    substitutes: List[SubstituteOption]

# --- Routes ---
@app.get("/health")
async def health():
    return {"status": "ok"}

@app.get("/recipes", response_model=List[Recipe])
async def list_recipes():
    # Fetch all recipes
    res = supabase.table("recipes").select("*").execute()
    recipes_data = res.data

    recipes = []
    for r in recipes_data:
        recipe_id = r["id"]
        # Fetch ingredients
        ing_res = supabase.table("ingredients").select("*").eq("recipe_id", recipe_id).execute()
        ingredients = [Ingredient(**ing) for ing in ing_res.data]
        # Fetch steps
        steps_res = supabase.table("steps").select("*").eq("recipe_id", recipe_id).execute()
        steps = [Step(number=s["number"], text=s["text"]) for s in steps_res.data]
        # Build recipe
        recipes.append(Recipe(id=recipe_id, title=r["title"], source_url=r["source_url"], ingredients=ingredients, steps=steps))
    return recipes

@app.get("/recipes/{recipe_id}", response_model=Recipe)
async def get_recipe(recipe_id: int):
    # Fetch recipe
    res = supabase.table("recipes").select("*").eq("id", recipe_id).execute()
    data = res.data
    if not data:
        raise HTTPException(status_code=404, detail="Recipe not found")
    r = data[0]
    # Ingredients
    ing_res = supabase.table("ingredients").select("*").eq("recipe_id", recipe_id).execute()
    ingredients = [Ingredient(**ing) for ing in ing_res.data]
    # Steps
    steps_res = supabase.table("steps").select("*").eq("recipe_id", recipe_id).execute()
    steps = [Step(number=s["number"], text=s["text"]) for s in steps_res.data]
    return Recipe(id=recipe_id, title=r["title"], source_url=r["source_url"], ingredients=ingredients, steps=steps)

@app.post("/recipes/scrape", response_model=Recipe)
async def scrape_recipe(req: ScrapeRequest):
    print(f"🔍 Scraping: {req.url}")
    response = requests.get(req.url, timeout=10, headers={
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    })
    response.raise_for_status()

    scraped = scrape_html(response.text, req.url)
    title = scraped.title()
    ingredients_list = scraped.ingredients()
    instructions_list = scraped.instructions_list()
    print(f"✅ Parsed: {title}, {len(ingredients_list)} ingredients")

    # Save recipe
    recipe_res = supabase.table("recipes").insert({"title": title or "Unknown Recipe", "source_url": req.url}).execute()
    recipe_id = recipe_res.data[0]["id"]

    # Save ingredients
    for i, text in enumerate(ingredients_list, 1):
        supabase.table("ingredients").insert({
            "recipe_id": recipe_id,
            "raw_text": text,
            "amount": None,
            "unit": None,
            "name": text.lower()
        }).execute()

    # Save steps
    for i, text in enumerate(instructions_list, 1):
        supabase.table("steps").insert({
            "recipe_id": recipe_id,
            "number": i,
            "text": text
        }).execute()

    # Return the recipe
    ingredients = [Ingredient(id=None, raw_text=text, amount=None, unit=None, name=text.lower()) for text in ingredients_list]
    steps = [Step(number=i+1, text=text) for i, text in enumerate(instructions_list)]
    return Recipe(id=recipe_id, title=title, source_url=req.url, ingredients=ingredients, steps=steps)

@app.delete("/recipes/{recipe_id}")
async def delete_recipe(recipe_id: int):
    # Delete ingredients
    supabase.table("ingredients").delete().eq("recipe_id", recipe_id).execute()
    # Delete steps
    supabase.table("steps").delete().eq("recipe_id", recipe_id).execute()
    # Delete recipe
    supabase.table("recipes").delete().eq("id", recipe_id).execute()
    return {"message": "Recipe deleted successfully"}

@app.post("/recipes/{recipe_id}/substitute", response_model=SubstituteResponse)
async def substitute_ingredient(recipe_id: int, body: SubstituteRequest):
    # TEMP stub
    return SubstituteResponse(
        substitutes=[
            SubstituteOption(
                name="Half-and-half + butter",
                ratio="3/4 cup half-and-half + 1/4 cup melted butter per 1 cup heavy cream",
                instructions="Mix before adding to the recipe.",
                caveats="Slightly lower fat; texture may be less rich.",
            )
        ]
    )

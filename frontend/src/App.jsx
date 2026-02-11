import { useEffect, useState } from "react";
import { ArrowLeft, Check, ChevronRight, Mic, Search, Trash2 } from "lucide-react";
import "./App.css";

const API_BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function RecipeCleanerUI() {
  const [recipes, setRecipes] = useState([]);
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [scrapeUrl, setScrapeUrl] = useState("");
  const [parsedRecipe, setParsedRecipe] = useState(null);
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState("home"); // "home" | "menu" | "detail"
  const [checkedIngredients, setCheckedIngredients] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  const categories = ["All", "Breakfast", "Lunch", "Dinner"];

  async function fetchRecipes() {
    try {
      const res = await fetch(`${API_BASE}/recipes`);
      const data = await res.json();
      setRecipes(data);
    } catch (error) {
      console.error("Failed to fetch recipes:", error);
    }
  }

  async function parseRecipeUrl() {
    if (!scrapeUrl) return;
    setLoading(true);
    setParsedRecipe(null);
    try {
      const res = await fetch(`${API_BASE}/recipes/scrape`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: scrapeUrl })
      });
      const data = await res.json();
      setParsedRecipe(data);
    } catch (error) {
      console.error("Failed to parse recipe:", error);
    }
    setLoading(false);
  }

  async function saveRecipe() {
    if (!parsedRecipe) return;
    await fetchRecipes();
    setScrapeUrl("");
    setParsedRecipe(null);
  }

  async function deleteRecipe(recipeId, event) {
    event.stopPropagation();
    if (!confirm("Are you sure you want to delete this recipe?")) return;
    try {
      await fetch(`${API_BASE}/recipes/${recipeId}`, {
        method: "DELETE",
      });
      await fetchRecipes();
      if (selectedRecipe?.id === recipeId) {
        setSelectedRecipe(null);
        setCurrentView("menu");
      }
    } catch (error) {
      console.error("Failed to delete recipe:", error);
    }
  }

  useEffect(() => {
    fetchRecipes();
  }, []);

  const toggleIngredient = (id) => {
    setCheckedIngredients(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const filteredRecipes = recipes.filter(recipe =>
    recipe.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="app">
      {/* Top Bar */}
      <div className="top-bar">
        <button
          className={`menu-pill ${currentView === "menu" ? "active" : ""}`}
          onClick={() => setCurrentView("menu")}
        >
          Menu
        </button>
        <button className="top-btn">
          Log In
        </button>
      </div>

      {/* Main Content */}
      <div className="main-content">
        {currentView === "home" && (
          // Home/Search Screen
          <div className="home-screen">
            <h1 className="main-title" onClick={() => setCurrentView("home")}>Paris's<br />Recipes</h1>

            <div className="search-section">
              <div className="url-input-container">
                <input
                  type="url"
                  className="url-input"
                  placeholder="URL"
                  value={scrapeUrl}
                  onChange={(e) => setScrapeUrl(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      parseRecipeUrl();
                    }
                  }}
                />
                <button
                  className="search-btn"
                  onClick={parseRecipeUrl}
                  disabled={!scrapeUrl || loading}
                >
                  <Search size={20} />
                </button>
              </div>

              {loading && (
                <div className="recipe-preview">
                  <p className="recipe-preview-text">Loading...</p>
                </div>
              )}

              {parsedRecipe && !loading && (
                <div className="recipe-preview">
                  <p className="recipe-preview-text">{parsedRecipe.title}</p>
                </div>
              )}

              <button
                className="save-button"
                onClick={saveRecipe}
                disabled={!parsedRecipe}
              >
                Save
              </button>
            </div>
          </div>
        )}

        {currentView === "menu" && (
          // Menu/Recipe List Screen
          <div className="menu-screen">
            <h1 className="main-title clickable" onClick={() => setCurrentView("home")}>Paris's<br />Recipes</h1>

            <div className="search-bar">
              <Search size={20} className="search-icon" />
              <input
                type="text"
                placeholder="Search a recipe"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Mic size={20} className="mic-icon" />
            </div>

            <div className="category-tabs">
              {categories.map(category => (
                <button
                  key={category}
                  className={`category-tab ${selectedCategory === category ? "active" : ""}`}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <div className="recipe-list-view">
              {filteredRecipes.length === 0 ? (
                <p className="empty-list">No recipes found</p>
              ) : (
                filteredRecipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="recipe-list-item"
                    onClick={() => {
                      setSelectedRecipe(recipe);
                      setCurrentView("detail");
                    }}
                  >
                    <div className="recipe-list-left">
                      <div className="recipe-checkbox"></div>
                      <span className="recipe-list-name">{recipe.title}</span>
                    </div>
                    <div className="recipe-list-right">
                      <button
                        className="delete-icon-btn"
                        onClick={(e) => deleteRecipe(recipe.id, e)}
                        title="Delete recipe"
                      >
                        <Trash2 size={16} />
                      </button>
                      <ChevronRight size={20} className="chevron-icon" />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {currentView === "detail" && selectedRecipe && (
          // Recipe Detail View
          <div className="recipe-view">
            <button className="back-button" onClick={() => {
              setSelectedRecipe(null);
              setCheckedIngredients(new Set());
              setCurrentView("menu");
            }}>
              <ArrowLeft size={24} />
              <span>Back</span>
            </button>

            <h2 className="recipe-title">{selectedRecipe.title}</h2>

            <div className="recipe-content">
              <div className="ingredients-section">
                <h3>Ingredients</h3>
                {selectedRecipe.ingredients.map((ing) => (
                  <div
                    key={ing.id}
                    className="ingredient-item"
                    onClick={() => toggleIngredient(ing.id)}
                  >
                    <span className={checkedIngredients.has(ing.id) ? "checked" : ""}>
                      {ing.raw_text}
                    </span>
                    {checkedIngredients.has(ing.id) && (
                      <Check size={18} className="check-icon" />
                    )}
                  </div>
                ))}
              </div>

              <div className="steps-section">
                <h3>Instructions</h3>
                {selectedRecipe.steps.map((step) => (
                  <div key={step.number} className="step-item">
                    <div className="step-number">{step.number}</div>
                    <div className="step-text">{step.text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

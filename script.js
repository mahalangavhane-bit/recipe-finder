const apiKey = "ad5da1ddfe9340989f7119951daed19f"; 
const apiBaseUrl = "https://api.spoonacular.com/recipes";

const searchNameBtn = document.getElementById('search-name-btn');
const searchIngredientBtn = document.getElementById('search-ingredient-btn');
const nameInput = document.getElementById('recipe-name-input');
const ingredientInput = document.getElementById('ingredient-input');
const resultsContainer = document.getElementById('results-container');
const modal = document.getElementById('recipe-modal');
const modalBody = document.getElementById('modal-body');
const closeBtn = document.querySelector('.close-btn');


searchNameBtn.addEventListener('click', () => {
    const query = nameInput.value.trim();
    if (query) searchRecipes(query, 'name');
});

searchIngredientBtn.addEventListener('click', () => {
    const query = ingredientInput.value.trim();
    if (query) searchRecipes(query, 'ingredient');
});


nameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchNameBtn.click();
});

ingredientInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchIngredientBtn.click();
});

closeBtn.addEventListener('click', () => {
    modal.classList.remove('show');
    setTimeout(() => { modal.style.display = 'none'; }, 300);
});

window.addEventListener('click', (e) => {
    if (e.target === modal) {
        closeBtn.click();
    }
});


const keywordMapping = {
    "poha": "flattened rice,onion,potato,peanuts",
    "idli": "rice,lentils",
    "dosa": "rice,lentils",
    "ramen": "noodles,egg,chicken",
    "tacos": "tortilla,beef,lettuce",
    "pizza": "cheese,tomato,dough",
    "sushi": "rice,fish",
    "pasta": "wheat,tomato,cheese",
    "fried rice": "rice,vegetables,egg",
    "biryani": "rice,chicken,spices"
};

async function searchRecipes(query, type) {
    showLoading();

    if (!navigator.onLine) {
        showError("You appear to be offline. Please check your internet connection.");
        return;
    }

    try {
        let meals = [];
        const lowerQuery = query.toLowerCase().trim();

        
        if (type === 'name' || type === 'common') {
            console.log(`Searching by name for: ${query}`);
            meals = await fetchByName(query);
        }

        
        if ((!meals || meals.length === 0)) {
            
            const mapKey = keywordMapping[lowerQuery] || Object.keys(keywordMapping).find(k => lowerQuery.includes(k));

            if (mapKey) {
                const mappedIngredients = keywordMapping[mapKey];
                console.log(`Found mapping for "${query}" (mapped to ${mapKey}): ${mappedIngredients}`);
                meals = await searchByIngredients(mappedIngredients);
            }
        }

        
        if ((!meals || meals.length === 0)) {
            console.log("No dish/mapping found. Searching as ingredients...");
            
            meals = await searchByIngredients(query);
        }

        if (meals && meals.length > 0) {
            displayRecipes(meals);
        } else {
            showError("No recipes found. Try searching for 'chicken', 'pasta', or check spelling.");
        }
    } catch (error) {
        console.error("Fetch error:", error);
        showError("Failed to fetch recipes. Please check your API Key and internet connection.");
    }
}


async function fetchByName(name) {
    try {
        
        const res = await fetch(`${apiBaseUrl}/complexSearch?query=${encodeURIComponent(name)}&number=12&apiKey=${apiKey}`);
        if (!res.ok) throw new Error("API Limit or Key Error");
        const data = await res.json();
        return data.results || [];
    } catch (e) {
        console.error("Name fetch failed", e);
        return [];
    }
}

async function searchByIngredients(ingredientsString) {
   
    const formattedIngredients = ingredientsString.split(/[\s,]+/).join(',');
    console.log(`Searching ingredients: ${formattedIngredients}`);

    try {
        const res = await fetch(`${apiBaseUrl}/findByIngredients?ingredients=${encodeURIComponent(formattedIngredients)}&number=12&ranking=2&apiKey=${apiKey}`);
        if (!res.ok) throw new Error("API Limit or Key Error");
        const data = await res.json();
        return data || [];
    } catch (e) {
        console.error("Ingredient fetch failed", e);
        return [];
    }
}

function displayRecipes(recipes) {
    resultsContainer.innerHTML = '';

    recipes.forEach(recipe => {
        const card = document.createElement('div');
        card.classList.add('recipe-card');

        
        const title = recipe.title;
        const image = recipe.image;
        const id = recipe.id;

        card.innerHTML = `
            <img src="${image}" alt="${title}" loading="lazy">
            <div class="card-info">
                <h3>${title}</h3>
                <div class="tags">
                    <!-- Spoonacular simple search often doesn't return detailed tags in list view without extra calls, so we keep it simple -->
                    <span class="tag">Recipe</span>
                </div>
            </div>
        `;

        card.addEventListener('click', () => {
            getRecipeDetails(id);
        });

        resultsContainer.appendChild(card);
    });
}

async function getRecipeDetails(id) {
    
    modal.style.display = 'flex';
    setTimeout(() => modal.classList.add('show'), 10);
    modalBody.innerHTML = '<div class="loader"></div>';

    try {
        const response = await fetch(`${apiBaseUrl}/${id}/information?apiKey=${apiKey}`);
        const recipe = await response.json();
        showModal(recipe);
    } catch (error) {
        console.error(error);
        modalBody.innerHTML = '<p class="error-msg">Failed to load recipe details. Check API Key.</p>';
    }
}

function showModal(recipe) {
    
    const ingredients = recipe.extendedIngredients || [];

    
    let instructions = recipe.instructions || "No instructions available.";
    if (!recipe.instructions && recipe.analyzedInstructions && recipe.analyzedInstructions.length > 0) {
        instructions = recipe.analyzedInstructions[0].steps.map(s => `<p>${s.step}</p>`).join('');
    }

    const readyInMinutes = recipe.readyInMinutes ? `${recipe.readyInMinutes} mins` : 'N/A';
    const servings = recipe.servings ? `${recipe.servings} pp` : 'N/A';

    modalBody.innerHTML = `
        <div class="modal-header">
            <img src="${recipe.image}" class="modal-img" alt="${recipe.title}">
        </div>
        <div class="modal-details">
            <h2 class="modal-title">${recipe.title}</h2>
            <div class="recipe-meta">
                <div><i class="fa-solid fa-earth-americas"></i> ${recipe.cuisines?.length ? recipe.cuisines[0] : 'Global'}</div>
                <div><i class="fa-solid fa-clock"></i> ${readyInMinutes}</div>
                <div><i class="fa-solid fa-users"></i> ${servings}</div>
            </div>
            
            <h3>Ingredients</h3>
            <div class="ingredients-list">
                ${ingredients.map(ing => `
                    <div class="ingredient-item">
                        <i class="fa-solid fa-check"></i> ${ing.original}
                    </div>
                `).join('')}
            </div>

            <div class="instructions">
                <h3>Instructions</h3>
                <div class="instruction-text">${instructions}</div>
            </div>
            
            ${recipe.spoonacularSourceUrl ? `
                <div style="margin-top: 2rem;">
                    <a href="${recipe.spoonacularSourceUrl}" target="_blank" class="tag" style="background: #28a745; color: white; padding: 0.8rem 1.5rem; text-decoration: none; display: inline-flex; align-items: center; gap: 0.5rem;">
                        <i class="fa-solid fa-external-link-alt"></i> View Full Recipe
                    </a>
                </div>
            ` : ''}
        </div>
    `;
}

function showLoading() {
    resultsContainer.innerHTML = '<div class="loader"></div>';
}

function showError(msg) {
    resultsContainer.innerHTML = `
        <div class="empty-state">
            <i class="fa-solid fa-triangle-exclamation"></i>
            <p>${msg}</p>
        </div>
    `;
}

/* Get references to DOM elements */
const categoryFilter = document.getElementById("categoryFilter");
const productsContainer = document.getElementById("productsContainer");
const selectedProductsContainer = document.getElementById("selectedProductsList");
const chatForm = document.getElementById("chatForm");
const chatWindow = document.getElementById("chatWindow");
const userInput = document.getElementById("userInput");
const generateRoutineButton = document.getElementById("generateRoutine");

/* Show initial placeholder until user selects a category */
productsContainer.innerHTML = `
  <div class="placeholder-message">
    Select a category to view products
  </div>
`;

const openAiUrl = "https://loreal-chat-bot.jnbent.workers.dev/";

let previousResponseId = null;

const selectedProducts = JSON.parse(localStorage.getItem("selectedProducts")) || {};



const instructions = `
You are a helpful and knowledgeable assistant for L’Oréal. You can:
1. Answer questions about L’Oréal products, beauty routines, skincare, haircare, cosmetics, and other beauty-related topics.
2. Build personalized beauty routines based on selected products provided by the user.

When answering questions:
- Be concise, accurate, and specific about the product details or routine.
- Only respond to beauty-related inquiries, politely informing the user if their question is outside the scope of beauty and L’Oréal topics.

When generating routines:
- Use the provided product data (name, brand, category, description).
- Create a step-by-step beauty routine, considering the category and description of each product.
- Include additional tips for timing, application, layering, or usage whenever possible.

Always ensure your responses are clear and user-friendly.
`;

/* Load product data from JSON file */
async function loadProducts() {
  const response = await fetch("products.json");
  const data = await response.json();
  return data.products;
}

const addAttributes = (product, element) => {
  const imageEl = document.createElement("img");
  imageEl.setAttribute("src", product.image);
  imageEl.setAttribute("alt", product.name);

  const h3El = document.createElement("h3");
  h3El.innerText = product.name;

  const pEl = document.createElement("p");
  pEl.innerText = product.brand;

  // Tooltip description
  const descriptionEl = document.createElement("div");
  descriptionEl.classList.add("description-tooltip");
  descriptionEl.innerText = product.description;

  const infoEl = document.createElement("div");
  infoEl.classList.add("product-info");
  infoEl.append(h3El, pEl);

  element.classList.add("product-card");
  if (product.id in selectedProducts) {
    element.classList.add("selected-products");
  }
  element.setAttribute("data-product-id", product.id);
  element.setAttribute("data-product-name", product.name);
  element.setAttribute("data-product-brand", product.brand);
  element.setAttribute("data-product-image", product.image);
  element.setAttribute("data-product-description", product.description);
  element.setAttribute("data-product-category", product.category);

  element.append(imageEl, infoEl, descriptionEl);

  // Dynamically adjust tooltip position on the screen
  element.addEventListener("mouseenter", () => {
    const rect = element.getBoundingClientRect();
    const tooltipPosition =
      rect.left + rect.width + 250 > window.innerWidth ? "left" : "right";
    element.setAttribute("data-tooltip-position", tooltipPosition);
  });
};

const handleSelectedProductClick = (productId, el) =>{
  const productEl = productsContainer.querySelector(`[data-product-id="${productId}"]`);
  if (productEl)
    productEl.classList.remove("selected-products")
  delete selectedProducts[productId];
  localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts))
  el.remove();
}

/* Create HTML for displaying product cards */
function displayProducts(products) {
  const productEls = products
    .map(
      (product) => {
          const productEl = document.createElement("div");
          if (product.id in selectedProducts) productEl.classList.add("selected-products")
          addAttributes(product, productEl);
          productEl.addEventListener("click", (e) => {
            if (productEl.classList.contains("selected-products")) {
              productEl.classList.remove("selected-products");
              delete selectedProducts[productEl.dataset.productId];
                localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts))
            } else {
              productEl.classList.add("selected-products");
              selectedProducts[productEl.dataset.productId] = {
                id: productEl.dataset.productId,
                name: productEl.dataset.productName,
                image: productEl.dataset.productImage,
                brand: productEl.dataset.productBrand,
                category: productEl.dataset.productCategory,
                description: productEl.dataset.productDescription
              };
              localStorage.setItem("selectedProducts", JSON.stringify(selectedProducts))
              const selectedProductEl = document.createElement("div");
              addAttributes(product, selectedProductEl);
              selectedProductEl.addEventListener("click", () => handleSelectedProductClick(product.id, selectedProductEl))
              selectedProductsContainer.appendChild(selectedProductEl);
            }
          })
        return productEl;
      }
    )
    productsContainer.replaceChildren(...productEls);
}

const fetchRoutineResponse = async (inputVal) => {
    const response = await fetch(openAiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST',
        'Access-Control-Allow-Headers': 'Content-Type'
      },
      body: JSON.stringify({
        previous_response_id: previousResponseId,
        instructions,
        model: "gpt-4o",
        input: inputVal,
        tools: [{"type": "web_search_preview"}]
      })
    })

    const openAiData = await response.json();
    previousResponseId = openAiData.id;
    return openAiData.output.find(el => el.type === "message").content[0].text;
}

/* Filter and display products when category changes */
categoryFilter.addEventListener("change", async (e) => {
  const products = await loadProducts();
  const selectedCategory = e.target.value;

  /* filter() creates a new array containing only products
     where the category matches what the user selected */
  const filteredProducts = products.filter(
    (product) => product.category === selectedCategory
  );

  displayProducts(filteredProducts);
  document.querySelectorAll(".product-card").forEach(el => {
    el.addEventListener("click", () => {
    })
  })
});

let secondsLoading = 0;
const loadingPeriods = (element) => {
  secondsLoading += 1;
  const period = ".";
  element.innerHTML = "Loading"+ period.repeat(secondsLoading % 4);
}

const addAiResponse = async (inputText) => {
  const newAiResponseElement = document.createElement("div");
  newAiResponseElement.classList.add("bot-response");
  loadingPeriods(newAiResponseElement);
  const interval = setInterval(loadingPeriods, 500, newAiResponseElement);
  chatWindow.appendChild(newAiResponseElement);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  try {
    const newAiResponse= await fetchRoutineResponse(inputText)
    clearInterval(interval);
    secondsLoading = 0;
    newAiResponseElement.innerHTML = marked.parse(newAiResponse);

  } catch (error) {
    alert("Unable to connect to the OpenAI API. Please try again later.")
    clearInterval(interval);
    secondsLoading = 0;
    newAiResponseElement.remove();
  }
}

/* Chat form submission handler - placeholder for OpenAI integration */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const userRequest = document.createElement("div");
  userRequest.classList.add("user-response");
  const uInput = userInput.value;
  userRequest.innerHTML = uInput;
  userInput.value = "";
  chatWindow.appendChild(userRequest);
  chatWindow.scrollTop = chatWindow.scrollHeight;
  await addAiResponse(uInput);
})

generateRoutineButton.addEventListener("click", async e => {

  const responseText = "Generate a beauty routine based on the given products, the will be given in the format of name; brand; category; description: " + Object.values(selectedProducts).map((p, idx) => {
    return `${idx + 1}. ${p.name}; ${p.brand}; ${p.category}; ${p.description}`
  }).join(" ")
  await addAiResponse(responseText)
})

document.addEventListener("DOMContentLoaded", () => {
  Object.values(selectedProducts).forEach(p => {
    const productEl = document.createElement("div");
    addAttributes(p, productEl);
    productEl.addEventListener("click", () => handleSelectedProductClick(p.id, productEl))
    selectedProductsContainer.appendChild(productEl);

  })
})

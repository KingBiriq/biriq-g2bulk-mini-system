let selectedGame = "";
let selectedProduct = null;
let checkedPlayerName = "";

const gameSelect = document.getElementById("gameSelect");
const gamesOutput = document.getElementById("gamesOutput");
const productsList = document.getElementById("productsList");
const playerResult = document.getElementById("playerResult");
const orderOutput = document.getElementById("orderOutput");

const sumGame = document.getElementById("sumGame");
const sumPlayer = document.getElementById("sumPlayer");
const sumProduct = document.getElementById("sumProduct");
const sumApiPrice = document.getElementById("sumApiPrice");

async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });
  return res.json();
}

function findArray(data) {
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data.games)) return data.games;
  if (Array.isArray(data.categories)) return data.categories;
  return [];
}

async function loadGames() {
  gameSelect.innerHTML = `<option value="">Loading games...</option>`;

  const data = await api("/api/games");
  const games = findArray(data);

  gamesOutput.textContent = JSON.stringify(data, null, 2);

  gameSelect.innerHTML = `<option value="">Dooro game</option>`;

  games.forEach((game) => {
    const code = game.code || game.game_code || game.slug || game.id;
    const name = game.name || game.title || code;

    if (!code) return;

    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = `${name} (${code})`;
    gameSelect.appendChild(opt);
  });

  // fallback quick options haddii API response format kale noqdo
  if (gameSelect.options.length === 1) {
    [
      { code: "pubgm", name: "PUBG Mobile" },
      { code: "free_fire", name: "Free Fire" }
    ].forEach((game) => {
      const opt = document.createElement("option");
      opt.value = game.code;
      opt.textContent = `${game.name} (${game.code})`;
      gameSelect.appendChild(opt);
    });
  }
}

async function loadProducts() {
  selectedGame = gameSelect.value;
  selectedProduct = null;
  productsList.innerHTML = "";
  updateSummary();

  if (!selectedGame) {
    alert("Marka hore dooro game.");
    return;
  }

  productsList.innerHTML = `<p class="muted">Loading products...</p>`;

  const data = await api(`/api/games/${selectedGame}/catalogue`);
  const products = data.products || [];

  productsList.innerHTML = "";

  if (!products.length) {
    productsList.innerHTML = `<p class="muted">Products lama helin. Fiiri backend console ama API key.</p>`;
    return;
  }

  products.forEach((product) => {
    const div = document.createElement("div");
    div.className = "product";
    div.innerHTML = `
      <h3>${product.catalogue_name}</h3>
      <p><b>product_id:</b> ${product.product_id}</p>
      <p><b>game_code:</b> ${selectedGame}</p>
      <p><b>api_price:</b> $${product.api_price}</p>
      <button>Select Product</button>
    `;

    div.querySelector("button").onclick = () => {
      document.querySelectorAll(".product").forEach(el => el.classList.remove("active"));
      div.classList.add("active");
      selectedProduct = product;
      updateSummary();
    };

    productsList.appendChild(div);
  });
}

async function checkPlayer() {
  selectedGame = gameSelect.value;
  const user_id = document.getElementById("playerIdInput").value.trim();
  const server_id = document.getElementById("serverIdInput").value.trim();

  if (!selectedGame) return alert("Dooro game.");
  if (!user_id) return alert("Geli Player ID.");

  playerResult.textContent = "Checking player...";

  const data = await api("/api/check-player", {
    method: "POST",
    body: JSON.stringify({
      game: selectedGame,
      user_id,
      server_id
    })
  });

  checkedPlayerName =
    data.name ||
    data.player_name ||
    data.username ||
    data.data?.name ||
    data.data?.player_name ||
    "";

  playerResult.textContent = JSON.stringify(data, null, 2);
  updateSummary();
}

async function createOrder() {
  const player_id = document.getElementById("playerIdInput").value.trim();
  const server_id = document.getElementById("serverIdInput").value.trim();
  const customer_phone = document.getElementById("phoneInput").value.trim();
  const amount_paid = Number(document.getElementById("amountPaidInput").value || 0);

  if (!selectedGame) return alert("Dooro game.");
  if (!player_id) return alert("Geli Player ID.");
  if (!selectedProduct) return alert("Dooro product.");
  if (!confirm("Tani waa TEST ORDER. Hubi inaad rabto inaad order dirto.")) return;

  orderOutput.textContent = "Creating order...";

  const data = await api("/api/create-order", {
    method: "POST",
    body: JSON.stringify({
      game_code: selectedGame,
      product_id: selectedProduct.product_id,
      catalogue_name: selectedProduct.catalogue_name,
      player_id,
      server_id,
      customer_phone,
      amount_paid
    })
  });

  orderOutput.textContent = JSON.stringify(data, null, 2);
}

function updateSummary() {
  const playerId = document.getElementById("playerIdInput").value.trim();

  sumGame.textContent = selectedGame || "-";
  sumPlayer.textContent = checkedPlayerName ? `${checkedPlayerName} (${playerId})` : (playerId || "-");
  sumProduct.textContent = selectedProduct ? `${selectedProduct.catalogue_name} / ID ${selectedProduct.product_id}` : "-";
  sumApiPrice.textContent = selectedProduct ? selectedProduct.api_price : "0";
}

document.getElementById("loadProductsBtn").addEventListener("click", loadProducts);
document.getElementById("checkPlayerBtn").addEventListener("click", checkPlayer);
document.getElementById("createOrderBtn").addEventListener("click", createOrder);
document.getElementById("playerIdInput").addEventListener("input", updateSummary);
gameSelect.addEventListener("change", () => {
  selectedGame = gameSelect.value;
  selectedProduct = null;
  updateSummary();
});

loadGames();

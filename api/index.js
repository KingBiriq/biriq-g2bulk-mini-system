require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const crypto = require("crypto");

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));

const PORT = process.env.PORT || 3000;
const BASE_URL = process.env.G2BULK_BASE_URL || "https://api.g2bulk.com/v1";
const API_KEY = process.env.G2BULK_API_KEY;

if (!API_KEY || API_KEY.includes("PASTE_")) {
  console.warn("⚠️  G2BULK_API_KEY missing. Create .env and add your API key.");
}

async function g2bulk(pathname, options = {}) {
  const response = await fetch(`${BASE_URL}${pathname}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      ...(API_KEY ? { "X-API-Key": API_KEY } : {}),
      ...(options.headers || {})
    }
  });

  const text = await response.text();
  let data;

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!response.ok) {
    return {
      success: false,
      status: response.status,
      message: data.message || data.error || "G2Bulk API error",
      data
    };
  }

  return data;
}

// 1) Read all games/categories from API
app.get("/api/games", async (req, res) => {
  try {
    const data = await g2bulk("/games");
    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 2) Read game fields, e.g. userid/serverid requirements
app.post("/api/games/fields", async (req, res) => {
  try {
    const { game } = req.body;
    if (!game) return res.status(400).json({ success: false, message: "game is required" });

    const data = await g2bulk("/games/fields", {
      method: "POST",
      body: JSON.stringify({ game })
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 3) Read products/catalogue by game code
app.get("/api/games/:gameCode/catalogue", async (req, res) => {
  try {
    const { gameCode } = req.params;
    const data = await g2bulk(`/games/${gameCode}/catalogue`);

    // Normalize for frontend
    const rawItems = data.catalogues || data.data || data || [];
    const items = Array.isArray(rawItems) ? rawItems : [];

    const products = items.map((item) => ({
      product_id: item.id,
      catalogue_id: item.id,
      catalogue_name: item.name,
      api_price: Number(item.amount || item.price || 0),
      sell_price: Number(item.amount || item.price || 0), // test only; admin can change later
      active: true,
      raw: item
    }));

    res.json({
      success: true,
      game_code: gameCode,
      products,
      raw: data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 4) Check Player ID
app.post("/api/check-player", async (req, res) => {
  try {
    const { game, user_id, server_id = "" } = req.body;

    if (!game) return res.status(400).json({ success: false, message: "game is required" });
    if (!user_id) return res.status(400).json({ success: false, message: "user_id/player_id is required" });

    const data = await g2bulk("/games/checkPlayerId", {
      method: "POST",
      body: JSON.stringify({
        game,
        user_id,
        server_id
      })
    });

    res.json(data);
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 5) Test create order
// IMPORTANT: Use this only after payment success in real system.
app.post("/api/create-order", async (req, res) => {
  try {
    const {
      game_code,
      product_id,
      catalogue_name,
      player_id,
      server_id = "",
      customer_phone = "",
      amount_paid = 0
    } = req.body;

    if (!game_code) return res.status(400).json({ success: false, message: "game_code is required" });
    if (!catalogue_name) return res.status(400).json({ success: false, message: "catalogue_name is required" });
    if (!player_id) return res.status(400).json({ success: false, message: "player_id is required" });

    const localOrderId = crypto.randomUUID();

    const data = await g2bulk(`/games/${game_code}/order`, {
      method: "POST",
      headers: {
        "X-Idempotency-Key": localOrderId
      },
      body: JSON.stringify({
        catalogue_name,
        player_id,
        server_id,
        remark: `Biriq Store Test Order ${localOrderId} | product_id=${product_id || ""} | phone=${customer_phone}`,
        callback_url: "https://example.com/api/webhook/g2bulk"
      })
    });

    res.json({
      success: true,
      local_order_id: localOrderId,
      amount_paid,
      api_response: data
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = app;

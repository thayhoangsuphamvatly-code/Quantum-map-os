// src/routes/favorites.js
const express = require("express");
const router = express.Router();
const store = require("../store");
const { authenticate, requirePermission } = require("../middleware");

router.use(authenticate, requirePermission("favorites"));

router.get("/", (req, res) => {
  res.json({ favorites: store.listFavorites(req.user.id) });
});

router.post("/", (req, res) => {
  const { name, lat, lng, address } = req.body || {};
  if (typeof lat !== "number" || typeof lng !== "number") {
    return res.status(400).json({ error: "Thieu toa do lat/lng" });
  }
  const fav = store.addFavorite(req.user.id, { name, lat, lng, address });
  res.status(201).json({ favorite: fav });
});

router.delete("/:id", (req, res) => {
  const ok = store.removeFavorite(req.user.id, req.params.id);
  if (!ok) return res.status(404).json({ error: "Khong tim thay dia diem yeu thich" });
  res.json({ ok: true });
});

module.exports = router;

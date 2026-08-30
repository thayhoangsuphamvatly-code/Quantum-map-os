// src/routes/business.js
// Tai khoan Doanh nghiep co the gan MOT dia diem de quang cao tren ban do.
// Dia diem nay hien thi cong khai va LUON duoc gan nhan "Quang cao" ro rang
// (xem field isSponsored o /nearby) de dam bao minh bach, khong danh lua
// nguoi dung rang day la ket qua tim kiem tu nhien.
const express = require("express");
const router = express.Router();
const store = require("../store");
const { authenticate, requirePermission, requireBusiness } = require("../middleware");

router.use(authenticate);

// Danh sach dia diem quang cao cua chinh tai khoan doanh nghiep dang dang nhap
router.get("/mine", requireBusiness, (req, res) => {
  res.json({ listings: store.listBusinessByUser(req.user.id) });
});

// Tao moi dia diem quang cao (toi da MAX_LISTINGS_PER_BUSINESS)
router.post("/", requireBusiness, (req, res) => {
  const { name, category, description, lat, lng, phone, address } = req.body || {};
  try {
    const listing = store.createBusinessListing(req.user.id, { name, category, description, lat, lng, phone, address });
    res.status(201).json({ listing });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Sua dia diem quang cao cua chinh minh (Admin co the sua bat ky dia diem nao de kiem duyet)
router.patch("/:id", requireBusiness, (req, res) => {
  try {
    const listing = store.updateBusinessListing(req.params.id, req.user.id, req.body || {}, req.user.role === "ADMIN");
    res.json({ listing });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Xoa dia diem quang cao cua chinh minh (Admin co the xoa bat ky dia diem nao de kiem duyet)
router.delete("/:id", requireBusiness, (req, res) => {
  try {
    store.deleteBusinessListing(req.params.id, req.user.id, req.user.role === "ADMIN");
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Tim cac dia diem quang cao gan mot toa do - CONG KHAI cho moi tai khoan da dang nhap,
// dung de hien marker "🏷️ Quang cao" tren ban do va muc "Duoc quang cao gan day".
router.get("/nearby", requirePermission("search"), (req, res) => {
  const { lat, lng, radius } = req.query;
  if (!lat || !lng) return res.status(400).json({ error: "Thiếu tọa độ" });
  const r = Math.min(Number(radius) || 3000, 8000); // gioi han ban kinh toi da 8km
  const listings = store.listBusinessNear(Number(lat), Number(lng), r).map(l => ({
    id: l.id,
    name: l.name,
    category: l.category,
    description: l.description,
    lat: l.lat,
    lng: l.lng,
    phone: l.phone,
    address: l.address,
    distanceMeters: l.distanceMeters,
    isSponsored: true
  }));
  res.json({ listings });
});

module.exports = router;

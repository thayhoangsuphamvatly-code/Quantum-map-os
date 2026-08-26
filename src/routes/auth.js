// src/routes/auth.js
const express = require("express");
const router = express.Router();
const store = require("../store");
const { signToken } = require("../auth");
const { authenticate } = require("../middleware");

// KHONG co endpoint dang ky (register) - chi Admin duoc tao tai khoan (xem routes/admin.js)

router.post("/login", (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: "Vui long nhap tai khoan va mat khau" });
  }
  const user = store.findUserByUsername(username.trim());
  if (!user || !store.verifyPassword(user, password)) {
    return res.status(401).json({ error: "Tai khoan hoac mat khau khong dung" });
  }
  if (user.status === "locked") {
    return res.status(403).json({ error: "Tai khoan da bi quan tri vien khoa" });
  }
  const token = signToken(user);
  res.json({ token, user: store.publicUser(user) });
});

router.get("/me", authenticate, (req, res) => {
  res.json({ user: store.publicUser(req.user) });
});

module.exports = router;

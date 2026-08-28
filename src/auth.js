// src/auth.js
const jwt = require("jsonwebtoken");

// Trong san pham that, hay dat bien moi truong JWT_SECRET rieng va bao mat.
const JWT_SECRET = process.env.JWT_SECRET || "mapviet-neon-secret-doi-key-nay-khi-trien-khai-that";
const TOKEN_TTL = "12h";

function signToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role },
    JWT_SECRET,
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

module.exports = { signToken, verifyToken };

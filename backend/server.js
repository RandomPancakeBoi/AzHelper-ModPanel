require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow your GitHub Pages frontend
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN, // GitHub Pages URL
    credentials: true
  })
);

// Sessions — secure moderator login
app.use(
  session({
    secret: process.env.SESSION_SECRET, // Random string you created
    resave: false,
    saveUninitialized: false
  })
);

// Database
const db = new sqlite3.Database("./database.sqlite");

db.run(`
  CREATE TABLE IF NOT EXISTS appeals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT,
    userid TEXT,
    reason TEXT,
    evidence TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`);

// Health check
app.get("/healthz", (req, res) => {
  res.send("OK");
});

// -----------------------------
// TURNSTILE CAPTCHA VERIFICATION
// -----------------------------
async function verifyTurnstile(token) {
  try {
    const response = await axios.post(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY, // Turnstile secret key
        response: token
      })
    );

    return response.data.success;
  } catch (err) {
    console.error("Turnstile error:", err);
    return false;
  }
}

// -----------------------------
// APPEAL SUBMISSION
// -----------------------------
app.post("/appeals/submit", async (req, res) => {
  const { username, userid, reason, evidence, turnstileToken } = req.body;

  if (!turnstileToken) {
    return res.status(400).json({ error: "Missing CAPTCHA token" });
  }

  const valid = await verifyTurnstile(turnstileToken);
  if (!valid) {
    return res.status(400).json({ error: "CAPTCHA failed" });
  }

  db.run(
    `INSERT INTO appeals (username, userid, reason, evidence) VALUES (?, ?, ?, ?)`,
    [username, userid, reason, evidence],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });

      // Send webhook notification
      axios.post(process.env.WEBHOOK_URL, {
        content: `📨 **New Appeal Submitted**\n**User:** ${username}\n**ID:** ${userid}`
      });

      res.json({ success: true, id: this.lastID });
    }
  );
});

// -----------------------------
// DISCORD LOGIN
// -----------------------------
app.get("/auth/login", (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize?client_id=${
    process.env.DISCORD_CLIENT_ID
  }&response_type=code&redirect_uri=${encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI
  )}&scope=identify`;

  res.redirect(redirect);
});

// OAuth callback
app.get("/auth/callback", async (req, res) => {
  const code = req.query.code;

  try {
    const tokenRes = await axios.post(
      "https://discord.com/api/oauth2/token",
      new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: "authorization_code",
        code

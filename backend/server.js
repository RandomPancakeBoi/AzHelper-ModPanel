require("dotenv").config();
const express = require("express");
const session = require("express-session");
const axios = require("axios");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const fetch = (...args) => import("node-fetch").then(({ default: fetch }) => fetch(...args));

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS — allow your GitHub Pages frontend
app.use(
  cors({
    origin: process.env.ALLOWED_ORIGIN,
    credentials: true
  })
);

// Sessions — secure moderator login
app.use(
  session({
    secret: process.env.SESSION_SECRET,
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
        secret: process.env.TURNSTILE_SECRET_KEY,
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
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI
      }),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
    );

    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    req.session.user = userRes.data;

    res.redirect(process.env.ALLOWED_ORIGIN + "/dashboard.html");
  } catch (err) {
    console.error(err);
    res.send("Login failed");
  }
});

// -----------------------------
// LOGOUT
// Redirects to index.html
// -----------------------------
app.get("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect(process.env.ALLOWED_ORIGIN + "/index.html");
  });
});

// -----------------------------
// AUTH MIDDLEWARE
// -----------------------------
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(403).json({ error: "Not logged in" });
  }
  next();
}

// -----------------------------
// MOD DASHBOARD ROUTES
// -----------------------------
app.get("/appeals/list", requireAuth, (req, res) => {
  db.all(`SELECT * FROM appeals ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

app.post("/appeals/update", requireAuth, (req, res) => {
  const { id, status } = req.body;

  db.run(
    `UPDATE appeals SET status = ? WHERE id = ?`,
    [status, id],
    function (err) {
      if (err) return res.status(500).json({ error: "Database error" });

      axios.post(process.env.WEBHOOK_URL, {
        content: `🔔 Appeal #${id} has been **${status}** by a moderator.`
      });

      res.json({ success: true });
    }
  );
});

// -----------------------------
// SELF-PING TO KEEP RENDER AWAKE
// -----------------------------
setInterval(() => {
  fetch("https://azhelper-modpanel.onrender.com/healthz").catch(() => {});
}, 600000); // every 10 minutes

// -----------------------------
// START SERVER
// -----------------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log("Server running on port", PORT);
});

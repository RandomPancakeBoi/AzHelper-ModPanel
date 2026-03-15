const express = require("express");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();

const router = express.Router();
const db = new sqlite3.Database("./database.sqlite");

// Turnstile verification
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

// Submit appeal
router.post("/submit", async (req, res) => {
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

// Auth middleware
function requireAuth(req, res, next) {
  if (!req.session.user) {
    return res.status(403).json({ error: "Not logged in" });
  }
  next();
}

// List appeals
router.get("/list", requireAuth, (req, res) => {
  db.all(`SELECT * FROM appeals ORDER BY created_at DESC`, [], (err, rows) => {
    if (err) return res.status(500).json({ error: "Database error" });
    res.json(rows);
  });
});

// Update appeal status
router.post("/update", requireAuth, (req, res) => {
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

module.exports = router;

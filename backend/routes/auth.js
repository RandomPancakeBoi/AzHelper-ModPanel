const express = require("express");
const axios = require("axios");

const router = express.Router();

// Discord login redirect
router.get("/login", (req, res) => {
  const redirect = `https://discord.com/oauth2/authorize?client_id=${
    process.env.DISCORD_CLIENT_ID
  }&response_type=code&redirect_uri=${encodeURIComponent(
    process.env.DISCORD_REDIRECT_URI
  )}&scope=identify`;

  res.redirect(redirect);
});

// OAuth callback
router.get("/callback", async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange code for access token
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

    // Fetch user info
    const userRes = await axios.get("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenRes.data.access_token}` }
    });

    // Role-based access check
    const guildId = "928794195286696019";
    const allowedRoles = [
      "928795215702143006",
      "928794195286696023"
    ];

    const guildMemberRes = await axios.get(
      `https://discord.com/api/guilds/${guildId}/members/${userRes.data.id}`,
      {
        headers: {
          Authorization: `Bot ${process.env.BOT_TOKEN}`
        }
      }
    );

    const hasRole = guildMemberRes.data.roles.some(role =>
      allowedRoles.includes(role)
    );

    if (!hasRole) {
      return res.send("❌ You do not have permission to access the dashboard.");
    }

    // Save session and redirect
    req.session.user = userRes.data;
    res.redirect(process.env.ALLOWED_ORIGIN + "/dashboard.html");
  } catch (err) {
    console.error("OAuth error:", err.response?.data || err.message);
    res.send("Login failed. Please try again.");
  }
});

module.exports = router;

// URL of your backend
const BACKEND_URL = "https://azhelper-modpanel.onrender.com";

// DOM elements
const widget = document.getElementById("mod-widget");
const optionA = document.querySelector(".option-a");
const optionB = document.querySelector(".option-b");
const optionC = document.querySelector(".option-c");

// Check login + staff status
async function checkModStatus() {
    try {
        const res = await fetch(`${BACKEND_URL}/auth/me`, {
            credentials: "include"
        });

        const data = await res.json();

        // Not logged in or not staff → hide widget
        if (!data.loggedIn || !data.isStaff || !data.inGuild) {
            widget.style.display = "none";
            return;
        }

        // Logged in + staff → show widget
        widget.style.display = "block";

        // Assign button actions
        optionA.onclick = () => {
            window.location.href = "appeals.html"; // Appeals page
        };

        optionB.onclick = () => {
            window.location.href = "dashboard.html"; // Dashboard
        };

        optionC.onclick = () => {
            window.location.href = "logs.html"; // Logs page
        };

    } catch (err) {
        console.error("Auth check failed:", err);
        widget.style.display = "none";
    }
}

// Run on page load
checkModStatus();

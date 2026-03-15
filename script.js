// Backend URL
const BACKEND_URL = "https://azhelper-modpanel.onrender.com";

// -----------------------------
// APPEAL FORM SUBMISSION
// -----------------------------
document.getElementById("appealForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const turnstileToken = turnstile.getResponse();

    const data = {
        username: document.getElementById("username").value,
        userid: document.getElementById("userid").value,
        reason: document.getElementById("reason").value,
        evidence: document.getElementById("evidence").value,
        turnstileToken
    };

    const res = await fetch(`${BACKEND_URL}/appeals/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
    });

    const json = await res.json();
    const msg = document.getElementById("responseMessage");

    if (json.success) {
        msg.style.color = "#4caf50";
        msg.innerText = "Your appeal has been submitted successfully.";
    } else {
        msg.style.color = "#ff4444";
        msg.innerText = "Error: " + json.error;
    }
});

// -----------------------------
// HAMBURGER MENU DROPDOWN
// -----------------------------
const hamburgerCheckbox = document.getElementById("checkbox2");
const dropdownMenu = document.getElementById("dropdownMenu");

hamburgerCheckbox.addEventListener("change", () => {
    dropdownMenu.style.display = hamburgerCheckbox.checked ? "flex" : "none";
});

// Close dropdown if clicking outside
document.addEventListener("click", (e) => {
    const isClickInside =
        e.target.closest(".hamburger-wrapper") ||
        e.target.closest("#checkbox2");

    if (!isClickInside) {
        hamburgerCheckbox.checked = false;
        dropdownMenu.style.display = "none";
    }
});

// -----------------------------
// DARK MODE TOGGLE
// -----------------------------
const darkModeToggle = document.getElementById("checkbox");

darkModeToggle.addEventListener("change", () => {
    document.body.classList.toggle("dark-mode");
});

// Optional: Persist dark mode across sessions
if (localStorage.getItem("darkMode") === "enabled") {
    document.body.classList.add("dark-mode");
    darkModeToggle.checked = true;
}

darkModeToggle.addEventListener("change", () => {
    if (darkModeToggle.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("darkMode", "enabled");
    } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("darkMode", "disabled");
    }
});

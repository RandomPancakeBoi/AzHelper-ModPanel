// Backend URL { KEEP }
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


/* ------------------
    Dark Mode JS
------------------- */
const toggle = document.getElementById("input");
if (!localStorage.getItem("theme")) {
    localStorage.setItem("theme", "light");
}

if (localStorage.getItem("theme") === "dark") {
    document.body.classList.add("dark-mode");
    toggle.checked = true;
} else {
    document.body.classList.remove("dark-mode");
    toggle.checked = false;
}

toggle.addEventListener("change", () => {
    if (toggle.checked) {
        document.body.classList.add("dark-mode");
        localStorage.setItem("theme", "dark");
    } else {
        document.body.classList.remove("dark-mode");
        localStorage.setItem("theme", "light");
    }
});

/* ------------------
    Login Button
------------------- */
document.getElementById("login-btn").onclick = () => {
  window.location.href = "https://azhelper-modpanel.onrender.com/auth/login";
};

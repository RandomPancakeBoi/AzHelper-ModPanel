const BACKEND_URL = "https://azhelper-modpanel.onrender.com";

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

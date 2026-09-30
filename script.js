// ---- Login (same credentials/logic as before) ----
function login() {
    const username = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();
    const error = document.getElementById("error");

    const correctUsername = "Tharchaw";
    const correctPassword = "ttn241200";

    if (username === "" || password === "") {
        showError(error, "Please fill in all fields 🐾");
        return;
    }

    if (username === correctUsername && password === correctPassword) {
        window.location.href = "home.html";
    } else {
        showError(error, "Incorrect username or password 😿");
    }
}

function showError(el, message) {
    el.textContent = message;
    el.classList.remove("shake");
    // restart the shake animation
    void el.offsetWidth;
    el.classList.add("shake");
}

// allow pressing Enter to log in
document.addEventListener("DOMContentLoaded", () => {
    const pwField = document.getElementById("password");
    if (pwField) {
        pwField.addEventListener("keydown", (e) => {
            if (e.key === "Enter") login();
        });
    }
});

// ---- Gentle scroll-reveal for the memory cards ----
document.addEventListener("DOMContentLoaded", () => {
    const cards = document.querySelectorAll(".cat-card");
    if (!cards.length) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (prefersReducedMotion || !("IntersectionObserver" in window)) {
        cards.forEach(card => card.classList.add("visible"));
        return;
    }

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15, rootMargin: "0px 0px -40px 0px" });

    cards.forEach(card => observer.observe(card));
});

// ---- Ambient embers (works on both pages) ----
document.addEventListener("DOMContentLoaded", () => {
    const field = document.getElementById("emberField");
    if (!field) return;

    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const EMBER_COUNT = 16;
    for (let i = 0; i < EMBER_COUNT; i++) {
        const ember = document.createElement("span");
        ember.className = "ember";
        const left = Math.random() * 100;
        const duration = 10 + Math.random() * 10;
        const delay = Math.random() * 14;
        const drift = (Math.random() * 80 - 40).toFixed(0) + "px";
        ember.style.left = left + "vw";
        ember.style.setProperty("--drift", drift);
        ember.style.animationDuration = duration + "s";
        ember.style.animationDelay = "-" + delay + "s";
        field.appendChild(ember);
    }
});

// ---- Light a candle ----
document.addEventListener("DOMContentLoaded", () => {
    const btn = document.getElementById("candleBtn");
    const shrine = document.getElementById("candleShrine");
    const countLabel = document.getElementById("candleCount");
    if (!btn || !shrine) return;

    let lit = localStorage.getItem("tharchaw_candle_lit") === "true";
    let count = parseInt(localStorage.getItem("tharchaw_candle_count") || "0", 10);

    function render() {
        shrine.classList.toggle("lit", lit);
        btn.textContent = lit ? "Candle lit for Tharchaw 🕯️" : "Light a candle for Tharchaw";
        countLabel.textContent = count > 0 ? `lit ${count} time${count === 1 ? "" : "s"}` : "";
    }

    btn.addEventListener("click", () => {
        lit = !lit;
        if (lit) count++;
        localStorage.setItem("tharchaw_candle_lit", lit);
        localStorage.setItem("tharchaw_candle_count", String(count));
        render();
    });

    render();
});

// ---- Guestbook ----
document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("guestbookForm");
    const list = document.getElementById("guestbookList");
    if (!form || !list) return;

    const STORAGE_KEY = "tharchaw_guestbook";

    function loadEntries() {
        try {
            return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
        } catch {
            return [];
        }
    }

    function saveEntries(entries) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    }

    function renderEntries() {
        const entries = loadEntries();
        list.innerHTML = "";

        if (!entries.length) {
            const empty = document.createElement("p");
            empty.className = "guestbook-empty";
            empty.textContent = "Be the first to share a memory.";
            list.appendChild(empty);
            return;
        }

        entries.slice().reverse().forEach(entry => {
            const item = document.createElement("div");
            item.className = "guestbook-entry";

            const message = document.createElement("p");
            message.className = "message";
            message.textContent = `“${entry.message}”`;

            const meta = document.createElement("p");
            meta.className = "meta";
            meta.textContent = `${entry.name} · ${entry.date}`;

            item.appendChild(message);
            item.appendChild(meta);
            list.appendChild(item);
        });
    }

    form.addEventListener("submit", (e) => {
        e.preventDefault();
        const nameField = document.getElementById("gbName");
        const messageField = document.getElementById("gbMessage");
        const name = nameField.value.trim();
        const message = messageField.value.trim();
        if (!name || !message) return;

        const entries = loadEntries();
        entries.push({
            name,
            message,
            date: new Date().toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })
        });
        saveEntries(entries);
        renderEntries();
        form.reset();
    });

    renderEntries();
});

// ---- Lightbox for photos ----
document.addEventListener("DOMContentLoaded", () => {
    const lightbox = document.getElementById("lightbox");
    if (!lightbox) return;

    const media = document.getElementById("lightboxMedia");
    const titleEl = document.getElementById("lightboxTitle");
    const descEl = document.getElementById("lightboxDesc");
    const closeBtn = document.getElementById("lightboxClose");
    const prevBtn = document.getElementById("lightboxPrev");
    const nextBtn = document.getElementById("lightboxNext");

    // Only photo cards (not videos) participate in the lightbox
    const items = Array.from(document.querySelectorAll(".cat-card")).flatMap(card => {
        const img = card.querySelector("img");
        if (!img) return [];
        const title = card.querySelector(".card-content h3")?.textContent || "";
        const desc = card.querySelector(".card-content p")?.textContent || "";
        return [{ src: img.src, alt: img.alt, title, desc, imgEl: img }];
    });

    let currentIndex = 0;

    function open(index) {
        currentIndex = index;
        render();
        lightbox.classList.add("open");
        lightbox.setAttribute("aria-hidden", "false");
    }

    function close() {
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
    }

    function render() {
        const item = items[currentIndex];
        if (!item) return;
        media.innerHTML = "";
        const img = document.createElement("img");
        img.src = item.src;
        img.alt = item.alt;
        media.appendChild(img);
        titleEl.textContent = item.title;
        descEl.textContent = item.desc;
    }

    function step(delta) {
        currentIndex = (currentIndex + delta + items.length) % items.length;
        render();
    }

    items.forEach((item, index) => {
        item.imgEl.addEventListener("click", () => open(index));
    });

    closeBtn.addEventListener("click", close);
    prevBtn.addEventListener("click", () => step(-1));
    nextBtn.addEventListener("click", () => step(1));

    lightbox.addEventListener("click", (e) => {
        if (e.target === lightbox) close();
    });

    document.addEventListener("keydown", (e) => {
        if (!lightbox.classList.contains("open")) return;
        if (e.key === "Escape") close();
        if (e.key === "ArrowLeft") step(-1);
        if (e.key === "ArrowRight") step(1);
    });
});

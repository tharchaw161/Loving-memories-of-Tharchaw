// Browser-only storage, with a visible fallback when saving is unavailable.
const memoryStore = {
    getItem(key) { try { return localStorage.getItem(key); } catch { return null; } },
    setItem(key, value) {
        try { localStorage.setItem(key, value); return true; }
        catch {
            const status = document.getElementById('storageStatus');
            if (status) status.textContent = 'This browser could not save your changes. They may be lost when you leave this page.';
            return false;
        }
    }
};

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

    let lit = memoryStore.getItem("tharchaw_candle_lit") === "true";
    let count = parseInt(memoryStore.getItem("tharchaw_candle_count") || "0", 10);

    function render() {
        shrine.classList.toggle("lit", lit);
        btn.textContent = lit ? "Candle lit for Tharchaw 🕯️" : "Light a candle for Tharchaw";
        countLabel.textContent = count > 0 ? `You have lit this candle ${count} time${count === 1 ? "" : "s"} in this browser` : "";
    }

    btn.addEventListener("click", () => {
        lit = !lit;
        if (lit) count++;
        memoryStore.setItem("tharchaw_candle_lit", lit);
        memoryStore.setItem("tharchaw_candle_count", String(count));
        render();
    });

    render();
});

// ---- Shared guestbook: messages are stored online, never in localStorage ----
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('guestbookForm');
    if (!form) return;
    const list = document.getElementById('guestbookList');
    const status = document.getElementById('guestbookStatus');
    const refresh = document.getElementById('refreshMemories');
    const more = document.getElementById('moreMemories');
    const submit = form.querySelector('button[type="submit"]');
    const config = window.THARCHAW_GUESTBOOK || {};
    let base;
    try { const url = new URL(config.url); if (url.protocol === 'https:') base = url.origin; } catch {}
    if (!base || !/^sb_publishable_/.test(config.publishableKey || '')) {
        status.textContent = 'The shared guestbook is being connected. Please check back soon.';
        submit.disabled = true;
        refresh.hidden = true;
        return;
    }
    const endpoint = base + '/rest/v1/tharchaw_memories';
    let entries = [];
    let loading = false;
    let sending = false;
    let pending = null;
    const headers = {apikey:config.publishableKey, 'Content-Type':'application/json'};
    async function request(url, options = {}) {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try { return await fetch(url, {...options, headers, signal:controller.signal}); }
        finally { clearTimeout(timer); }
    }
    function render() {
        list.replaceChildren();
        if (!entries.length) {
            const empty = document.createElement('p');
            empty.className = 'guestbook-empty';
            empty.textContent = 'No memories yet. You can leave the first one for Tharchaw.';
            list.appendChild(empty);
        }
        entries.forEach(entry => {
            const item = document.createElement('article'); item.className = 'guestbook-entry';
            const message = document.createElement('p'); message.className = 'message'; message.textContent = entry.message;
            const meta = document.createElement('p'); meta.className = 'meta';
            meta.textContent = entry.name + ' · ' + new Date(entry.created_at).toLocaleDateString(undefined, {year:'numeric', month:'short', day:'numeric'});
            item.append(message, meta); list.appendChild(item);
        });
    }
    async function load(append = false) {
        if (loading) return;
        loading = true; refresh.disabled = true; more.disabled = true;
        status.textContent = 'Loading shared memories…';
        try {
            const response = await request(endpoint + '?select=id,name,message,created_at&order=created_at.desc,id.desc&limit=20&offset=' + (append ? entries.length : 0));
            if (!response.ok) throw new Error('Load failed');
            const batch = await response.json();
            if (!Array.isArray(batch)) throw new Error('Invalid response');
            entries = append ? [...entries, ...batch.filter(row => !entries.some(old => old.id === row.id))] : batch;
            render(); more.hidden = batch.length < 20;
            status.textContent = entries.length ? 'Memories shared by visitors. Refresh to see new messages.' : '';
        } catch {
            status.textContent = 'Could not load memories. Check your connection and tap Refresh memories.';
        } finally { loading = false; refresh.disabled = false; more.disabled = false; }
    }
    refresh.addEventListener('click', () => load());
    more.addEventListener('click', () => load(true));
    form.addEventListener('submit', async event => {
        event.preventDefault();
        if (sending) return;
        const name = document.getElementById('gbName').value.trim();
        const message = document.getElementById('gbMessage').value.trim();
        if (!name || !message) { status.textContent = 'Please enter your name and a memory.'; return; }
        if (name.length > 80 || message.length > 3000) { status.textContent = 'Use up to 80 characters for your name and 3,000 for your memory.'; return; }
        // Keep the same ID when retrying a timed-out submission to avoid duplicate posts.
        if (!pending || pending.name !== name || pending.message !== message) pending = {id:crypto.randomUUID(), name, message};
        sending = true; submit.disabled = true; submit.textContent = 'Sharing…';
        status.textContent = 'Saving your memory online…';
        try {
            const response = await request(endpoint, {method:'POST', body:JSON.stringify(pending)});
            let saved = response.ok;
            if (response.status === 409) {
                const check = await request(endpoint + '?select=id&id=eq.' + pending.id);
                saved = check.ok && (await check.json()).length === 1;
            }
            if (!saved) throw new Error('Save failed');
            form.reset(); pending = null;
            await load();
            status.textContent = 'Thank you. Your memory is saved online and can be seen by Tharchaw’s family and other visitors.';
        } catch {
            status.textContent = 'We could not confirm your memory was saved. Your text is still here; please try again. Retrying will not post the same message twice.';
        } finally { sending = false; submit.disabled = false; submit.textContent = 'Share memory'; }
    });
    load();
});

// ---- Gallery filters and accessible photo viewer ----
document.addEventListener('DOMContentLoaded', () => {
    const cards = Array.from(document.querySelectorAll('.cat-card'));
    const filters = document.querySelector('.gallery-filters');
    const lightbox = document.getElementById('lightbox');
    if (!lightbox || !filters) return;
    const status = document.getElementById('galleryStatus');
    const media = document.getElementById('lightboxMedia');
    const title = document.getElementById('lightboxTitle');
    const description = document.getElementById('lightboxDesc');
    const counter = document.getElementById('lightboxCounter');
    const closeButton = document.getElementById('lightboxClose');
    let current = 0;
    let returnFocus = null;
    const photos = [];
    cards.forEach(card => {
        const img = card.querySelector('img');
        card.dataset.kind = img ? 'photo' : 'video';
        if (!img) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'photo-open';
        button.setAttribute('aria-label', 'Enlarge: ' + img.alt);
        img.before(button);
        button.appendChild(img);
        const index = photos.length;
        photos.push({img, button, title: card.querySelector('h3').textContent, description: card.querySelector('.card-content p').textContent});
        button.addEventListener('click', () => open(index));
    });
    function filter(kind) {
        let shown = 0;
        cards.forEach(card => {
            const visible = kind === 'all' || card.dataset.kind === kind;
            card.hidden = !visible;
            if (visible) { shown++; card.classList.add('visible'); }
            else card.querySelector('video')?.pause();
        });
        filters.querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.filter === kind)));
        const noun = kind === 'photo' ? 'photos' : kind === 'video' ? 'videos' : 'memories';
        status.textContent = shown + ' ' + noun;
    }
    filters.hidden = false;
    filters.addEventListener('click', event => {
        const button = event.target.closest('button[data-filter]');
        if (button) filter(button.dataset.filter);
    });
    filter('all');
    function render() {
        const item = photos[current];
        const enlarged = document.createElement('img');
        enlarged.src = item.img.src;
        enlarged.alt = item.img.alt;
        media.replaceChildren(enlarged);
        title.textContent = item.title;
        description.textContent = item.description;
        counter.textContent = (current + 1) + ' / ' + photos.length;
    }
    function open(index) {
        current = index;
        returnFocus = document.activeElement;
        render();
        lightbox.hidden = false;
        lightbox.classList.add('open');
        lightbox.setAttribute('aria-hidden', 'false');
        document.body.classList.add('viewer-open');
        document.querySelector('.container').inert = true;
        closeButton.focus();
    }
    function close() {
        lightbox.classList.remove('open');
        lightbox.hidden = true;
        lightbox.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('viewer-open');
        document.querySelector('.container').inert = false;
        returnFocus?.focus();
    }
    function step(delta) { current = (current + delta + photos.length) % photos.length; render(); }
    closeButton.addEventListener('click', close);
    document.getElementById('lightboxPrev').addEventListener('click', () => step(-1));
    document.getElementById('lightboxNext').addEventListener('click', () => step(1));
    lightbox.addEventListener('click', event => { if (event.target === lightbox) close(); });
    document.addEventListener('keydown', event => {
        if (lightbox.hidden) return;
        if (event.key === 'Escape') close();
        if (event.key === 'ArrowLeft') step(-1);
        if (event.key === 'ArrowRight') step(1);
        if (event.key === 'Tab') {
            const buttons = Array.from(lightbox.querySelectorAll('button'));
            const index = buttons.indexOf(document.activeElement);
            event.preventDefault();
            buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
        }
    });
    let touchStart = null;
    media.addEventListener('touchstart', event => {
        touchStart = event.touches.length === 1 ? {x:event.touches[0].clientX, y:event.touches[0].clientY} : null;
    }, {passive:true});
    media.addEventListener('touchend', event => {
        if (!touchStart) return;
        const dx = event.changedTouches[0].clientX - touchStart.x;
        const dy = event.changedTouches[0].clientY - touchStart.y;
        if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) step(dx < 0 ? 1 : -1);
        touchStart = null;
    }, {passive:true});
    media.addEventListener('touchcancel', () => { touchStart = null; }, {passive:true});
    document.querySelectorAll('video').forEach(video => video.addEventListener('play', () => {
        document.querySelectorAll('video').forEach(other => { if (other !== video) other.pause(); });
    }));
});

const backendBase = "https://backend-lks-tripnas.netlify.app/.netlify/functions";

// === GLOBAL THEME DARI SERVER ===
const themes = {
    kuning: ["#f7b500", "#ffd84d"],
    biru: ["#007bff", "#5cc6ff"],
    merah: ["#e60023", "#ff7b7b"],
    hijau: ["#78ffd6", "#a8ff78"],
    ungu: ["#9333ea", "#c084fc"],
    abu: ["#888888", "#d9d9d9"],
    jingga: ["#ff7b00", "#ffb347"],
    toska: ["#009688", "#4de1c1"],
    pink: ["#ff4081", "#ff9ac9"],
    hijaugelap: ["#0e7a30", "#6dbf73"]
};

(async () => {
    try {
        const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/get-config");
        const cfg = await res.json();
        const themeName = cfg.theme || "kuning";
        if (themes[themeName]) {
            const [accent, accent2] = themes[themeName];
            document.documentElement.style.setProperty("--accent", accent);
            document.documentElement.style.setProperty("--accent2", accent2);
            document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${accent2}, ${accent})`);
        }
    } catch (err) {
        console.warn("Gagal memuat tema global:", err);
    }
})();

/* THEME */
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");

        // ⬇️ 1. Ikon di sini dibalik
        themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
    });

    // LOGIKA BARU: Default ke Gelap
    if (localStorage.getItem("theme") === "light") {
        // Jika HANYA 'light' yang tersimpan, biarkan terang
        document.body.classList.remove("dark");
        // ⬇️ 2. Ikon di sini dibalik
        themeToggle.textContent = "🌙";
    } else {
        // Jika 'dark' atau null (kunjungan pertama), set ke gelap
        document.body.classList.add("dark");
        // ⬇️ 3. Ikon di sini juga dibalik
        themeToggle.textContent = "☀️";
    }
}

/* ELEMENTS */
const contentList = document.getElementById("contentList");
const noResultsEl = document.getElementById("noResults");
const searchWrap = document.getElementById("searchBarWrap");
const searchInput = document.getElementById("searchInput");
const searchToggle = document.getElementById("searchToggle");
const cacheStatus = document.getElementById("cacheStatus");

let currentCategory = "Berita", lastVisible = null, isLoading = false, reachedEnd = false;
const PAGE_SIZE = 10;
let allPostsCache = [];

/* LOAD MORE BUTTON */
const loadMoreContainer = document.createElement("div");
loadMoreContainer.style.textAlign = "center";
loadMoreContainer.style.margin = "1.8rem 0";
loadMoreContainer.innerHTML = `<a id="loadMoreBtn" class="btn">Tampilkan Lebih Banyak</a>`;
contentList.insertAdjacentElement("afterend", loadMoreContainer);
const loadMoreBtn = document.getElementById("loadMoreBtn");
loadMoreBtn.addEventListener("click", () => {
    if (!isLoading && !reachedEnd) {
        loadCategory(currentCategory, true);
    }
});

function formatWIB(ts) {
    try {
        if (!ts) return "";
        let d;
        if (typeof ts.toDate === "function") {
            d = ts.toDate();
        } else if (typeof ts === "object" && ts._seconds) {
            d = new Date(ts._seconds * 1000);
        } else if (typeof ts === "string") {
            d = new Date(ts);
        } else if (typeof ts === "number") {
            d = new Date(ts);
        } else {
            return "";
        }
        if (isNaN(d)) return "";
        const tanggal = d.toLocaleDateString("id-ID");
        const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");
        return `${tanggal} ${jam} WIB`;
    } catch {
        return "";
    }
}

function renderCard(id, d) {
    const href = (d.slug && d.slug.trim())
        ? `detail.html?slug=${encodeURIComponent(d.slug)}`
        : `detail.html?id=${id}`;

    const thumb =
        d.images && d.images.length > 0
            ? `<img src="${d.images[0]}" class="thumb" loading="lazy">` // ⬅️ Tambah di sini
            : d.imageUrl
                ? `<img src="${d.imageUrl}" class="thumb" loading="lazy">` // ⬅️ Tambah di sini
                : "";

    if (d.category === "Peraturan") {
        const totalDocs = Array.isArray(d.links) ? d.links.length : 0;
        return `
      <div class="card">
        <h3>${d.title}</h3>
        <div class="date">
          ${formatWIB(d.createdAt)}
          ${d.updatedAt ? `<div style="font-size:.6rem;opacity:.7;">di-edit pada ${formatWIB(d.updatedAt)}</div>` : ""}
        </div>
        <p>${(d.content || "").substring(0, 150)}...</p>
        ${totalDocs > 0 ? `<div class="doc-info">📄 ${totalDocs} dokumen</div>` : ""}
        <a href="${href}" class="btn btn-detail">Baca Selengkapnya</a>
      </div>`;
    }

    if (d.category === "Agenda") {
        const tanggal = d.tanggal
            ? new Date(d.tanggal).toLocaleDateString("id-ID", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric"
            })
            : null;
        const jam = d.jam || "";
        const lokasi = d.lokasi || "";

        return `
      <div class="card">
        <h3>${d.title}</h3>
        <div class="agenda-meta">
          ${tanggal ? `<div>🗓️ ${tanggal}</div>` : ""}
          ${jam ? `<div>🕐 ${jam} WIB</div>` : ""}
          ${lokasi ? `<div>📍 ${lokasi}</div>` : ""}
        </div>
        <div class="date">${formatWIB(d.createdAt)}</div>
        <p>${(d.content || "").substring(0, 140)}...</p>
        <a href="${href}" class="btn btn-detail">Baca Selengkapnya</a>
      </div>`;
    }

    if (d.category === "Struktur Organisasi") {
        const image =
            d.imageUrl
                ? `<img src="${d.imageUrl}" class="thumb" loading="lazy">` // ⬅️ Tambah di sini
                : (d.images && d.images.length > 0
                    ? `<img src="${d.images[0]}" class="thumb" loading="lazy">` // ⬅️ Tambah di sini
                    : "");

        return `
    <div class="card struktur-card">
      ${image}
      <h3>${d.title}</h3>
      <div class="date">${formatWIB(d.createdAt)}</div>
      <a href="${href}" class="btn btn-detail">Lihat Detail</a>
    </div>`;
    }

    return `
    <div class="card">
      ${thumb}
      <h3>${d.title}</h3>
      <div class="date">
        ${formatWIB(d.createdAt)}
        ${d.updatedAt ? `<div style="font-size:.6rem;opacity:.7;">di-edit pada ${formatWIB(d.updatedAt)}</div>` : ""}
      </div>
      <p>${(d.content || "").substring(0, 120)}...</p>
      <a href="${href}" class="btn btn-detail">Baca Selengkapnya</a>
    </div>`;
}

function resetPagination() {
    lastVisible = null;
    reachedEnd = false;
    contentList.innerHTML = "";
    loadMoreBtn.style.display = "inline-block";
}

async function loadCategory(cat, append = false) {
    if (isLoading) return;
    isLoading = true;
    noResultsEl.style.display = "none";
    currentCategory = cat;

    let offset = 0;
    if (append) {
        // Hitung offset berdasarkan item yang sudah ada
        offset = document.querySelectorAll("#contentList .card").length;
    }

    if (!append) {
        contentList.innerHTML = "";
        reachedEnd = false;
    }

    try {
        // Buat URL baru dengan offset
        const url = `${backendBase}/get-posts?category=${encodeURIComponent(cat)}&offset=${offset}`;
        console.log("Memuat data (fetch) dari:", url);

        const res = await fetch(url);
        const posts = await res.json();

        if (!posts || posts.length === 0) {
            if (append) {
                reachedEnd = true; // Habis
                loadMoreBtn.style.display = "none";
            } else {
                noResultsEl.style.display = "block"; // Kosong
                loadMoreBtn.style.display = "none";
            }
            return;
        }

        posts.forEach(p => contentList.insertAdjacentHTML("beforeend", renderCard(p.id, p)));

        // Cek jika ini halaman terakhir
        if (posts.length < PAGE_SIZE) { // PAGE_SIZE = 10
            reachedEnd = true;
            loadMoreBtn.style.display = "none";
        } else {
            loadMoreBtn.style.display = "inline-block";
        }

    } catch (err) {
        console.error("Gagal memuat kategori:", err);
        contentList.innerHTML = "<p style='text-align:center'>Gagal memuat konten.</p>";
    } finally {
        isLoading = false;
    }
}

/* NAVIGATION */
document.querySelectorAll("nav a").forEach(a => {
    a.addEventListener("click", e => {
        e.preventDefault();

        // Hapus state lama karena user ganti kategori manual
        sessionStorage.removeItem("pageState");
        sessionStorage.removeItem("fromDetail");

        document.querySelectorAll("nav a").forEach(n => n.classList.remove("active"));
        a.classList.add("active");

        currentCategory = a.dataset.tab;
        sessionStorage.setItem("lastCategory", currentCategory);

        resetPagination();
        loadCategory(currentCategory);
    });
});

/* SEARCH TOGGLE + REALTIME */
searchToggle.addEventListener("click", () => {
    const open = !searchWrap.classList.contains("open");
    searchWrap.classList.toggle("open");
    if (open) setTimeout(() => searchInput.focus(), 180);
    else { searchInput.value = ""; resetPagination(); loadCategory(currentCategory); }
});

document.addEventListener("click", e => {
    const inside = searchWrap.contains(e.target) || searchToggle.contains(e.target);
    if (!inside && searchWrap.classList.contains("open")) {
        searchWrap.classList.remove("open");
        searchInput.value = "";
        resetPagination();
        loadCategory(currentCategory);
    }
});

document.addEventListener("keydown", e => {
    if (e.key === "Escape" && searchWrap.classList.contains("open")) {
        searchWrap.classList.remove("open");
        searchInput.value = "";
        resetPagination();
        loadCategory(currentCategory);
    }
});

/* ==== Hamburger Menu Toggle ==== */
const hamburger = document.getElementById("hamburger");
const nav = document.getElementById("mainNav");

if (hamburger && nav) {
    hamburger.addEventListener("click", () => {
        nav.classList.toggle("open");
        hamburger.classList.toggle("active");
        document.body.classList.toggle("nav-open");
    });

    nav.querySelectorAll("a[data-tab]").forEach(a => {
        a.addEventListener("click", () => {
            nav.classList.remove("open");
            hamburger.classList.remove("active");
        });
    });

    document.addEventListener("click", (e) => {
        if (!nav.contains(e.target) && !hamburger.contains(e.target)) {
            nav.classList.remove("open");
            hamburger.classList.remove("active");
        }
    });
}

/* CACHING + SEARCH */
async function cacheAllPosts() {
    try {
        // Kita hanya fetch SEMUA post, sekali saja.
        const res = await fetch(`${backendBase}/get-posts`);
        allPostsCache = await res.json();

        if (!allPostsCache || allPostsCache.length === 0) {
            throw new Error("Cache yang diterima kosong.");
        }

        console.log(`✅ Cache siap: ${allPostsCache.length} item.`);
        cacheStatus.textContent = `${allPostsCache.length} berita siap dicari 🔎`;
        setTimeout(() => cacheStatus.style.display = "none", 3000);
    } catch (err) {
        console.error("❌ Gagal total memuat cache:", err);
        cacheStatus.textContent = "Gagal memuat data";
        // Jika ini gagal, seluruh aplikasi tidak bisa jalan
        contentList.innerHTML = "<p style='text-align:center'>Gagal memuat data. Coba muat ulang halaman.</p>";
        A
    }
}

searchInput.addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { resetPagination(); loadCategory(currentCategory); return; }
    contentList.innerHTML = "";
    noResultsEl.style.display = "none";
    loadMoreBtn.style.display = "none";

    const found = allPostsCache.filter(d => {
        const t = (d.title || "").toLowerCase(), c = (d.content || "").toLowerCase();
        return t.includes(q) || c.includes(q);
    });

    if (found.length === 0) {
        noResultsEl.style.display = "block";
    } else {
        found.forEach(d => contentList.insertAdjacentHTML("beforeend", renderCard(d.id, d)));
    }
});


/* ===== UTIL: Setel tab aktif ===== */
function setActiveTab(cat) {
    document.querySelectorAll("nav a").forEach(n => {
        n.classList.toggle("active", n.dataset.tab === cat);
    });
}

/* ===== SIMPAN STATE SEBELUM KE DETAIL ===== */
document.addEventListener("click", (e) => {
    const link = e.target.closest("a.btn-detail");
    if (link) {
        // Simpan state lengkap SEBELUM navigasi
        const state = {
            category: currentCategory,
            scroll: window.scrollY,
            loadedCount: document.querySelectorAll("#contentList .card").length,
            timestamp: Date.now()
        };

        sessionStorage.setItem("pageState", JSON.stringify(state));
        sessionStorage.setItem("fromDetail", "yes");

        console.log("💾 State saved:", state);
    }
});

async function restorePageState() {
    const fromDetail = sessionStorage.getItem("fromDetail");
    const savedState = sessionStorage.getItem("pageState");

    if (fromDetail === "yes" && savedState) {
        console.log("🔙 Back from detail detected");
        try {
            const state = JSON.parse(savedState);
            console.log("📦 Restoring state:", state);

            currentCategory = state.category;
            setActiveTab(currentCategory);
            resetPagination();

            // Loop untuk memuat ulang konten (mis. jika ada 20 item)
            let loadCount = 0;
            const targetCount = state.loadedCount;

            // Kita perlu loop untuk memanggil loadCategory (append=true)
            // sampai jumlah itemnya sama dengan yang disimpan
            while (loadCount < targetCount && !reachedEnd) {
                // panggil loadCategory. 'true' = append
                await loadCategory(currentCategory, loadCount > 0);
                loadCount = document.querySelectorAll("#contentList .card").length;
                if (loadCount === 0) break; // Safety break
            }

            // Restore scroll
            setTimeout(() => {
                window.scrollTo({ top: state.scroll, behavior: "instant" });
                console.log(`✅ Restored: ${state.category}, scroll=${state.scroll}px`);
            }, 100);

            sessionStorage.removeItem("fromDetail");
            return true;
        } catch (err) {
            console.error("❌ Restore failed:", err);
            sessionStorage.removeItem("fromDetail");
        }
    }
    return false;
}
// === Ekspor fungsi ke global ===
window.loadCategory = loadCategory;
window.setActiveTab = setActiveTab;
window.resetPagination = resetPagination;

/* ===== FUNGSI STARTUP UTAMA (BARU) ===== */
async function initApp() {
    console.log("🚀 DOM siap. Menjalankan aplikasi...");

    // 1. Pasang listener klik judul
    const homeTitle = document.getElementById("homeTitle");
    if (homeTitle) {
        homeTitle.addEventListener("click", (e) => {
            e.preventDefault();
            sessionStorage.clear();
            window.location.href = "index.html";
        });
    }

    // 2. Mulai caching UNTUK PENCARIAN di background
    // Ini akan memanggil 'get-posts' (tanpa parameter)
    // dan backend akan memberi SEMUA berita
    cacheAllPosts();

    // 3. Deteksi navigasi "Back"
    const navEntries = performance.getEntriesByType('navigation');
    const isBfCache = navEntries.length > 0 && navEntries[0].type === 'back_forward';
    const fromDetail = sessionStorage.getItem("fromDetail");
    const savedState = sessionStorage.getItem("pageState");

    if ((isBfCache || fromDetail === "yes") && savedState) {
        // ----- JALUR 1: PULIHKAN STATE (BACK) -----
        console.log("🔙 Navigasi 'Back' terdeteksi...");
        const restored = await restorePageState();
        if (!restored) {
            console.warn("⚠️ Gagal pulihkan state, memuat 'Berita'...");
            await loadCategory("Berita");
        }
    } else {
        // ----- JALUR 2: LOAD NORMAL (FRESH) -----
        console.log("📄 Load normal (fresh). Memuat kategori...");
        sessionStorage.removeItem("fromDetail");
        sessionStorage.removeItem("pageState");

        const lastCat = sessionStorage.getItem("lastCategory") || "Berita";
        currentCategory = lastCat;
        setActiveTab(lastCat);
        await loadCategory(lastCat); // Ini akan memuat 10 berita pertama
    }
}

// === MULAI APLIKASI ===
// Kita gunakan DOMContentLoaded karena lebih cepat dari 'load'
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    // DOM sudah siap, jalankan langsung
    initApp();
}

/* ==== SERVICE WORKER REGISTER ==== */
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(() => console.log('✅ Service Worker terdaftar'))
            .catch(err => console.error('❌ Gagal daftar SW:', err));
    });
}


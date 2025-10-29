import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, collection, getDocs, query, orderBy, where, limit, startAfter } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const app = initializeApp({
    apiKey: "AIzaSyB-7udHLwaIF-PaGfb_yjgf7zkz6wrLKFU",
    authDomain: "portal-tripnas.firebaseapp.com",
    projectId: "portal-tripnas",
    storageBucket: "portal-tripnas.firebasestorage.app",
    messagingSenderId: "664623452933",
    appId: "1:664623452933:web:1f6018c0eff3c1a7c09d6c"
});
const db = getFirestore(app);

/* THEME */
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
        themeToggle.textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
    });
    if (localStorage.getItem("theme") === "dark") { document.body.classList.add("dark"); themeToggle.textContent = "🌙"; }
}

/* ELEMENTS */
const contentList = document.getElementById("contentList");
const noResultsEl = document.getElementById("noResults");
const searchWrap = document.getElementById("searchBarWrap");
const searchInput = document.getElementById("searchInput");
const searchToggle = document.getElementById("searchToggle");
const cacheStatus = document.getElementById("cacheStatus");

// ==== PERIKSA JIKA ADA FLAG "FORCE_HOME" ====
if (sessionStorage.getItem("forceHome") === "true") {
    console.log("🏠 Force kembali ke halaman awal (kategori Berita)");

    // Hapus semua state agar benar-benar segar
    sessionStorage.clear();

    // Set kategori default ke Berita
    sessionStorage.setItem("lastCategory", "Berita");

    // Tutup pencarian & kosongkan input
    const sWrap = document.getElementById("searchBarWrap");
    const sInput = document.getElementById("searchInput");
    if (sWrap) sWrap.classList.remove("open");
    if (sInput) sInput.value = "";

    // Jalankan load kategori awal secara langsung
    window.addEventListener("load", async () => {
        currentCategory = "Berita";
        setActiveTab("Berita");
        resetPagination();
        await loadCategory("Berita");
        window.scrollTo({ top: 0, behavior: "auto" });
    });

    // Bersihkan flag agar tidak berulang
    sessionStorage.removeItem("forceHome");
}

let currentCategory = "Berita", lastVisible = null, isLoading = false, reachedEnd = false;
const PAGE_SIZE = 10;

/* LOAD MORE BUTTON */
const loadMoreContainer = document.createElement("div");
loadMoreContainer.style.textAlign = "center";
loadMoreContainer.style.margin = "1.8rem 0";
loadMoreContainer.innerHTML = `<a id="loadMoreBtn" class="btn">Tampilkan Lebih Banyak</a>`;
contentList.insertAdjacentElement("afterend", loadMoreContainer);
const loadMoreBtn = document.getElementById("loadMoreBtn");
loadMoreBtn.addEventListener("click", () => { if (!isLoading && !reachedEnd) { if (currentCategory) loadCategory(currentCategory, true); else loadAllPosts(true); } });

function formatWIB(ts) {
    try {
        if (!ts) return ""; const d = (typeof ts.toDate === "function") ? ts.toDate() : new Date(ts);
        return `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', hour12: false }).replace(":", ".")} WIB`;
    } catch { return ""; }
}
function renderCard(id, d) {
    const href = (d.slug && d.slug.trim()) ? `detail.html?slug=${encodeURIComponent(d.slug)}` : `detail.html?id=${id}`;
    const thumb = (d.images && d.images.length > 0) ? `<img src="${d.images[0]}" class="thumb">` : (d.imageUrl ? `<img src="${d.imageUrl}" class="thumb">` : "");
    if (d.category === "Peraturan") {
        const totalDocs = Array.isArray(d.links) ? d.links.length : 0;
        return `<div class="card"><h3>${d.title}</h3><div class="date">${formatWIB(d.createdAt)}${d.updatedAt ? `<div style="font-size:.6rem;opacity:.7;">di-edit pada ${formatWIB(d.updatedAt)}</div>` : ""}</div>
    <p>${(d.content || "").substring(0, 150)}...</p>${totalDocs > 0 ? `<div class="doc-info">📄 ${totalDocs} dokumen</div>` : ""}
    <a href="${href}" class="btn">Baca Selengkapnya</a></div>`;
    }
    return `<div class="card">${thumb}<h3>${d.title}</h3><div class="date">${formatWIB(d.createdAt)}${d.updatedAt ? `<div style="font-size:.6rem;opacity:.7;">di-edit pada ${formatWIB(d.updatedAt)}</div>` : ""}</div>
  <p>${(d.content || "").substring(0, 120)}...</p><a href="${href}" class="btn">Baca Selengkapnya</a></div>`;
}
function resetPagination() { lastVisible = null; reachedEnd = false; contentList.innerHTML = ""; loadMoreBtn.style.display = "inline-block"; }
async function loadCategory(cat, append = false) {
    if (isLoading || reachedEnd) return; isLoading = true; noResultsEl.style.display = "none"; currentCategory = cat;
    if (!append) { contentList.innerHTML = ""; lastVisible = null; reachedEnd = false; }
    try {
        let q = query(collection(db, "posts"), where("category", "==", cat), where("status", "==", "Aktif"), orderBy("createdAt", "desc"), limit(PAGE_SIZE));
        if (lastVisible) q = query(q, startAfter(lastVisible));
        const snap = await getDocs(q);
        if (snap.empty && !append) { noResultsEl.style.display = "block"; loadMoreBtn.style.display = "none"; }
        else {
            snap.forEach(d => contentList.insertAdjacentHTML("beforeend", renderCard(d.id, d.data())));
            lastVisible = snap.docs[snap.docs.length - 1];
            if (snap.size < PAGE_SIZE) { reachedEnd = true; loadMoreBtn.style.display = "none"; } else loadMoreBtn.style.display = "inline-block";
        }
    } catch (e) { console.error(e); } isLoading = false;
}

/* NAVIGATION */
document.querySelectorAll("nav a").forEach(a => {
    a.addEventListener("click", e => {
        e.preventDefault();
        document.querySelectorAll("nav a").forEach(n => n.classList.remove("active"));
        a.classList.add("active");
        resetPagination();
        loadCategory(a.dataset.tab);
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
    if (!inside && searchWrap.classList.contains("open")) { searchWrap.classList.remove("open"); searchInput.value = ""; resetPagination(); loadCategory(currentCategory); }
});
document.addEventListener("keydown", e => {
    if (e.key === "Escape" && searchWrap.classList.contains("open")) { searchWrap.classList.remove("open"); searchInput.value = ""; resetPagination(); loadCategory(currentCategory); }
});

/* CACHING + SEARCH */
let allPostsCache = [];
async function cacheAllPosts() {
    try {
        const snap = await getDocs(query(collection(db, "posts"), where("status", "==", "Aktif"), orderBy("createdAt", "desc")));
        allPostsCache = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        cacheStatus.textContent = `${allPostsCache.length} berita siap dicari 🔎`;
        setTimeout(() => cacheStatus.style.display = "none", 3000);
    } catch (err) { cacheStatus.textContent = "Gagal memuat data"; console.error(err); }
}
cacheAllPosts();

searchInput.addEventListener("input", e => {
    const q = e.target.value.trim().toLowerCase();
    if (!q) { resetPagination(); loadCategory(currentCategory); return; }
    contentList.innerHTML = ""; noResultsEl.style.display = "none"; loadMoreBtn.style.display = "none";
    const found = allPostsCache.filter(d => {
        const t = (d.title || "").toLowerCase(), c = (d.content || "").toLowerCase();
        return t.includes(q) || c.includes(q);
    });
    if (found.length === 0) { noResultsEl.style.display = "block"; }
    else found.forEach(d => contentList.insertAdjacentHTML("beforeend", renderCard(d.id, d)));
});

// ==== Reset scroll-restore saat judul diklik (INDEX) ====

// Listener ini boleh berdiri sendiri (tidak perlu menunggu DOMContentLoaded)
const homeTitle = document.getElementById('homeTitle');
if (homeTitle) {
    homeTitle.addEventListener('click', (e) => {
        e.preventDefault();
        // Set flag lebih awal agar terdeteksi segera setelah reload
        sessionStorage.setItem('ignoreScrollRestore', 'true');
        window.location.href = 'index.html';
    });
}

// ==== Klik judul situs → selalu ke beranda awal ====
document.addEventListener("DOMContentLoaded", () => {
    const homeTitle = document.getElementById("homeTitle");
    if (homeTitle) {
        homeTitle.addEventListener("click", (e) => {
            e.preventDefault();

            // Set flag kuat agar index tahu harus kembali ke Berita
            sessionStorage.setItem("forceHome", "true");

            // Navigasi ke halaman utama
            window.location.href = "index.html";
        });
    }
});

/* ===== UTIL: Setel tab aktif di nav sesuai kategori ===== */
function setActiveTab(cat) {
    document.querySelectorAll("nav a").forEach(n => {
        n.classList.toggle("active", n.dataset.tab === cat);
    });
}

/* ===== SIMPAN STATE SAAT KLIK "BACA SELENGKAPNYA" ===== */
document.addEventListener("click", (e) => {
    const link = e.target.closest("a.btn");
    if (link && link.textContent.includes("Baca Selengkapnya")) {
        const loadedCount = document.querySelectorAll("#contentList .card").length;
        const state = {
            scroll: window.scrollY,
            category: currentCategory,
            loadedCount // ← simpan jumlah kartu yang sudah tampil (lebih akurat dari pageCount)
        };
        sessionStorage.setItem("pageState", JSON.stringify(state));
        sessionStorage.setItem("lastCategory", currentCategory);
        sessionStorage.setItem("fromDetail", "yes");
    }
});

/* ===== SIMPAN KATEGORI TERAKHIR SAAT GANTI TAB ===== */
document.querySelectorAll("nav a").forEach(a => {
    a.addEventListener("click", () => {
        sessionStorage.setItem("lastCategory", a.dataset.tab);
    });
});

/* ===== STARTUP: pulihkan kalau dari detail, jika tidak ya load normal ===== */
window.addEventListener("load", async () => {
    // ---- [1] KLIK JUDUL → SELALU KE "AWAL" (Berita, top, tanpa pencarian) ----
    const ignoreScroll = sessionStorage.getItem("ignoreScrollRestore") === "true";
    if (ignoreScroll) {
        console.log("🔁 Navigasi dari judul situs — paksa ke halaman awal");

        // bersihkan flag & state pemulih
        sessionStorage.removeItem("ignoreScrollRestore");
        sessionStorage.removeItem("fromDetail");
        sessionStorage.removeItem("pageState");
        sessionStorage.removeItem("scrollPosition");

        // paksa kategori default = Berita (index awal)
        sessionStorage.setItem("lastCategory", "Berita");
        currentCategory = "Berita";
        setActiveTab("Berita");
        resetPagination();

        // tutup bar pencarian dan kosongkan query (agar tidak menimpa hasil)
        if (typeof searchWrap !== "undefined" && searchWrap.classList.contains("open")) {
            searchWrap.classList.remove("open");
        }
        if (typeof searchInput !== "undefined") {
            searchInput.value = "";
        }

        await loadCategory("Berita");
        window.scrollTo({ top: 0, behavior: "auto" });
        return; // hentikan semua proses restore lainnya
    }

    // ---- [2] Logika restore normal (dari detail) tetap seperti punyamu ----
    const fromDetail = sessionStorage.getItem("fromDetail") === "yes";
    const saved = sessionStorage.getItem("pageState");
    const lastCategory = sessionStorage.getItem("lastCategory") || "Berita";

    const loadNormal = async (cat) => {
        currentCategory = cat;
        setActiveTab(cat);
        resetPagination();
        await loadCategory(cat);
    };

    if (!fromDetail || !saved) {
        await loadNormal(lastCategory);
        return;
    }

    try {
        const { scroll, category, loadedCount } = JSON.parse(saved);
        currentCategory = category || lastCategory;
        setActiveTab(currentCategory);
        resetPagination();

        while (document.querySelectorAll("#contentList .card").length < loadedCount && !reachedEnd) {
            await loadCategory(currentCategory, true);
        }

        setTimeout(() => {
            window.scrollTo({ top: scroll, behavior: "auto" });
            console.log(`✅ Pulihkan: ${currentCategory}, cards=${loadedCount}, scroll=${scroll}px`);
        }, 300);
    } catch (err) {
        console.warn("Gagal memulihkan state:", err);
        await loadNormal(lastCategory);
    }

    sessionStorage.removeItem("fromDetail");
    sessionStorage.removeItem("pageState");
});



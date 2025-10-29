import { API_BASE } from "./api.js";

/* ====== THEME TOGGLE ====== */
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  const current = localStorage.getItem("theme");
  if (current === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "🌙";
  }
  themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.toggle("dark");
    localStorage.setItem("theme", isDark ? "dark" : "light");
    themeToggle.textContent = isDark ? "🌙" : "☀️";
  });
}

/* ====== ELEMENTS ====== */
const contentList = document.getElementById("contentList");
const noResultsEl = document.getElementById("noResults");
const searchWrap = document.getElementById("searchBarWrap");
const searchInput = document.getElementById("searchInput");
const searchToggle = document.getElementById("searchToggle");
const cacheStatus = document.getElementById("cacheStatus");

let currentCategory = "Berita";
let isLoading = false;
let reachedEnd = false;
let lastCursor = null;
const PAGE_SIZE = 10;

/* ====== LOAD MORE BUTTON ====== */
const loadMoreContainer = document.createElement("div");
loadMoreContainer.style.textAlign = "center";
loadMoreContainer.style.margin = "1.8rem 0";
loadMoreContainer.innerHTML = `<a id="loadMoreBtn" class="btn">Tampilkan Lebih Banyak</a>`;
contentList.insertAdjacentElement("afterend", loadMoreContainer);
const loadMoreBtn = document.getElementById("loadMoreBtn");
loadMoreBtn.addEventListener("click", () => {
  if (!isLoading && !reachedEnd) loadCategory(currentCategory, true);
});

/* ====== UTILITIES ====== */
function formatWIB(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("id-ID")} ${d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".")} WIB`;
}

function renderCard(p) {
  const href = p.slug ? `detail.html?slug=${encodeURIComponent(p.slug)}` : `detail.html?id=${p.id}`;
  const thumb = p.images?.length ? `<img src="${p.images[0]}" class="thumb">` : "";
  if (p.kategori === "Peraturan") {
    const totalDocs = Array.isArray(p.links) ? p.links.length : 0;
    return `<div class="card">
      <h3>${p.judul}</h3>
      <div class="date">${formatWIB(p.createdAt)}${p.updatedAt ? `<div style="font-size:.6rem;opacity:.7;">di-edit ${formatWIB(p.updatedAt)}</div>` : ""}</div>
      <p>${(p.konten || "").slice(0, 150)}...</p>
      ${totalDocs > 0 ? `<div class="doc-info">📄 ${totalDocs} dokumen</div>` : ""}
      <a href="${href}" class="btn">Baca Selengkapnya</a>
    </div>`;
  }
  return `<div class="card">${thumb}
    <h3>${p.judul}</h3>
    <div class="date">${formatWIB(p.createdAt)}${p.updatedAt ? `<div style="font-size:.6rem;opacity:.7;">di-edit ${formatWIB(p.updatedAt)}</div>` : ""}</div>
    <p>${(p.konten || "").slice(0, 120)}...</p>
    <a href="${href}" class="btn">Baca Selengkapnya</a>
  </div>`;
}

function resetPagination() {
  lastCursor = null;
  reachedEnd = false;
  contentList.innerHTML = "";
  loadMoreBtn.style.display = "inline-block";
}

/* ====== LOAD CATEGORY ====== */
async function loadCategory(cat, append = false) {
  if (isLoading || reachedEnd) return;
  isLoading = true;
  noResultsEl.style.display = "none";
  currentCategory = cat;

  if (!append) resetPagination();

  try {
    const url = new URL(`${API_BASE}/get-posts`);
    url.searchParams.set("category", cat);
    url.searchParams.set("limit", PAGE_SIZE);
    if (lastCursor) url.searchParams.set("after", lastCursor);

    const res = await fetch(url);
    const data = await res.json();
    const items = data.items || [];
    const nextCursor = data.nextCursor || null;

    if (items.length === 0 && !append) {
      noResultsEl.style.display = "block";
      loadMoreBtn.style.display = "none";
    } else {
      items.forEach(p => contentList.insertAdjacentHTML("beforeend", renderCard(p)));
      lastCursor = nextCursor;
      reachedEnd = !nextCursor;
      loadMoreBtn.style.display = reachedEnd ? "none" : "inline-block";
    }
  } catch (err) {
    console.error("Gagal memuat kategori:", err);
  } finally {
    isLoading = false;
  }
}

/* ====== SEARCH ====== */
let allPostsCache = [];
async function cacheAllPosts() {
  try {
    const res = await fetch(`${API_BASE}/get-posts?limit=200`);
    const data = await res.json();
    allPostsCache = data.items || [];
    cacheStatus.textContent = `${allPostsCache.length} berita siap dicari 🔎`;
    setTimeout(() => (cacheStatus.style.display = "none"), 3000);
  } catch (err) {
    cacheStatus.textContent = "Gagal memuat data";
    console.error(err);
  }
}
cacheAllPosts();

searchToggle.addEventListener("click", () => {
  const open = !searchWrap.classList.contains("open");
  searchWrap.classList.toggle("open");
  if (open) setTimeout(() => searchInput.focus(), 180);
  else {
    searchInput.value = "";
    resetPagination();
    loadCategory(currentCategory);
  }
});
document.addEventListener("click", (e) => {
  if (!searchWrap.contains(e.target) && !searchToggle.contains(e.target)) {
    if (searchWrap.classList.contains("open")) {
      searchWrap.classList.remove("open");
      searchInput.value = "";
      resetPagination();
      loadCategory(currentCategory);
    }
  }
});
searchInput.addEventListener("input", (e) => {
  const q = e.target.value.trim().toLowerCase();
  if (!q) {
    resetPagination();
    loadCategory(currentCategory);
    return;
  }
  contentList.innerHTML = "";
  noResultsEl.style.display = "none";
  loadMoreBtn.style.display = "none";
  const found = allPostsCache.filter(p => {
    const t = (p.judul || "").toLowerCase();
    const c = (p.konten || "").toLowerCase();
    return t.includes(q) || c.includes(q);
  });
  if (found.length === 0) noResultsEl.style.display = "block";
  else found.forEach(p => contentList.insertAdjacentHTML("beforeend", renderCard(p)));
});

/* ====== NAVIGATION ====== */
document.querySelectorAll("nav a").forEach(a => {
  a.addEventListener("click", (e) => {
    e.preventDefault();
    document.querySelectorAll("nav a").forEach(n => n.classList.remove("active"));
    a.classList.add("active");
    sessionStorage.setItem("lastCategory", a.dataset.tab);
    resetPagination();
    loadCategory(a.dataset.tab);
  });
});

/* ====== STATE RESTORE ====== */
document.addEventListener("click", (e) => {
  const link = e.target.closest("a.btn");
  if (link && link.textContent.includes("Baca Selengkapnya")) {
    const loadedCount = document.querySelectorAll("#contentList .card").length;
    const state = {
      scroll: window.scrollY,
      category: currentCategory,
      loadedCount,
    };
    sessionStorage.setItem("pageState", JSON.stringify(state));
    sessionStorage.setItem("fromDetail", "yes");
  }
});

window.addEventListener("load", async () => {
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
    setTimeout(() => window.scrollTo({ top: scroll, behavior: "auto" }), 300);
  } catch {
    await loadNormal(lastCategory);
  }

  sessionStorage.removeItem("fromDetail");
  sessionStorage.removeItem("pageState");
});

function setActiveTab(cat) {
  document.querySelectorAll("nav a").forEach(n => {
    n.classList.toggle("active", n.dataset.tab === cat);
  });
}

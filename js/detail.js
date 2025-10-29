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

/* ====== UTILITAS ====== */
function linkify(text) {
  if (!text) return "";
  const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+)/g;
  return text.replace(urlRegex, (url) => {
    let href = url;
    if (!href.match(/^https?:\/\//)) href = "https://" + href;
    return `<a href="${href}" target="_blank" style="color:var(--accent);text-decoration:underline;">${url}</a>`;
  });
}

function formatWIB(dateStr) {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  const tgl = d.toLocaleDateString("id-ID");
  const jam = d
    .toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false })
    .replace(":", ".");
  return `${tgl} ${jam} WIB`;
}

/* ====== LOAD DETAIL ====== */
async function loadDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const slug = params.get("slug");

  const container = document.getElementById("detailContainer");
  if (!id && !slug) {
    container.innerHTML = "<p>❌ Tidak ada ID atau slug berita.</p>";
    return;
  }

  try {
    const url = new URL(`${API_BASE}/get-post`);
    if (id) url.searchParams.set("id", id);
    else if (slug) url.searchParams.set("slug", slug);

    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    const d = await res.json();

    if (!d || d.status !== "Aktif") {
      container.innerHTML = "<div class='card'><p>Konten tidak tersedia.</p></div>";
      return;
    }

    let imageAtas = "",
      imageBawah = "";
    if (d.images && d.images.length > 0) {
      imageAtas = `<img src="${d.images[0]}" class="detail-img" onclick="showLightbox(this.src)">`;
      if (d.images.length > 1) {
        imageBawah = d.images
          .slice(1)
          .map((url) => `<img src="${url}" class="detail-img" onclick="showLightbox(this.src)">`)
          .join("");
      }
    }

    // dokumen kategori Peraturan
    let docSection = "";
    if (d.kategori === "Peraturan" && Array.isArray(d.links) && d.links.length > 0) {
      const items = d.links
        .map((f) => {
          const url = f.url || "#";
          const name = f.name || "Dokumen";
          const lower = url.toLowerCase();
          let icon = "📄";
          if (lower.endsWith(".pdf")) icon = "📕";
          else if (lower.endsWith(".doc") || lower.endsWith(".docx")) icon = "📘";
          else if (lower.endsWith(".xls") || lower.endsWith(".xlsx")) icon = "📊";
          else if (lower.endsWith(".ppt") || lower.endsWith(".pptx")) icon = "📈";
          else if (lower.includes("docs.google.com")) icon = "📑";
          else if (lower.endsWith(".zip") || lower.endsWith(".rar")) icon = "📦";
          return `<div class="doc-item"><span>${icon}</span><a href="${url}" target="_blank">${name}</a></div>`;
        })
        .join("");
      docSection = `<div class="doc-title">Dokumen terkait:</div>${items}`;
    }

    container.innerHTML = `
      <div class="card">
        ${imageAtas}
        <h2>${d.judul}</h2>
        <div class="date">
          ${formatWIB(d.createdAt)}
          ${d.updatedAt ? `<div style="font-size:.6rem;opacity:.75;">di-edit ${formatWIB(d.updatedAt)}</div>` : ""}
        </div>
        <p>${linkify(d.konten || "").replace(/\n/g, "<br>")}</p>
        ${docSection}
        ${imageBawah}
      </div>
    `;
  } catch (err) {
    container.innerHTML = `<p>❌ Gagal memuat detail: ${err.message}</p>`;
  }
}

/* ====== LIGHTBOX ====== */
window.showLightbox = (src) => {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  if (lb && img) {
    img.src = src;
    lb.style.display = "flex";
  }
};

/* ====== TOMBOL KEMBALI ====== */
const backBtn = document.getElementById("backBtn");
if (backBtn) {
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.setItem("fromDetail", "yes");
    const lastCategory = sessionStorage.getItem("lastCategory") || "Berita";
    if (!sessionStorage.getItem("pageState")) {
      sessionStorage.setItem(
        "pageState",
        JSON.stringify({ scroll: 0, category: lastCategory, loadedCount: 10 })
      );
    }
    window.location.href = "index.html";
  });
}

/* ====== HOME TITLE RESET ====== */
const homeTitle = document.getElementById("homeTitle");
if (homeTitle) {
  homeTitle.addEventListener("click", (e) => {
    e.preventDefault();
    sessionStorage.setItem("forceHome", "true");
    window.location.href = "index.html";
  });
}

/* ====== MULAI ====== */
document.addEventListener("DOMContentLoaded", loadDetail);

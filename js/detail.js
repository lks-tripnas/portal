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
  hijaugelap: ["#0e7a30", "#6dbf73"],
  emas: ["#d4af37", "#ffef8a"],
  birutua: ["#003366", "#336699"],
  unguTua: ["#4b0082", "#9b59b6"],
  merahmuda: ["#f78da7", "#fbc2eb"],
  laut: ["#0077b6", "#00b4d8"],
  hijautua: ["#006400", "#32cd32"]
};

const getBrightness = hex => {
  const r = parseInt(hex.slice(1, 3), 16),
        g = parseInt(hex.slice(3, 5), 16),
        b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000;
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
      const bright = getBrightness(accent);
      document.documentElement.style.setProperty("--btn-text", bright < 128 ? "#fff" : "#000");
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

// === UTILITIES ===
function showLoading() { document.getElementById("loadingOverlay").style.display = "flex"; }
function hideLoading() { document.getElementById("loadingOverlay").style.display = "none"; }
window.showModal = (msg) => {
  document.getElementById("modalMessage").textContent = msg;
  document.getElementById("customModal").style.display = "flex";
};
window.closeModal = () => { document.getElementById("customModal").style.display = "none"; };

function formatWIB(ts) {
  try {
    if (!ts) return "";
    const d = new Date(ts._seconds ? ts._seconds * 1000 : ts);
    const tgl = d.toLocaleDateString("id-ID");
    const jam = d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(":", ".");
    return `${tgl} ${jam} WIB`;
  } catch {
    return "";
  }
}

// === LOAD DETAIL ===
async function loadDetail() {
  const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  const slug = params.get("slug");
  const detailContainer = document.getElementById("detailContainer");

  if (!id && !slug) {
    detailContainer.innerHTML = "<p>❌ Tidak ada ID atau slug.</p>";
    return;
  }

  showLoading();
  try {
    const url = id
      ? `https://backend-lks-tripnas.netlify.app/.netlify/functions/get-posts?id=${id}`
      : `https://backend-lks-tripnas.netlify.app/.netlify/functions/get-posts?slug=${encodeURIComponent(slug)}`;

    const res = await fetch(url);
    const data = await res.json();
    hideLoading();

    if (!res.ok || !data || data.error) {
      detailContainer.innerHTML = `<p>❌ Gagal memuat berita: ${data.error || "Tidak ditemukan"}</p>`;
      return;
    }

    const d = data;

    // === GAMBAR ===
    let imageAtas = "", imageBawah = "";
    if (d.images && d.images.length > 0) {
      imageAtas = `<img src="${d.images[0]}" class="detail-img" onclick="showLightbox(this.src)">`;
      if (d.images.length > 1) {
        imageBawah = d.images.slice(1).map(url =>
          `<img src="${url}" class="detail-img" onclick="showLightbox(this.src)">`
        ).join("");
      }
    } else if (d.imageUrl) {
      imageAtas = `<img src="${d.imageUrl}" class="detail-img" onclick="showLightbox(this.src)">`;
    }

    // === DOKUMEN (Peraturan) ===
    let docSection = "";
    if (d.category === "Peraturan" && Array.isArray(d.links) && d.links.length > 0) {
      const items = d.links.map(f => {
        const url = f.url || "#";
        const name = f.name || "Dokumen";
        const lower = url.toLowerCase();
        let icon = "📄";
        if (lower.includes(".pdf")) icon = "📕";
        else if (lower.includes(".doc")) icon = "📘";
        else if (lower.includes(".xls")) icon = "📊";
        else if (lower.includes(".ppt")) icon = "📈";
        else if (lower.includes(".zip")) icon = "📦";
        else if (lower.includes("drive.google.com")) icon = "📄";
        return `<div class="doc-item"><span>${icon}</span><a href="${url}" target="_blank">${name}</a></div>`;
      }).join("");
      docSection = `<div class="doc-title">Dokumen terkait:</div>${items}`;
    }

    // === AGENDA ===
    let agendaSection = "";
    if (d.category === "Agenda") {
      const tanggal = d.tanggal
        ? new Date(d.tanggal).toLocaleDateString("id-ID", {
          weekday: "long", year: "numeric", month: "long", day: "numeric"
        })
        : null;
      const jam = d.jam || "";
      const lokasi = d.lokasi || "";
      agendaSection = `
        <div class="agenda-info">
          ${tanggal ? `<div class="agenda-item">🗓️ <strong>${tanggal}</strong></div>` : ""}
          ${jam ? `<div class="agenda-item">🕓 ${jam} WIB</div>` : ""}
          ${lokasi ? `<div class="agenda-item">📍 ${lokasi}</div>` : ""}
        </div>`;
    }

    // === STRUKTUR ORGANISASI ===
    let strukturImg = "";
    if (d.category === "Struktur Organisasi") {
      const img = d.imageUrl
        ? `<img src="${d.imageUrl}" class="struktur-img" onclick="showLightbox(this.src)">`
        : (d.images && d.images.length > 0
          ? `<img src="${d.images[0]}" class="struktur-img" onclick="showLightbox(this.src)">`
          : "");
      strukturImg = img;
    }

    // === RENDER ===
    detailContainer.innerHTML = `
      <div class="card">
        ${d.category !== "Struktur Organisasi" ? imageAtas : ""}
        <h2>${d.title}</h2>
        <div class="date">
          ${formatWIB(d.createdAt)}
          ${d.updatedAt ? `<div style="font-size:.7rem;opacity:.75;">diubah ${formatWIB(d.updatedAt)}</div>` : ""}
        </div>
        ${agendaSection}
        <div class="post-content">${d.content || ""}</div>
        ${docSection}
        ${d.category === "Struktur Organisasi" ? strukturImg : imageBawah}
      </div>`;
  } catch (err) {
    hideLoading();
    showModal("Gagal memuat detail: " + err.message);
  }
}

loadDetail();

// === LIGHTBOX ===
window.showLightbox = (src) => {
  const lb = document.getElementById("lightbox");
  const img = document.getElementById("lightbox-img");
  img.src = src;
  lb.style.display = "flex";
};

// === LINK HOME ===
const homeTitle = document.getElementById("homeTitle");
if (homeTitle) {
  homeTitle.addEventListener("click", (e) => {
    e.preventDefault();

    // 1. Hapus SEMUA memori sesi (posisi scroll, kategori terakhir, dll)
    sessionStorage.clear();

    // 2. Pindah ke index.html
    window.location.href = "index.html";
  });
}

// === BACK BUTTON ===
const backBtn = document.querySelector("a.btn[href='javascript:history.back()']");
if (backBtn) {
  backBtn.addEventListener("click", (e) => {
    e.preventDefault();
    // cukup gunakan history.back(), biarkan browser kembalikan posisi scroll
    history.back();
  });
}

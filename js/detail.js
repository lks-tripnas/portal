// === AMBIL TEMA GLOBAL DARI SERVER ===
(async () => {
  try {
    const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/get-config");
    const cfg = await res.json();
    const theme = cfg.theme || "kuning";
    if (theme && colorThemes[theme]) applyTheme(theme);
  } catch (err) {
    console.warn("Gagal memuat tema global:", err);
  }
})();

// === SISTEM TEMA WARNA GLOBAL (SERVER-SYNC) ===
const colorThemes = {
  kuning: ["#eab308", "#fde68a", "#000"],
  emas: ["#c59d2f", "#ffe08a", "#000"],
  jingga: ["#fb923c", "#fed7aa", "#000"],
  merah: ["#dc2626", "#fca5a5", "#fff"],
  merahmuda: ["#ec4899", "#f9a8d4", "#fff"],
  pink: ["#e91e63", "#ff80ab", "#fff"],
  ungu: ["#8b5cf6", "#c4b5fd", "#fff"],
  unguTua: ["#5b21b6", "#a78bfa", "#fff"],
  biru: ["#2563eb", "#93c5fd", "#fff"],
  birutua: ["#1e3a8a", "#3b82f6", "#fff"],
  laut: ["#0284c7", "#7dd3fc", "#fff"],
  toska: ["#0d9488", "#5eead4", "#fff"],
  hijau: ["#16a34a", "#86efac", "#fff"],
  hijautua: ["#065f46", "#34d399", "#fff"],
  hijaugelap: ["#166534", "#6ee7b7", "#fff"],
  abu: ["#9ca3af", "#d1d5db", "#000"]
};

async function applyTheme(themeName, save = false) {
  const [accent, accent2, textColor] = colorThemes[themeName];
  document.documentElement.style.setProperty("--accent", accent);
  document.documentElement.style.setProperty("--accent2", accent2);
  document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${accent2}, ${accent})`);
  document.documentElement.style.setProperty("--btn-text", textColor);

  // Simpan ke server bila diminta
  if (save) {
    try {
      const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/save-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: themeName })
      });
      const result = await res.json();
      if (result.error) throw new Error(result.error);
      showModal("Tema berhasil diperbarui untuk semua pengguna!");
    } catch (err) {
      console.error("Gagal menyimpan tema:", err);
      showModal("Gagal menyimpan tema: " + err.message);
    }
  }
}

/* THEME */
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
  themeToggle.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
    themeToggle.textContent = document.body.classList.contains("dark") ? "☀️" : "🌙";
  });

  // === DEFAULT KE TERANG ===
  const savedTheme = localStorage.getItem("theme");

  if (savedTheme === "dark") {
    document.body.classList.add("dark");
    themeToggle.textContent = "☀️";
  } else {
    // jika null atau "light"
    document.body.classList.remove("dark");
    themeToggle.textContent = "🌙";
    localStorage.setItem("theme", "light"); // simpan agar konsisten
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
      <div class="ck-content">
        ${d.category !== "Struktur Organisasi" ? imageAtas : ""}
        <h2>${d.title}</h2>
        <div class="date">
          ${formatWIB(d.createdAt)}
          ${d.updatedAt ? `<div style="font-size:.7rem;opacity:.75;">diubah ${formatWIB(d.updatedAt)}</div>` : ""}
        </div>
        ${agendaSection}
        <div class="struktur-table-scroll">
            <div class="post-content">${d.content || ""}</div>
        </div>
        ${docSection}
        ${d.category === "Struktur Organisasi" ? strukturImg : imageBawah}
      </div></div>`;

    // === AUTO EMBED YOUTUBE (Opsi C) ===
    (() => {
      const area = document.querySelector(".post-content");
      if (!area) return;

      const links = area.querySelectorAll("a[href*='youtu']");
      links.forEach(link => {
        const url = link.href;
        let videoId = null;

        // Format pendek https://youtu.be/xxxx
        if (url.includes("youtu.be/")) {
          videoId = url.split("youtu.be/")[1].substring(0, 11);
        }

        // Format panjang https://www.youtube.com/watch?v=xxxx
        else if (url.includes("watch?v=")) {
          videoId = url.split("watch?v=")[1].substring(0, 11);
        }

        if (!videoId) return;

        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${videoId}`;
        iframe.width = "100%";
        iframe.height = "420";
        iframe.style.border = "none";
        iframe.style.borderRadius = "12px";
        iframe.allow =
          "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;

        link.replaceWith(iframe);
      });
    })();

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

// === Floating WhatsApp Icon ===
const waButton = document.getElementById("waButton");

if (waButton) {
  // Fungsi untuk update ikon sesuai ukuran layar
  const updateIcon = () => {
    waButton.src = window.innerWidth >= 900
      ? "assets/halo-desktop.png"
      : "assets/halo-mobile.png";
  };

  // Jalankan saat awal & saat resize
  updateIcon();
  window.addEventListener("resize", updateIcon);

  // Klik langsung buka WhatsApp
  waButton.addEventListener("click", () => {
    window.open("https://wa.me/628111386611", "_blank");
  });

  // Efek muncul dari kiri ke kanan setelah 8 detik loading page
  window.addEventListener("load", () => {
    setTimeout(() => {
      waButton.classList.add("show");
    }, 1000); // 1 detik
  });
}

import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore, doc, getDoc, collection, query, where, getDocs, limit } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB-7udHLwaIF-PaGfb_yjgf7zkz6wrLKFU",
    authDomain: "portal-tripnas.firebaseapp.com",
    projectId: "portal-tripnas",
    storageBucket: "portal-tripnas.firebasestorage.app",
    messagingSenderId: "664623452933",
    appId: "1:664623452933:web:1f6018c0eff3c1a7c09d6c"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// === GLOBAL THEME SYNC ===
const globalTheme = localStorage.getItem("globalTheme");
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

if (globalTheme && themes[globalTheme]) {
    const [accent, accent2] = themes[globalTheme];
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent2", accent2);
    document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${accent2}, ${accent})`);
}

/* === THEME === */
const themeToggle = document.getElementById("themeToggle");
if (themeToggle) {
    themeToggle.addEventListener("click", () => {
        document.body.classList.toggle("dark");
        localStorage.setItem("theme", document.body.classList.contains("dark") ? "dark" : "light");
        themeToggle.textContent = document.body.classList.contains("dark") ? "🌙" : "☀️";
    });
    if (localStorage.getItem("theme") === "dark") {
        document.body.classList.add("dark");
        themeToggle.textContent = "🌙";
    }
}

/* === UTILITIES === */
function showLoading() {
    document.getElementById("loadingOverlay").style.display = "flex";
}
function hideLoading() {
    document.getElementById("loadingOverlay").style.display = "none";
}
window.showModal = (msg) => {
    document.getElementById("modalMessage").textContent = msg;
    document.getElementById("customModal").style.display = "flex";
};
window.closeModal = () => {
    document.getElementById("customModal").style.display = "none";
};

/* === FORMAT WAKTU === */
function formatWIB(ts) {
    try {
        if (!ts) return "";
        const d = (typeof ts.toDate === "function") ? ts.toDate() : new Date(ts);
        const tgl = d.toLocaleDateString("id-ID");
        const jam = d.toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit', hour12: false }).replace(":", ".");
        return `${tgl} ${jam} WIB`;
    } catch {
        return "";
    }
}

/* === LOAD DETAIL === */
async function loadDetail() {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const slug = params.get("slug");


    if (!id && !slug) {
        document.getElementById("detailContainer").innerHTML = "<p>❌ Tidak ada ID atau slug.</p>";
        return;
    }

    showLoading();
    try {
        let d = null;
        if (id) {
            const snap = await getDoc(doc(db, "posts", id));
            if (snap.exists()) d = snap.data();
        } else if (slug) {
            const q = query(collection(db, "posts"), where("slug", "==", slug), limit(1));
            const qs = await getDocs(q);
            if (!qs.empty) d = qs.docs[0].data();
        }

        hideLoading();
        if (!d) {
            detailContainer.innerHTML = "<p>❌ Berita tidak ditemukan.</p>";
            return;
        }
        if (d.status !== "Aktif") {
            detailContainer.innerHTML = "<div class='card'><p>Konten tidak tersedia.</p></div>";
            return;
        }

        /* === GAMBAR === */
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

        /* === DOKUMEN (Peraturan) === */
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

        /* === AGENDA === */
        let agendaSection = "";
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

            agendaSection = `
    <div class="agenda-info">
      ${tanggal ? `<div class="agenda-item">🗓️ <strong>${tanggal}</strong></div>` : ""}
      ${jam ? `<div class="agenda-item">🕓 ${jam} WIB</div>` : ""}
      ${lokasi ? `<div class="agenda-item">📍 ${lokasi}</div>` : ""}
    </div>`;
        }

        /* === STRUKTUR ORGANISASI === */
        let strukturSection = "";
        if (d.category === "Struktur Organisasi") {
            const img = d.imageUrl
                ? `<img src="${d.imageUrl}" class="struktur-img" onclick="showLightbox(this.src)">`
                : (d.images && d.images.length > 0
                    ? `<img src="${d.images[0]}" class="struktur-img" onclick="showLightbox(this.src)">`
                    : "");
            strukturSection = img;
        }

        /* === RENDER === */
        let strukturImg = "";
        if (d.category === "Struktur Organisasi") {
            const img = d.imageUrl
                ? `<img src="${d.imageUrl}" class="struktur-img" onclick="showLightbox(this.src)">`
                : (d.images && d.images.length > 0
                    ? `<img src="${d.images[0]}" class="struktur-img" onclick="showLightbox(this.src)">`
                    : "");
            strukturImg = img;
        }

        document.getElementById("detailContainer").innerHTML = `
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
  </div>
`;


    } catch (err) {
        hideLoading();
        showModal("Gagal memuat detail: " + err.message);
    }
}

loadDetail();

/* === LIGHTBOX === */
window.showLightbox = (src) => {
    const lb = document.getElementById("lightbox");
    const img = document.getElementById("lightbox-img");
    img.src = src;
    lb.style.display = "flex";
};

/* === LINK HOME & BACK BUTTON === */
const homeTitle = document.getElementById("homeTitle");
if (homeTitle) {
    homeTitle.addEventListener("click", (e) => {
        e.preventDefault();
        sessionStorage.setItem("forceHome", "true");
        window.location.href = "index.html";
    });
}

/* === Tombol "Kembali" manual agar state index dipulihkan === */
const backBtn = document.querySelector("a.btn[href='javascript:history.back()']");
if (backBtn) {
    backBtn.addEventListener("click", (e) => {
        e.preventDefault();
        // Tandai bahwa user kembali dari detail
        sessionStorage.setItem("fromDetail", "yes");
        // Gunakan navigasi history agar state sessionStorage tetap hidup
        history.back();
    });
}



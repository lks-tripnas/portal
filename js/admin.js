import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
import {
    getAuth,
    signInWithEmailAndPassword,
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import {
    collection,
    getDocs,
    getDoc,
    query,
    where,
    updateDoc,
    addDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";
const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/get-config");
const config = await res.json();
const app = initializeApp(config.firebase);
const db = getFirestore(app);
const auth = getAuth(app);
const loginCard = document.getElementById("loginCard");
const formCard = document.getElementById("formCard");
const listCard = document.getElementById("listCard");
const tbody = document.getElementById("tbody");
const uploadContainer = document.getElementById("uploadContainer");
const searchAdmin = document.getElementById("searchAdmin");
const sortSelect = document.getElementById("sortSelect");
const filterKategori = document.getElementById("filterKategori");

function slugify(str) {
    return (str || "")
        .toString()
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, "")
        .trim()
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}

const fJudulEl = document.getElementById("fJudul");
const fSlugEl = document.getElementById("fSlug");

if (fJudulEl && fSlugEl) {
    fJudulEl.addEventListener("input", () => {
        // hanya update otomatis jika user belum menyentuh field slug secara manual
        if (!fSlugEl.dataset.manual) {
            fSlugEl.value = slugify(fJudulEl.value);
        }
    });

    fSlugEl.addEventListener("input", () => {
        // tandai bahwa user mengetik sendiri slug-nya
        fSlugEl.dataset.manual = "true";
    });
}

let EDIT_ID = null;
let currentImages = [];
let removedImages = new Set();
let allDocs = [];

function showLoading(on = true) {
    document.getElementById("loadingOverlay").style.display = on ? "flex" : "none";
}
window.showModal = (msg) => {
    document.getElementById("modalMessage").textContent = msg;
    document.getElementById("customModal").style.display = "flex";
};
window.closeModal = () => {
    document.getElementById("customModal").style.display = "none";
};

/* === LOGIN === */
document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("loginEmail").value;
    const pw = document.getElementById("loginPassword").value;
    try {
        await signInWithEmailAndPassword(auth, email, pw);
    } catch {
        document.getElementById("loginMsg").textContent = "Login gagal";
    }
});

onAuthStateChanged(auth, (user) => {
    if (user) {
        loginCard.classList.add("hidden");
        formCard.classList.remove("hidden");
        listCard.classList.remove("hidden");
        reloadList();
    } else {
        loginCard.classList.remove("hidden");
        formCard.classList.add("hidden");
        listCard.classList.add("hidden");
    }
});

document.getElementById("logoutBtn").onclick = () => signOut(auth);
document.getElementById("resetBtn").onclick = () => resetForm();
document.getElementById("saveBtn").onclick = () => submitForm();
filterKategori.addEventListener("change", () => reloadList());
sortSelect.addEventListener("change", applySortFilter);
searchAdmin.addEventListener("keyup", applyAdminSearchFilter);

/* === GANTI FORM SESUAI KATEGORI === */
document.getElementById("fKategori").addEventListener("change", () => {
    const cat = document.getElementById("fKategori").value;
    uploadContainer.innerHTML = "";

    if (cat === "Peraturan") {
        // === PERATURAN: pakai link dokumen ===
        uploadContainer.innerHTML = `
      <label>Tambahkan Link Dokumen</label>
      <div id="linkList"></div>
      <button id="addLinkBtn" type="button">+ Tambah Link</button>
      <div class="muted">Masukkan nama dan link dokumen (bisa lebih dari satu).</div>
      <div class="muted" style="margin-top:.4rem;">⚠️ File harus dapat diakses publik (Google Drive “Anyone with the link”).</div>`;
        document.getElementById("addLinkBtn").addEventListener("click", () => addLinkRow());

    } else if (cat === "Struktur Organisasi") {
        // === STRUKTUR ORGANISASI: upload satu gambar saja ===
        uploadContainer.innerHTML = `
      <label>Upload Struktur Organisasi</label>
      <input type="file" id="fFile" accept="image/*">
      <div class="muted">Unggah 1 gambar struktur organisasi (format PNG/JPG).</div>
      <div id="oldImages"></div>`;
        renderOldImages();

    } else if (cat === "Agenda") {
        // === AGENDA: tanggal, jam, lokasi, deskripsi ===
        uploadContainer.innerHTML = `
      <label>Tanggal Agenda</label>
      <input type="date" id="fTanggalAgenda">

      <label>Jam (WIB)</label>
      <input type="time" id="fJamAgenda" step="60">

      <label>Lokasi / Keterangan</label>
      <input type="text" id="fLokasiAgenda" placeholder="Misal: Aula Kantor / Rapat Tahunan">

      <div class="muted">Isi deskripsi lengkap di area teks utama di bawah.</div>
      <div class="muted" style="margin-top:.3rem;">Zona waktu otomatis diset ke WIB (UTC+7).</div>`;

    } else {
        // === DEFAULT: Berita, Pengumuman, dll. ===
        uploadContainer.innerHTML = `
      <label>Upload Gambar</label>
      <input type="file" id="fFile" accept="image/*" multiple>
      <div class="muted">Anda bisa pilih lebih dari 1 gambar.</div>
      <div id="oldImages"></div>`;
        renderOldImages();
    }
});


function addLinkRow(name = "", url = "") {
    const list = document.getElementById("linkList");
    if (!list) return;
    const row = document.createElement("div");
    row.className = "link-row";
    row.innerHTML = `
    <input type="text" placeholder="Nama Dokumen" value="${name}">
    <input type="text" placeholder="Link Dokumen" value="${url}">
    <button type="button" class="remove-link">×</button>`;
    row.querySelector(".remove-link").onclick = () => row.remove();
    list.appendChild(row);
}

/* === LIST FIRESTORE === */
async function reloadList() {
    showLoading(true);
    let q = collection(db, "posts");
    const cat = filterKategori.value;
    if (cat) q = query(collection(db, "posts"), where("category", "==", cat));
    const snap = await getDocs(q);

    allDocs = [];
    snap.forEach(d => allDocs.push({ id: d.id, ...d.data() }));
    showLoading(false);

    sortSelect.value = "terbaru";
    applySortFilter();
}

function renderTable(data) {
    tbody.innerHTML = "";
    data.forEach(d => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
      <td data-label="Judul"><strong>${d.title || ""}</strong>
      <div class="muted">${d.slug || ""}</div>
      <span class="hidden-content" style="display:none;">${(d.content || "").toLowerCase()}</span>
      <div class="mt">
        <a href="#" onclick="editRow('${d.id}');return false;">Edit</a> |
        <a class="danger" href="#" onclick="arsipkan('${d.id}');return false;">Arsipkan</a> |
        <a class="danger" href="#" onclick="hapus('${d.id}');return false;">Hapus</a>
      </div></td>
      <td data-label="Kategori">${d.category || ""}</td>
      <td data-label="Tanggal">${formatTanggal(d.createdAt)}</td>
      <td data-label="Status"><span class="tag">${d.status || ""}</span></td>
      <td data-label="Media">${d.category === "Peraturan"
                ? (d.links?.length || 0) + " dokumen"
                : d.category === "Struktur Organisasi"
                    ? (d.imageUrl ? `<a href="${d.imageUrl}" target="_blank">Lihat</a>` : "-")
                    : (d.images && d.images.length > 0 ? `<a href="${d.images[0]}" target="_blank">Lihat</a>` : "-")
            }</td>`;
        tbody.appendChild(tr);
    });
    applyAdminSearchFilter();
}

function formatTanggal(ts) {
    try {
        if (!ts) return "";
        if (typeof ts.toDate === "function") return ts.toDate().toLocaleDateString("id-ID");
        const d = new Date(ts);
        return isNaN(d) ? "" : d.toLocaleDateString("id-ID");
    } catch {
        return "";
    }
}

function getSeconds(ts) {
    if (!ts) return 0;
    if (typeof ts.seconds === "number") return ts.seconds;
    if (typeof ts.toDate === "function") return Math.floor(ts.toDate().getTime() / 1000);
    const d = new Date(ts);
    return isNaN(d) ? 0 : Math.floor(d.getTime() / 1000);
}

function applySortFilter() {
    let data = [...allDocs];
    const val = sortSelect.value;

    if (val === "terbaru") {
        data.sort((a, b) => getSeconds(b.createdAt) - getSeconds(a.createdAt));
    } else if (val === "terlama") {
        data.sort((a, b) => getSeconds(a.createdAt) - getSeconds(b.createdAt));
    } else if (["aktif", "arsip", "draft"].includes(val)) {
        data = data.filter(d => (d.status || "").toLowerCase() === val);
    }
    renderTable(data);
}

function applyAdminSearchFilter() {
    const q = (searchAdmin.value || "").trim().toLowerCase();
    const rows = [...document.querySelectorAll("#tbody tr")];
    if (!q) { rows.forEach(r => r.style.display = ""); return; }
    rows.forEach(r => {
        const judulCell = r.querySelector("td[data-label='Judul']");
        const titleText = (judulCell?.querySelector("strong")?.textContent || "").toLowerCase();
        const contentText = (judulCell?.querySelector(".hidden-content")?.textContent || "").toLowerCase();
        r.style.display = (titleText.includes(q) || contentText.includes(q)) ? "" : "none";
    });
}

/* === EDIT === */
window.editRow = async (id) => {
    showLoading(true);
    const snap = await getDoc(doc(db, "posts", id));
    showLoading(false);
    if (!snap.exists()) return;
    const d = snap.data();
    EDIT_ID = id;

    document.getElementById("formTitle").textContent = "Edit Konten";
    document.getElementById("fJudul").value = d.title || "";
    document.getElementById("fKategori").value = d.category || "Berita";
    tinymce.get("fIsi")?.setContent(d.content || "");
    document.getElementById("fStatus").value = d.status || "Aktif";
    document.getElementById("fSlug").value = d.slug || "";

    document.getElementById("fKategori").dispatchEvent(new Event("change"));

    if (d.category === "Agenda") {
        setTimeout(() => {
            if (d.tanggal) document.getElementById("fTanggalAgenda").value = d.tanggal;
            if (d.jam) document.getElementById("fJamAgenda").value = d.jam;
            if (d.lokasi) document.getElementById("fLokasiAgenda").value = d.lokasi;
        }, 150);
    }

    if (d.category === "Peraturan" && Array.isArray(d.links)) {
        d.links.forEach(l => addLinkRow(l.name || "", l.url || ""));
        currentImages = [];
        removedImages.clear();

    } else {
        // === Periksa apakah data pakai images[] atau imageUrl tunggal ===
        if (Array.isArray(d.images) && d.images.length > 0) {
            currentImages = d.images.slice();
        } else if (d.imageUrl) {
            currentImages = [d.imageUrl];
        } else {
            currentImages = [];
        }

        removedImages = new Set();
        renderOldImages();
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
};

function renderOldImages() {
    const wrap = document.getElementById("oldImages");
    if (!wrap) return;
    wrap.innerHTML = "";
    currentImages.forEach(url => {
        if (removedImages.has(url)) return;
        const div = document.createElement("div");
        div.className = "thumb-wrap";
        div.innerHTML = `<img src="${url}" alt=""><button class="remove" onclick="removeOldImage('${url}')">×</button>`;
        wrap.appendChild(div);
    });
}

window.removeOldImage = (url) => { removedImages.add(url); renderOldImages(); };

window.arsipkan = async (id) => {
    if (!confirm("Yakin ingin mengarsipkan konten ini?")) return;
    try {
        const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/save-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id, status: "Arsip" })
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        showModal("Konten berhasil diarsipkan.");
        reloadList();
    } catch (err) {
        console.error("Gagal mengarsipkan:", err);
        showModal("Gagal mengarsipkan: " + err.message);
    }
};

window.hapus = async (id) => {
    if (!confirm("Yakin ingin menghapus konten ini?")) return;
    try {
        const res = await fetch(`https://backend-lks-tripnas.netlify.app/.netlify/functions/delete-post?id=${id}`, {
            method: "DELETE"
        });
        const result = await res.json();
        if (result.error) throw new Error(result.error);
        showModal("Konten berhasil dihapus.");
        reloadList();
    } catch (err) {
        console.error("Gagal menghapus:", err);
        showModal("Gagal menghapus: " + err.message);
    }
};


function resetForm() {
    EDIT_ID = null;
    document.getElementById("formTitle").textContent = "Tambah Konten";
    ["fJudul", "fSlug"].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.value = "";
    });
    tinymce.get("fIsi")?.setContent("");
    document.getElementById("fKategori").value = "Berita";
    document.getElementById("fStatus").value = "Aktif";
    const fFile = document.getElementById("fFile");
    if (fFile) fFile.value = "";
    currentImages = [];
    removedImages.clear();
    const wrap = document.getElementById("oldImages");
    if (wrap) wrap.innerHTML = "";
    document.getElementById("fKategori").dispatchEvent(new Event("change"));
}

/* === CEK SLUG UNIK === */
async function isSlugUsed(slug, currentId = null) {
    if (!slug) return false;
    const q = query(collection(db, "posts"), where("slug", "==", slug));
    const snap = await getDocs(q);
    if (snap.empty) return false;
    return snap.docs.some(docSnap => docSnap.id !== currentId);
}

/* === SIMPAN === */
async function submitForm() {
    const title = document.getElementById("fJudul").value.trim();
    const category = document.getElementById("fKategori").value;
    const content = tinymce.get("fIsi")?.getContent() || "";
    const status = document.getElementById("fStatus").value;
    const slug = document.getElementById("fSlug").value.trim();

    // === Ambil konfigurasi Cloudinary dari backend ===
    let cloudCfg;
    try {
        const resCfg = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/get-config");
        const cfg = await resCfg.json();
        cloudCfg = cfg.cloudinary;
    } catch (err) {
        console.error("Gagal memuat konfigurasi Cloudinary:", err);
        alert("Tidak dapat memuat konfigurasi Cloudinary.");
        return;
    }

    if (slug) {
        const used = await isSlugUsed(slug, EDIT_ID);
        if (used) return showModal("Slug '" + slug + "' sudah dipakai.");
    }

    let payload = { title, category, content, status, slug, author: auth.currentUser.email };

    if (category === "Peraturan") {
        const rows = document.querySelectorAll("#linkList .link-row");
        const links = [];
        rows.forEach(r => {
            const name = r.children[0].value.trim();
            const url = r.children[1].value.trim();
            if (url) links.push({ name, url });
        });
        payload.links = links;
    }
    else if (category === "Struktur Organisasi") {
        const fileInput = document.getElementById("fFile");
        if (fileInput?.files?.length > 0) {
            showLoading(true);
            const file = fileInput.files[0];
            const formData = new FormData();
            formData.append("file", file);
            formData.append("upload_preset", cloudCfg.uploadPreset);
            // Folder khusus tetap boleh disesuaikan manual:
            formData.append("folder", "struktur-organisasi");

            const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudCfg.cloudName}/image/upload`;
            const res = await fetch(uploadUrl, { method: "POST", body: formData });
            const data = await res.json();
            showLoading(false);
            if (data.secure_url) payload.imageUrl = data.secure_url;
        }
    }

    else if (category === "Agenda") {
        const tanggal = document.getElementById("fTanggalAgenda")?.value || "";
        const jam = document.getElementById("fJamAgenda")?.value || "";
        const lokasi = document.getElementById("fLokasiAgenda")?.value || "";
        payload.tanggal = tanggal;
        payload.jam = jam;
        payload.lokasi = lokasi;
    }
    else {
        const fileInput = document.getElementById("fFile");
        const files = fileInput ? fileInput.files : [];
        const keptOld = currentImages.filter(u => !removedImages.has(u));
        const imageUrls = [...keptOld];

        if (files.length > 0) {
            showLoading(true);
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", cloudCfg.uploadPreset);
                formData.append("folder", cloudCfg.folder); // dari backend

                const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudCfg.cloudName}/image/upload`;
                const res = await fetch(uploadUrl, { method: "POST", body: formData });
                const data = await res.json();
                if (data.secure_url) imageUrls.push(data.secure_url);
            }
            showLoading(false);
        }

        payload.images = imageUrls;
    }

    try {
        const postData = { id: EDIT_ID || null, ...payload };
        const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/save-post", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(postData)
        });

        const result = await res.json();
        if (result.error) throw new Error(result.error);

        showModal("Konten berhasil disimpan.");
        resetForm();
        reloadList();
    } catch (err) {
        console.error("Gagal menyimpan:", err);
        showModal("Gagal menyimpan: " + err.message);
    }

}

// === SISTEM TEMA WARNA GLOBAL (SERVER-SYNC) ===
const colorThemes = {
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

async function applyTheme(themeName, save = false) {
    const [accent, accent2] = colorThemes[themeName];
    document.documentElement.style.setProperty("--accent", accent);
    document.documentElement.style.setProperty("--accent2", accent2);
    document.documentElement.style.setProperty("--accent-gradient", `linear-gradient(135deg, ${accent2}, ${accent})`);

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

// Ambil tema saat halaman admin dibuka
(async () => {
    try {
        const res = await fetch("https://backend-lks-tripnas.netlify.app/.netlify/functions/get-config");
        const cfg = await res.json();
        const theme = cfg.theme || "kuning";
        if (colorThemes[theme]) applyTheme(theme);
    } catch (err) {
        console.warn("Gagal memuat tema global:", err);
    }
})();

// Klik tombol warna
document.querySelectorAll(".color-btn").forEach(btn => {
    btn.addEventListener("click", () => {
        const theme = btn.dataset.theme;
        applyTheme(theme, true); // true = simpan ke server
    });
});

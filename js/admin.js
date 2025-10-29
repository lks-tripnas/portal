import { initializeApp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-auth.js";
import { getFirestore, collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/12.3.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyB-7udHLwaIF-PaGfb_yjgf7zkz6wrLKFU",
    authDomain: "portal-tripnas.firebaseapp.com",
    projectId: "portal-tripnas",
    storageBucket: "portal-tripnas.firebasestorage.app",
    messagingSenderId: "664623452933",
    appId: "1:664623452933:web:1f6018c0eff3c1a7c09d6c"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

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
        if (!fSlugEl.value.trim()) {
            fSlugEl.value = slugify(fJudulEl.value);
        }
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
        uploadContainer.innerHTML = `
      <label>Tambahkan Link Dokumen</label>
      <div id="linkList"></div>
      <button id="addLinkBtn" type="button">+ Tambah Link</button>
      <div class="muted">Masukkan nama dan link dokumen (bisa lebih dari satu).</div>
      <div class="muted" style="margin-top:.4rem;">⚠️ File harus dapat diakses publik (Google Drive “Anyone with the link”).</div>`;
        document.getElementById("addLinkBtn").addEventListener("click", () => addLinkRow());
    } else {
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

    if (d.category === "Peraturan" && Array.isArray(d.links)) {
        d.links.forEach(l => addLinkRow(l.name || "", l.url || ""));
        currentImages = [];
        removedImages.clear();
    } else {
        currentImages = Array.isArray(d.images) ? d.images.slice() : [];
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
    await updateDoc(doc(db, "posts", id), { status: "Arsip" });
    showModal("Konten diarsipkan.");
    reloadList();
};
window.hapus = async (id) => {
    await deleteDoc(doc(db, "posts", id));
    showModal("Konten dihapus.");
    reloadList();
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

    if (slug) {
        const used = await isSlugUsed(slug, EDIT_ID);
        if (used) {
            showModal("Slug '" + slug + "' sudah dipakai.");
            return;
        }
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
    } else {
        const fileInput = document.getElementById("fFile");
        const files = fileInput ? fileInput.files : [];
        const keptOld = currentImages.filter(u => !removedImages.has(u));
        const imageUrls = [...keptOld];

        if (files.length > 0) {
            showLoading(true);
            for (const file of files) {
                const formData = new FormData();
                formData.append("file", file);
                formData.append("upload_preset", "lks_tripnas_unsigned");
                formData.append("folder", "lks-tripnas-website");
                const res = await fetch("https://api.cloudinary.com/v1_1/dxkqflxae/image/upload", { method: "POST", body: formData });
                const data = await res.json();
                if (data.secure_url) imageUrls.push(data.secure_url);
            }
            showLoading(false);
        }
        payload.images = imageUrls;
    }

    try {
        if (EDIT_ID) {
            payload.updatedAt = serverTimestamp();
            await updateDoc(doc(db, "posts", EDIT_ID), payload);
        } else {
            payload.createdAt = serverTimestamp();
            await addDoc(collection(db, "posts"), payload);
        }
        showModal("Konten berhasil disimpan.");
        resetForm();
        reloadList();
    } catch (err) {
        showModal("Gagal menyimpan: " + err.message);
    }
}

import { api } from "./api.js";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";

/* ====== FUNGSI AMBIL CONFIG DARI BACKEND ====== */
async function initFirebase() {
  const res = await fetch("https://lks-tripnas.netlify.app/.netlify/functions/get-firebase-config");
  if (!res.ok) throw new Error("Gagal memuat konfigurasi Firebase");
  const config = await res.json();
  const app = initializeApp(config);
  return getAuth(app);
}

/* ====== INISIALISASI ====== */
const auth = await initFirebase();

/* ====== ELEMEN DOM ====== */
const loginCard = document.getElementById("loginCard");
const formCard = document.getElementById("formCard");
const listCard = document.getElementById("listCard");
const tbody = document.getElementById("tbody");
const uploadContainer = document.getElementById("uploadContainer");
const searchAdmin = document.getElementById("searchAdmin");
const sortSelect = document.getElementById("sortSelect");
const filterKategori = document.getElementById("filterKategori");

let EDIT_ID = null;
let currentUserToken = null;
let allPosts = [];

/* ====== MODAL UTIL ====== */
function showModal(msg) {
  const modal = document.getElementById("customModal");
  document.getElementById("modalMessage").textContent = msg;
  modal.style.display = "flex";
}
window.closeModal = () => (document.getElementById("customModal").style.display = "none");

/* ====== LOGIN ====== */
document.getElementById("loginForm")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const pw = document.getElementById("loginPassword").value.trim();
  try {
    await signInWithEmailAndPassword(auth, email, pw);
  } catch (err) {
    document.getElementById("loginMsg").textContent = "Login gagal: " + err.message;
  }
});

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginCard.classList.add("hidden");
    formCard.classList.remove("hidden");
    listCard.classList.remove("hidden");
    currentUserToken = await user.getIdToken();
    await reloadList();
  } else {
    loginCard.classList.remove("hidden");
    formCard.classList.add("hidden");
    listCard.classList.add("hidden");
    currentUserToken = null;
  }
});

document.getElementById("logoutBtn")?.addEventListener("click", () => signOut(auth));

/* ====== RELOAD LIST ====== */
async function reloadList() {
  try {
    const { items } = await api("get-posts?limit=200", { token: currentUserToken });
    allPosts = items || [];
    renderTable(allPosts);
  } catch (err) {
    showModal("Gagal memuat daftar: " + err.message);
  }
}

/* ====== RENDER TABEL ====== */
function renderTable(data) {
  tbody.innerHTML = "";
  data.forEach((p) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${p.judul}</strong><div class="muted">${p.slug || ""}</div></td>
      <td>${p.kategori || ""}</td>
      <td>${p.status || "Aktif"}</td>
      <td>${p.createdAt ? new Date(p.createdAt).toLocaleDateString("id-ID") : ""}</td>
      <td>${p.images?.length ? `<a href="${p.images[0]}" target="_blank">Lihat</a>` : "-"}</td>
      <td>
        <a href="#" onclick="editPost('${p.id}');return false;">Edit</a> |
        <a href="#" class="danger" onclick="deletePost('${p.id}');return false;">Hapus</a>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

/* ====== SIMPAN POST ====== */
window.savePost = async () => {
  const judul = document.getElementById("fJudul").value.trim();
  const konten = document.getElementById("fIsi").value.trim();
  const kategori = document.getElementById("fKategori").value;
  const status = document.getElementById("fStatus").value;
  const slug = document.getElementById("fSlug").value.trim();
  const files = document.getElementById("fFile").files;

  try {
    let imageUrls = [];
    if (files.length > 0) {
      for (const f of files) {
        const reader = new FileReader();
        const dataUrl = await new Promise((res, rej) => {
          reader.onload = () => res(reader.result);
          reader.onerror = rej;
          reader.readAsDataURL(f);
        });
        const upload = await api("upload-image", {
          method: "POST",
          body: { dataUrl },
          token: currentUserToken
        });
        imageUrls.push(upload.url);
      }
    }

    const payload = { judul, konten, kategori, status, slug, images: imageUrls };

    if (EDIT_ID) {
      await api("update-post", { method: "POST", body: { id: EDIT_ID, ...payload }, token: currentUserToken });
      showModal("Konten berhasil diperbarui.");
    } else {
      await api("add-post", { method: "POST", body: payload, token: currentUserToken });
      showModal("Konten berhasil ditambahkan.");
    }

    resetForm();
    reloadList();
  } catch (err) {
    showModal("Gagal menyimpan: " + err.message);
  }
};

/* ====== HAPUS ====== */
window.deletePost = async (id) => {
  if (!confirm("Hapus konten ini?")) return;
  try {
    await api("delete-post", { method: "POST", body: { id }, token: currentUserToken });
    showModal("Konten dihapus.");
    reloadList();
  } catch (err) {
    showModal("Gagal menghapus: " + err.message);
  }
};

/* ====== EDIT POST ====== */
window.editPost = (id) => {
  const p = allPosts.find((x) => x.id === id);
  if (!p) return;
  EDIT_ID = id;
  document.getElementById("formTitle").textContent = "Edit Konten";
  document.getElementById("fJudul").value = p.judul;
  document.getElementById("fIsi").value = p.konten;
  document.getElementById("fKategori").value = p.kategori;
  document.getElementById("fStatus").value = p.status;
  document.getElementById("fSlug").value = p.slug;
  window.scrollTo({ top: 0, behavior: "smooth" });
};

/* ====== RESET FORM ====== */
window.resetForm = () => {
  EDIT_ID = null;
  document.getElementById("formTitle").textContent = "Tambah Konten";
  ["fJudul", "fIsi", "fSlug"].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("fKategori").value = "Berita";
  document.getElementById("fStatus").value = "Aktif";
  document.getElementById("fFile").value = "";
};

import { API_BASE } from "./api.js";

async function loadPosts() {
  const res = await fetch(`${API_BASE}/get-posts?limit=20`);
  const { items } = await res.json();
  const list = document.getElementById("contentList");
  list.innerHTML = items.map(p => `
    <article class="card">
      ${p.images?.[0] ? `<img class="thumb" src="${p.images[0]}" alt="">` : ""}
      <h3><a href="detail.html?id=${p.id}">${p.judul}</a></h3>
      <p>${(p.konten || "").slice(0,150)}...</p>
    </article>
  `).join("");
}
document.addEventListener("DOMContentLoaded", loadPosts);

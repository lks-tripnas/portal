import { API_BASE } from "./api.js";

const id = new URLSearchParams(location.search).get("id");

async function loadDetail() {
  const res = await fetch(`${API_BASE}/get-post?id=${encodeURIComponent(id)}`);
  const p = await res.json();
  document.getElementById("title").textContent = p.judul;
  document.getElementById("content").innerHTML = (p.konten || "").replace(/\n/g, "<br>");
  const g = document.getElementById("gallery");
  g.innerHTML = (p.images || []).map(u => `<img class="detail-img" src="${u}">`).join("");
}
document.addEventListener("DOMContentLoaded", loadDetail);

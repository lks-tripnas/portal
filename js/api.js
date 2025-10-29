// Ubah URL di bawah agar sesuai dengan backend kamu
export const API_BASE = "https://lks-tripnas.netlify.app/.netlify/functions";

export async function api(path, { method="GET", body=null, token="" } = {}) {
  const res = await fetch(`${API_BASE}/${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: body ? JSON.stringify(body) : null
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

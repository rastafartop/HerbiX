const SUPABASE_URL = "https://qjytxxkztdeyxygoiybi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeXR4eGt6dGRleXh5Z29peWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM3NjcsImV4cCI6MjA4OTk5OTc2N30.afZ40Kl6SXjTt7DGtIFDyKWPsYxaC75_jL1X79PonpQ";
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);


function getProductIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return Number(params.get("id"));
}

async function loadProduct() {
  const id = getProductIdFromUrl();
  const container = document.getElementById("product-container");
  const status = document.getElementById("product-status");

  if (!id) {
    status.textContent = "Некорректный ID товара.";
    return;
  }

  status.textContent = "Загружаем товар...";

  const { data, error } = await supabaseClient
    .from("products")
    .select("*")
    .eq("id", id)
    .single();

  if (error || !data) {
    console.error(error);
    status.textContent = "Товар не найден.";
    return;
  }

  status.textContent = "";

  const priceValue = Number(data.price || 0).toLocaleString("ru-RU");
  const title = escapeHtml(data.title || "");
  const description = data.description || "";
  const img = data.image_url || "assets/img/placeholder.png";

  container.innerHTML = `
    <img src="${img}" alt="${title}">
    <div class="product-page-info">
      <h1>${title}</h1>
      <div class="price">${priceValue} ₸</div>
      <p>${description ? escapeHtml(description) : "Описание скоро появится."}</p>
      <a href="catalog.html" class="btn-back">← Вернуться в каталог</a>
    </div>
  `;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
  
document.addEventListener("DOMContentLoaded", loadProduct);

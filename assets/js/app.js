const SUPABASE_URL = "https://qjytxxkztdeyxygoiybi.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeXR4eGt6dGRleXh5Z29peWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM3NjcsImV4cCI6MjA4OTk5OTc2N30.afZ40Kl6SXjTt7DGtIFDyKWPsYxaC75_jL1X79PonpQ";

if (!window._sb) {
  window._sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
const supabaseClient = window._sb;

// 2. Глобальные переменные
let isIndexPage = false;

let allProducts = [];        // данные из Supabase
let filteredProducts = [];   // после фильтров/поиска

const VISIBLE_COUNT = 8;     // сколько карточек в слайдере
let sliderIndex = 0;         // текущий индекс
let sliderTimer = null;      // таймер автолистывания

window.currentModalQty = 1;
window.currentModalPrice = 0;
window.currentModalProduct = null;
// Локальные алиасы для существующего кода
let currentModalQty = window.currentModalQty;
let currentModalPrice = window.currentModalPrice;
let currentModalProduct = window.currentModalProduct;

let cart = [];

let isAnimating = false;
// 3. Загрузка товаров
// 3. Загрузка товаров
async function loadProducts() {
  const grid = document.getElementById("products") || document.getElementById("product-list");
  if (!grid) return;

  try {
    let query = supabaseClient
      .from("products")
      .select("*");

    // 👉 ТОЛЬКО для главной страницы
    if (isIndexPage) {
      query = query.eq("is_popular", true);
    }

    const { data, error } = await query;

    if (error) throw error;

    allProducts = data || [];
    filteredProducts = [...allProducts];

    if (isIndexPage) {
      renderSliderSlice(true);
      startSliderAuto();
    } else {
      renderProducts(filteredProducts);
    }
  } catch (err) {
    console.error("Ошибка загрузки товаров:", err);
  }
}
function renderProducts(products) {
  const grid = document.getElementById("products");
  if (!grid) return;

  grid.innerHTML = "";

  if (!products || products.length === 0) {
    grid.innerHTML = "<p>Ничего не найдено.</p>";
    return;
  }

  products.forEach((p) => {
let images = [];

if (Array.isArray(p.images)) {
  images = p.images;
} else if (typeof p.images === "string") {
  try {
    images = JSON.parse(p.images);
  } catch {
    images = [];
  }
}

images = images.filter(Boolean);

if (!images.length && p.image_url) {
  images = [p.image_url];
}

images = images.map(img => img + (p.updated_at ? "?t=" + p.updated_at : ""));

    const priceValue = Number(p.price || 0).toLocaleString("ru-RU");
    const title = escapeHtml(p.title || "");

    const card = document.createElement("div");
    card.className = "product-card";
    card.dataset.images = JSON.stringify(images);

    card.innerHTML = `
      <div class="product-card-image-wrap">
        <img src="${images[0]}" alt="${title}" class="product-card-main-image">
        ${images.length > 1 ? `
          <div class="product-card-dots">
            ${images.map((_, i) => `
              <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
            `).join('')}
          </div>` : ''}
      </div>
      <div class="product-card-title">${title}</div>
      <div class="price">${priceValue} ₸</div>
    `;

    card.addEventListener("click", () => openProductModal(p));
    grid.appendChild(card);
  });

  initCardSliders();   // ← запускаем мини-слайдеры
}

function initCardSliders() {
  const cards = document.querySelectorAll(".product-card");
  
  cards.forEach(card => {
    const dots = card.querySelectorAll(".dot");
    const mainImg = card.querySelector(".product-card-main-image");
    const images = JSON.parse(card.dataset.images || "[]");

    if (images.length <= 1) return;

    dots.forEach(dot => {
      dot.addEventListener("click", (e) => {
        e.stopImmediatePropagation();
        const index = parseInt(dot.dataset.index);

        mainImg.style.opacity = 0;
        setTimeout(() => {
          mainImg.src = images[index];
          mainImg.style.opacity = 1;
        }, 150);

        dots.forEach(d => d.classList.remove("active"));
        dot.classList.add("active");
      });
    });
  });
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}


// 5. Настройка фильтров по категориям
function setupCategoryFilters() {
  const buttons = document.querySelectorAll(".category");
  if (!buttons.length) return;

  const searchInput = document.getElementById("search");

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      buttons.forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      filterAndRender(btn.dataset.category || "all", searchInput ? searchInput.value.trim() : "");
    });
  });

  document.querySelector('.category[data-category="all"]')?.classList.add("active");
}
// 1. Настройка поиска
function setupSearch() {
  const input = document.getElementById("search");
  const btn   = document.getElementById("search-button");

  if (!input) return;

  const getCategory = () =>
    document.querySelector(".category.active")?.dataset.category ?? "all";

  const handleSearch = () => filterAndRender(getCategory(), input.value.trim());

  btn?.addEventListener("click", (e) => { e.preventDefault(); handleSearch(); });

  input.addEventListener("keydown", (e) => { if (e.key === "Enter") { e.preventDefault(); handleSearch(); } });

  input.addEventListener("input", () => { if (!input.value.trim()) handleSearch(); });
}

function filterAndRender(category, searchTerm) {
  if (!document.getElementById("products") && !document.getElementById("product-list")) return;

  const term = searchTerm.toLowerCase();

  filteredProducts = allProducts.filter((p) => {
    const matchCat  = !category || category === "all" || (p.category || "") === category;
    const matchText = !term || (p.title || "").toLowerCase().includes(term);
    return matchCat && matchText;
  });

  if (isIndexPage) {
    sliderIndex = 0;
    // Без фильтров — показываем только популярные; при любом запросе — результат поиска
    if (!term && (!category || category === "all")) {
      filteredProducts = allProducts.filter((p) => p.is_popular === true);
    }
    renderSliderSlice(true);
  } else {
    renderProducts(filteredProducts);
  }
}
// 6. Слайдер популярных товаров

function renderSliderSlice(animated = true, direction = 1) {
  const grid = document.getElementById("products");
  if (!grid) return;

  const total = filteredProducts.length;

  if (total === 0) {
    renderProducts([]);
    return;
  }

  const visible = [];
  const count = Math.min(VISIBLE_COUNT, total);

  for (let i = 0; i < count; i++) {
    visible.push(filteredProducts[(sliderIndex + i) % total]);
  }

  if (!animated) {
    renderProducts(visible);
    return;
  }

  isAnimating = true;

  // 👉 1. уводим текущие карточки
  grid.classList.remove("slider-active");
  grid.classList.add(direction === 1 ? "slider-out-left" : "slider-in-right");

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      // 👉 2. меняем товары
      renderProducts(visible);

      // 👉 3. ставим стартовую позицию
      grid.classList.remove("slider-out-left", "slider-in-right");
      grid.classList.add(direction === 1 ? "slider-in-right" : "slider-out-left");

      requestAnimationFrame(() => {
        // 👉 4. анимируем в нормальное состояние
        grid.classList.remove("slider-out-left", "slider-in-right");
        grid.classList.add("slider-active");
      });

      const handleEnd = () => {
        grid.removeEventListener("transitionend", handleEnd);
        isAnimating = false;
      };

      grid.addEventListener("transitionend", handleEnd);
    });
  });
}


function moveSlider(step) {
  const total = filteredProducts.length;
  if (total === 0) return;

  sliderIndex = (sliderIndex + step + total) % total;

  renderSliderSlice(true, step > 0 ? 1 : -1); // 🔥 направление
}

function startSliderAuto() {
  stopSliderAuto();
  if (!isIndexPage) return;

  const total = filteredProducts.length;
  if (total <= VISIBLE_COUNT) return;

  sliderTimer = setInterval(() => {
    moveSlider(1);
  }, 4000);
}

function stopSliderAuto() {
  if (sliderTimer) {
    clearInterval(sliderTimer);
    sliderTimer = null;
  }
}

// 7. Модалка товара
function initProductModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;

  const closeBtn = document.getElementById("product-modal-close");
  const addBtn = document.getElementById("modal-add-to-cart");
  const plusBtn = document.getElementById("modal-qty-plus");
  const minusBtn = document.getElementById("modal-qty-minus");

  closeBtn?.addEventListener("click", closeProductModal);

  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeProductModal();
  });

plusBtn?.addEventListener("click", () => {
  const variant = (typeof window.getSelectedVariant === "function")
    ? window.getSelectedVariant() : null;
  const maxStock = variant ? Number(variant.stock) : Infinity;
  if (currentModalQty < maxStock) {
    currentModalQty += 1;
    window.currentModalQty = currentModalQty;
  }
  updateModalPriceUI();
});

  minusBtn?.addEventListener("click", () => {
    if (currentModalQty > 1) {
      currentModalQty -= 1;
      window.currentModalQty = currentModalQty;
      updateModalPriceUI();
    }
  });

  addBtn?.addEventListener("click", () => {
    if (!currentModalProduct) return;
    // Если есть выбранный вариант — добавляем с информацией о нём
    const variant = (typeof window.getSelectedVariant === "function")
      ? window.getSelectedVariant() : null;
    addToCart(currentModalProduct, currentModalQty, variant);
    showToast("Товар успешно добавлен в корзину");
  });
}

function openProductModal(product) {
  const modal = document.getElementById("product-modal");
  if (!modal) return;

  currentModalProduct = product;
  window.currentModalProduct = product;
  currentModalQty = 1;
  window.currentModalQty = 1;
  currentModalPrice = Number(product.price || 0) || 0;
  window.currentModalPrice = currentModalPrice;

  let images = product.images || [];
  if (images.length === 0 && product.image_url) images = [product.image_url];
  if (images.length === 0) images = ["assets/img/placeholder.png"]; // заглушка

  const titleEl = document.getElementById("modal-title");
  const descEl = document.getElementById("modal-description");
  const priceEl = document.getElementById("modal-price");

  titleEl.textContent = product.title || "";
  descEl.textContent = product.description || "Описание скоро появится.";
  priceEl.textContent = `${currentModalPrice.toLocaleString("ru-RU")} ₸`;

  renderModalSlider(images);

  // Загружаем варианты товара (вкусы/граммовки)
  if (typeof window.loadProductVariants === "function") {
    window.loadProductVariants(product.id).then(() => {
      // После загрузки — синхронизируем локальную цену
      currentModalPrice = window.currentModalPrice;
      updateModalPriceUI();
    });
  }

  updateModalPriceUI();
  modal.classList.add("open");
  document.body.classList.add("no-scroll");
}

function renderModalSlider(images) {
  const container = document.querySelector(".modal-image");
  if (!container) return;

  container.innerHTML = `
    <img src="${images[0]}" alt="" class="modal-main-image" id="modal-main-image">
    
    ${images.length > 1 ? `
      <div class="modal-arrows">
        <button id="modal-prev">‹</button>
        <button id="modal-next">›</button>
      </div>
      <div class="modal-dots" id="modal-dots">
        ${images.map((_, i) => `
          <span class="dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>
        `).join('')}
      </div>` : ''}
  `;

  if (images.length <= 1) return;

  let currentIndex = 0;
  const mainImg = document.getElementById("modal-main-image");
  const dots = document.querySelectorAll("#modal-dots .dot");

  const showImage = (index) => {
    currentIndex = (index + images.length) % images.length;
    mainImg.style.opacity = 0;
    setTimeout(() => {
      mainImg.src = images[currentIndex];
      mainImg.style.opacity = 1;
      dots.forEach(d => d.classList.remove("active"));
      dots[currentIndex].classList.add("active");
    }, 180);
  };

  document.getElementById("modal-prev").onclick = () => showImage(currentIndex - 1);
  document.getElementById("modal-next").onclick = () => showImage(currentIndex + 1);

  dots.forEach(dot => {
    dot.addEventListener("click", () => showImage(parseInt(dot.dataset.index)));
  });
}

function closeProductModal() {
  const modal = document.getElementById("product-modal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("no-scroll");
}

function updateModalPriceUI() {
  const qtyEl = document.getElementById("modal-qty-value");
  const totalEl = document.getElementById("modal-total");

  if (!qtyEl || !totalEl) return;

  // Берём актуальную цену (может быть обновлена variants.js)
  const price = window.currentModalPrice || currentModalPrice || 0;

  qtyEl.textContent = currentModalQty;
  const total = currentModalQty * price;
  totalEl.textContent = `Итого: ${total.toLocaleString("ru-RU")} ₸`;
}
window.updateModalPriceUI = updateModalPriceUI;


//8. Корзина

function initCart() {
  loadCartFromStorage();

  const cartBtn = document.getElementById("cart-button");
  const cartModal = document.getElementById("cart-modal");
  const cartClose = document.getElementById("cart-close");
  const cartClear = document.getElementById("cart-clear");
  const cartCheckout = document.getElementById("cart-checkout");

  cartBtn?.addEventListener("click", openCartModal);
  cartClose?.addEventListener("click", closeCartModal);

  cartModal?.addEventListener("click", (e) => {
    if (e.target === cartModal) closeCartModal();
  });

  cartClear?.addEventListener("click", () => {
    cart = [];
    saveCartToStorage();
    renderCart();
  });

cartCheckout?.addEventListener("click", () => {
  closeCartModal();
  window.openCheckout();
});

  renderCart();
}

function openCartModal() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  modal.classList.add("open");
  document.body.classList.add("no-scroll");
}

function closeCartModal() {
  const modal = document.getElementById("cart-modal");
  if (!modal) return;
  modal.classList.remove("open");
  document.body.classList.remove("no-scroll");
}

function loadCartFromStorage() {
  try {
    const saved = localStorage.getItem("herbix_cart");
    cart = saved ? JSON.parse(saved) : [];
  } catch {
    cart = [];
  }
  updateCartCount();
}

function saveCartToStorage() {
  localStorage.setItem("herbix_cart", JSON.stringify(cart));
  updateCartCount();
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const badge = document.getElementById("cart-count");
  if (badge) badge.textContent = count;
}

function addToCart(product, quantity = 1, variant = null) {
  const qty = Math.max(1, Number(quantity) || 1);

  // Уникальный ID элемента в корзине: variant.id или product.id
  const cartItemId = variant ? `v_${variant.id}` : `p_${product.id}`;
  const existing = cart.find((i) => i.cartId === cartItemId);

  if (existing) {
    existing.quantity += qty;
  } else {
    cart.push({
      cartId: cartItemId,
      id: product.id,
      variantId: variant ? variant.id : null,
      title: product.title,
      flavor: variant ? variant.flavor : null,
      weight_g: variant ? variant.weight_g : null,
      price: variant ? variant.price : product.price,
      image_url: product.image_url,
      quantity: qty,
    });
  }

  saveCartToStorage();
  renderCart();
}

function renderCart() {
  const container = document.getElementById("cart-items");
  const totalEl = document.getElementById("cart-total");
  if (!container || !totalEl) return;

  if (cart.length === 0) {
    container.innerHTML = "<p>Корзина пуста.</p>";
    totalEl.textContent = "0 ₸";
    return;
  }

  container.innerHTML = "";
  let total = 0;

  cart.forEach((item) => {
    const priceNum = Number(item.price || 0);
    const itemTotal = priceNum * item.quantity;
    total += itemTotal;

    // Описание варианта (вкус + граммовка)
    const variantInfo = [];
    if (item.flavor) variantInfo.push(item.flavor);
    if (item.weight_g) variantInfo.push(`${item.weight_g} г`);
    const variantStr = variantInfo.length ? ` <span style="color:#7a9a7a;font-size:12px;">(${variantInfo.join(", ")})</span>` : "";

    const row = document.createElement("div");
    row.className = "cart-item";
    row.innerHTML = `
      <img src="${item.image_url || "assets/img/placeholder.png"}" alt="">
      <div>
        <div class="cart-item-title">${escapeHtml(item.title || "")}${variantStr}</div>
        <div class="cart-item-qty">
          ${item.quantity} x ${priceNum.toLocaleString("ru-RU")} ₸
        </div>
      </div>
      <button class="cart-item-remove">Удалить</button>
    `;

    row
      .querySelector(".cart-item-remove")
      .addEventListener("click", () => {
        // Удаляем по уникальному cartId, а не по product.id
        cart = cart.filter((i) => i.cartId !== item.cartId);
        saveCartToStorage();
        renderCart();
      });

    container.appendChild(row);
  });

  totalEl.textContent = `${total.toLocaleString("ru-RU")} ₸`;
}


// Экспортируем функции корзины глобально для использования в checkout.js
window.renderCart = renderCart;
window.saveCartToStorage = saveCartToStorage;

// Экспортируем clearCart для checkout.js
// Атомарно сбрасывает cart-переменную внутри замыкания app.js
window.clearCart = function() {
  cart = [];
  saveCartToStorage(); // сохраняет [] в localStorage + обновляет счётчик
  renderCart();        // перерисовывает корзину
};

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;

  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}


function initPartnersSlider() {
  const items = document.querySelectorAll(".hero-partners-item");
  if (!items.length) return;

  const dots = document.querySelectorAll(".hero-partners-dot");
  const prevBtn = document.querySelector(".hero-partners-prev");
  const nextBtn = document.querySelector(".hero-partners-next");

  let current = 0;
  let timer = null;

  const show = (index) => {
    items.forEach((item, i) => {
      item.classList.toggle("active", i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle("active", i === index);
    });
    current = index;
  };

  const go = (step) => {
    const total = items.length;
    const next = (current + step + total) % total;
    show(next);
  };

  function start() {
    stop();
    timer = setInterval(() => go(1), 3500);
  }

  function stop() {
    if (timer) {
      clearInterval(timer);
      timer = null;
    }
  }

  function restart() {
    start();
  }

  prevBtn?.addEventListener("click", () => {
    go(-1);
    restart();
  });

  nextBtn?.addEventListener("click", () => {
    go(1);
    restart();
  });

  dots.forEach((dot, i) => {
    dot.addEventListener("click", () => {
      show(i);
      restart();
    });
  });

  show(0);
  start();
}

// 11. Старт

document.addEventListener("DOMContentLoaded", () => {
  isIndexPage = document.body.classList.contains("page-index");

  setupCategoryFilters();
  setupSearch();
  initProductModal();
  initCart();
  initPartnersSlider();

  const productsContainer = document.getElementById("products");
  if (productsContainer) {
    loadProducts();
  }

  const prevBtn = document.getElementById("popular-prev");
  const nextBtn = document.getElementById("popular-next");

  prevBtn?.addEventListener("click", () => {
    stopSliderAuto();
    moveSlider(-1);
    startSliderAuto();
  });

  nextBtn?.addEventListener("click", () => {
    stopSliderAuto();
    moveSlider(1);
    startSliderAuto();
  });
});
  
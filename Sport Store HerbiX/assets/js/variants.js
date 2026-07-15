// ===== variants.js — логика вариантов товара (вкус + граммовка) =====
// Подключается ПОСЛЕ app.js на index.html и catalog.html

(function () {
  // Глобальное состояние выбранного варианта
  window._variantState = {
    variants: [],
    selectedFlavor: null,
    selectedWeight: null,
  };

  // ── Загрузка вариантов из Supabase ─────────────────────
  window.loadProductVariants = async function (productId) {
    const state = window._variantState;

    const container = document.getElementById("variant-controls");
    if (container) container.innerHTML = "";

    // Сбрасываем состояние
    state.variants = [];
    state.selectedFlavor = null;
    state.selectedWeight = null;

    try {
      const { data, error } = await window._sb
        .from("product_variants")
        .select("*")
        .eq("product_id", productId);
      if (error) throw error;
      state.variants = data || [];
    } catch (err) {
      console.error("Ошибка загрузки вариантов:", err);
      state.variants = [];
    }

    renderVariantControls();
    return state.variants;
  };

  // ── Рендер кнопок выбора вкуса/граммовки ───────────────
  function renderVariantControls() {
    const container = document.getElementById("variant-controls");
    if (!container) return;

    const state = window._variantState;

    if (state.variants.length === 0) {
      container.innerHTML = "";
      return;
    }

    const flavors = [...new Set(state.variants.map(v => v.flavor).filter(Boolean))];
    const weights = [...new Set(state.variants.map(v => v.weight_g).filter(Boolean))]
      .sort((a, b) => a - b);

    // Дефолт: первый доступный
    if (!state.selectedFlavor && flavors.length > 0) state.selectedFlavor = flavors[0];
    if (!state.selectedWeight && weights.length > 0) state.selectedWeight = weights[0];

    //  Получаем текущий выбранный вариант для отображения остатка
    const currentVariant = window.getSelectedVariant();
    const stockCount = currentVariant ? Number(currentVariant.stock) : null;

    let html = "";

    if (flavors.length > 0) {
      html += `<div class="variant-group">
        <label>Вкус</label>
        <div class="variant-options">
          ${flavors.map(f => `
            <button type="button" class="variant-btn ${f === state.selectedFlavor ? "active" : ""}"
                    data-flavor="${escapeAttr(f)}">${escapeHtmlSafe(f)}</button>
          `).join("")}
        </div>
      </div>`;
    }

    if (weights.length > 0) {
      html += `<div class="variant-group">
        <label>Граммовка</label>
        <div class="variant-options">
          ${weights.map(w => `
            <button type="button" class="variant-btn ${w === state.selectedWeight ? "active" : ""}"
                    data-weight="${w}">${w} г</button>
          `).join("")}
        </div>
      </div>`;
    }

    //  НОВОЕ: показываем остаток на складе под кнопками
    if (stockCount !== null) {
      let stockHtml = "";
      if (stockCount <= 0) {
        stockHtml = `<div class="variant-stock variant-stock--empty">Нет в наличии</div>`;
      } else if (stockCount <= 5) {
        stockHtml = `<div class="variant-stock variant-stock--low">Осталось: ${stockCount} шт.</div>`;
      } else {
        stockHtml = `<div class="variant-stock variant-stock--ok">В наличии: ${stockCount} шт.</div>`;
      }
      html += stockHtml;
    }

    container.innerHTML = html;

    // Обработчики кнопок вкуса
    container.querySelectorAll("[data-flavor]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.selectedFlavor = btn.dataset.flavor;
        renderVariantControls();
        updatePriceFromVariant();
      });
    });

    // Обработчики кнопок граммовки
    container.querySelectorAll("[data-weight]").forEach(btn => {
      btn.addEventListener("click", () => {
        state.selectedWeight = Number(btn.dataset.weight);
        renderVariantControls();
        updatePriceFromVariant();
      });
    });

    updatePriceFromVariant();
  }

  // ── Получить выбранный вариант ─────────────────────────
  window.getSelectedVariant = function () {
    const state = window._variantState;
    if (state.variants.length === 0) return null;

    // ✅ ИСПРАВЛЕНИЕ: ищем по тем полям которые реально есть у этого товара.
    // Если у товара нет вкусов — не фильтруем по вкусу, и наоборот.
    const flavors = [...new Set(state.variants.map(v => v.flavor).filter(Boolean))];
    const weights = [...new Set(state.variants.map(v => v.weight_g).filter(Boolean))];

    const hasFlavors = flavors.length > 0;
    const hasWeights = weights.length > 0;

    return state.variants.find(v => {
      const flavorMatch = !hasFlavors || v.flavor === state.selectedFlavor;
      const weightMatch = !hasWeights || v.weight_g === state.selectedWeight;
      return flavorMatch && weightMatch;
    }) || null;
  };

function updatePriceFromVariant() {
  const variant = window.getSelectedVariant();

  const addBtn = document.getElementById("modal-add-to-cart");
  const priceEl = document.getElementById("modal-price");
  const stockEl = document.querySelector(".variant-stock");

  //  Если вариант не найден (нет совпадения вкус+граммовка) — блокируем
  if (!variant) {
    if (addBtn) {
      addBtn.disabled = true;
      addBtn.textContent = "Нет в наличии";
    }
    if (stockEl) {
      stockEl.className = "variant-stock variant-stock--empty";
      stockEl.textContent = "✕ Нет в наличии";
    }
    return;
  }

  // Меняем глобальную цену модалки
  if (typeof window.currentModalPrice !== "undefined") {
    window.currentModalPrice = Number(variant.price) || 0;
  }

  if (priceEl) priceEl.textContent = `${Number(variant.price).toLocaleString("ru-RU")} ₸`;

  if (addBtn) {
    if (variant.stock < 1) {
      addBtn.disabled = true;
      addBtn.textContent = "Нет в наличии";
    } else {
      addBtn.disabled = false;
      addBtn.textContent = "В корзину";
    }
  }

  if (typeof window.updateModalPriceUI === "function") {
    window.updateModalPriceUI();
  }
}

  // ── Утилиты ─────────────────────────────────────────────
  function escapeHtmlSafe(str) {
    return String(str).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }
  function escapeAttr(str) {
    return String(str).replace(/"/g, "&quot;");
  }
})();

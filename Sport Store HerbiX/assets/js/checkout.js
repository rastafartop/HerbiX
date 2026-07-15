// ===== checkout.js =====
// Логика оформления заказа: 3-шаговый stepper
// Зависимости: window._sb (supabase), window.cart, window.showToast

(function () {
  // ─── Константы ──────────────────────────────────────────────
  const STEPS = ["contacts", "delivery", "confirm"];
  let currentStep = 0;
  let orderData = {
    name: "",
    phone: "",
    email: "",
    deliveryType: "courier", // courier | pickup
    city: "",
    address: "",
    comment: "",
  };

  // ─── Инициализация ──────────────────────────────────────────
  function init() {
    injectHTML();
    injectStyles();
    bindEvents();
  }

  // ─── HTML разметка модального окна ─────────────────────────
  function injectHTML() {
    const el = document.createElement("div");
    el.id = "checkout-overlay";
    el.className = "co-overlay";
    el.innerHTML = `
      <div class="co-modal" role="dialog" aria-modal="true" aria-label="Оформление заказа">
        <button class="co-close" id="co-close-btn" aria-label="Закрыть">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <!-- Stepper -->
        <div class="co-stepper">
          <div class="co-step active" data-step="0">
            <div class="co-step-dot"><span>1</span></div>
            <div class="co-step-label">Контакты</div>
          </div>
          <div class="co-step-line"></div>
          <div class="co-step" data-step="1">
            <div class="co-step-dot"><span>2</span></div>
            <div class="co-step-label">Доставка</div>
          </div>
          <div class="co-step-line"></div>
          <div class="co-step" data-step="2">
            <div class="co-step-dot"><span>3</span></div>
            <div class="co-step-label">Подтверждение</div>
          </div>
        </div>

        <!-- Шаги -->
        <div class="co-body">

          <!-- ШАГ 1: Контакты -->
          <div class="co-pane active" id="co-pane-0">
            <h3 class="co-pane-title">Контактные данные</h3>
            <div class="co-field">
              <label for="co-name">Имя <span class="co-req">*</span></label>
              <input type="text" id="co-name" placeholder="Как к вам обращаться" autocomplete="name" />
            </div>
            <div class="co-field">
              <label for="co-phone">Телефон <span class="co-req">*</span></label>
              <input type="tel" id="co-phone" placeholder="+7 (___) ___-__-__" autocomplete="tel" />
            </div>
            <div class="co-field">
              <label for="co-email">Email <span class="co-req">*</span></label>
              <input type="email" id="co-email" placeholder="you@example.com" autocomplete="email" />
            </div>
            <div class="co-field">
              <label for="co-comment">Комментарий к заказу</label>
              <textarea id="co-comment" rows="2" placeholder="Пожелания, время звонка..."></textarea>
            </div>
          </div>

          <!-- ШАГ 2: Доставка -->
          <div class="co-pane" id="co-pane-1">
            <h3 class="co-pane-title">Способ получения</h3>
            <div class="co-delivery-tabs">
              <button class="co-delivery-tab active" data-type="courier">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
                Курьер
              </button>
              <button class="co-delivery-tab" data-type="pickup">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                Самовывоз
              </button>
            </div>

            <div id="co-courier-fields">
              <div class="co-field">
                <label for="co-city">Город <span class="co-req">*</span></label>
                <input type="text" id="co-city" placeholder="Алматы" autocomplete="address-level2" />
              </div>
              <div class="co-field">
                <label for="co-address">Адрес <span class="co-req">*</span></label>
                <input type="text" id="co-address" placeholder="Улица, дом, квартира" autocomplete="street-address" />
              </div>
              <div class="co-delivery-info">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Доставка по Алматы 1–2 дня, по Казахстану 3–7 дней
              </div>
            </div>

            <div id="co-pickup-fields" style="display:none">
              <div class="co-pickup-address">
                <div class="co-pickup-icon">📍</div>
                <div>
                  <strong>Пункт выдачи HerbiX</strong>
                  <p>г. Алматы, ул. Абая, 1<br>Ежедневно с 10:00 до 20:00</p>
                </div>
              </div>
              <div class="co-delivery-info co-delivery-info--ok">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
                Бесплатно, готов в течение 1 рабочего дня
              </div>
            </div>
          </div>

          <!-- ШАГ 3: Подтверждение -->
          <div class="co-pane" id="co-pane-2">
            <h3 class="co-pane-title">Ваш заказ</h3>
            <div class="co-summary" id="co-summary"></div>
            <div class="co-total-row" id="co-total-row"></div>
          </div>

        </div>

        <!-- Футер: навигация -->
        <div class="co-footer">
          <button class="co-btn-back" id="co-btn-back" style="display:none">← Назад</button>
          <div class="co-footer-right">
            <button class="co-btn-next" id="co-btn-next">Далее →</button>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(el);
  }

  // ─── Стили (инжектируем programmatically) ──────────────────
  function injectStyles() {
    if (document.getElementById("co-styles")) return;
    const s = document.createElement("style");
    s.id = "co-styles";
    s.textContent = `
      /* ── Overlay ── */
      .co-overlay {
        display: none;
        position: fixed;
        inset: 0;
        background: rgba(10, 20, 12, 0.55);
        backdrop-filter: blur(4px);
        z-index: 1100;
        align-items: center;
        justify-content: center;
        padding: 16px;
      }
      .co-overlay.open { display: flex; }

      /* ── Modal ── */
      .co-modal {
        background: #ffffff;
        border-radius: 24px;
        width: min(540px, 100%);
        max-height: 92vh;
        overflow-y: auto;
        padding: 32px 36px 28px;
        position: relative;
        box-shadow: 0 32px 80px rgba(0,0,0,0.2), 0 0 0 1px rgba(58,110,79,0.08);
        animation: coSlideIn 0.35s cubic-bezier(0.22, 1, 0.36, 1) both;
      }
      @keyframes coSlideIn {
        from { opacity: 0; transform: translateY(28px) scale(0.97); }
        to   { opacity: 1; transform: translateY(0) scale(1); }
      }

      /* ── Close ── */
      .co-close {
        position: absolute;
        top: 16px; right: 16px;
        width: 34px; height: 34px;
        border-radius: 50%;
        border: none;
        background: #f2f5f2;
        color: #4b6450;
        cursor: pointer;
        display: flex; align-items: center; justify-content: center;
        transition: background 0.15s, transform 0.15s;
      }
      .co-close:hover { background: #e0e8e0; transform: scale(1.08); }

      /* ── Stepper ── */
      .co-stepper {
        display: flex;
        align-items: center;
        justify-content: center;
        margin-bottom: 28px;
        gap: 0;
      }
      .co-step {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
      }
      .co-step-dot {
        width: 32px; height: 32px;
        border-radius: 50%;
        background: #e8ede8;
        border: 2px solid #d0dcd0;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.3s;
      }
      .co-step-dot span {
        font-size: 13px;
        font-weight: 700;
        color: #8fa88f;
        transition: color 0.3s;
      }
      .co-step-label {
        font-size: 11px;
        font-weight: 600;
        color: #b0c0b0;
        letter-spacing: 0.3px;
        transition: color 0.3s;
        white-space: nowrap;
      }
      .co-step.active .co-step-dot {
        background: #3a6e4f;
        border-color: #3a6e4f;
        box-shadow: 0 0 0 4px rgba(58,110,79,0.15);
      }
      .co-step.active .co-step-dot span { color: #fff; }
      .co-step.active .co-step-label { color: #3a6e4f; }
      .co-step.done .co-step-dot {
        background: #e8f5ee;
        border-color: #3a6e4f;
      }
      .co-step.done .co-step-dot span { color: #3a6e4f; }
      .co-step.done .co-step-label { color: #3a6e4f; }
      .co-step-line {
        flex: 1;
        height: 2px;
        background: #e0e8e0;
        margin: 0 8px;
        margin-bottom: 20px;
        min-width: 40px;
        transition: background 0.3s;
        border-radius: 2px;
      }
      .co-step-line.done { background: #3a6e4f; }

      /* ── Pane ── */
      .co-pane { display: none; }
      .co-pane.active {
        display: block;
        animation: coPaneIn 0.25s ease both;
      }
      @keyframes coPaneIn {
        from { opacity: 0; transform: translateX(12px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      .co-pane-title {
        font-size: 18px;
        font-weight: 800;
        color: #111d11;
        margin: 0 0 20px;
        padding-bottom: 14px;
        border-bottom: 1.5px solid #edf3ef;
        display: flex; align-items: center; gap: 10px;
      }
      .co-pane-title::before {
        content: '';
        display: inline-block;
        width: 4px; height: 20px;
        background: linear-gradient(180deg, #3a6e4f 0%, #5ea576 100%);
        border-radius: 4px;
        flex-shrink: 0;
      }

      /* ── Fields ── */
      .co-field {
        margin-bottom: 16px;
      }
      .co-field label {
        display: block;
        font-size: 11.5px;
        font-weight: 700;
        color: #6a8f6a;
        margin-bottom: 6px;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      .co-req { color: #c0392b; }
      .co-field input,
      .co-field textarea {
        width: 100%;
        padding: 12px 14px;
        border: 1.5px solid #ddeae1;
        border-radius: 12px;
        font-size: 14.5px;
        color: #141f14;
        background: #fafcfa;
        transition: border-color 0.18s, box-shadow 0.18s;
        outline: none;
        box-sizing: border-box;
        font-family: inherit;
        resize: none;
      }
      .co-field input:focus,
      .co-field textarea:focus {
        border-color: #3a6e4f;
        background: #fff;
        box-shadow: 0 0 0 3.5px rgba(58,110,79,0.10);
      }
      .co-field input.error {
        border-color: #e05555;
        box-shadow: 0 0 0 3px rgba(224,85,85,0.12);
      }
      .co-field-error {
        font-size: 12px;
        color: #c0392b;
        margin-top: 5px;
        display: none;
      }
      .co-field-error.show { display: block; }

      /* ── Delivery tabs ── */
      .co-delivery-tabs {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
        margin-bottom: 20px;
      }
      .co-delivery-tab {
        padding: 14px 10px;
        border: 2px solid #ddeae1;
        border-radius: 14px;
        background: #fafcfa;
        color: #4b6450;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        transition: all 0.18s;
        font-family: inherit;
      }
      .co-delivery-tab:hover { border-color: #3a6e4f; background: #f5faf7; }
      .co-delivery-tab.active {
        border-color: #3a6e4f;
        background: linear-gradient(135deg, #e8f5ee 0%, #d8eedf 100%);
        color: #2d5840;
        box-shadow: inset 0 0 0 1px rgba(58,110,79,0.12), 0 2px 8px rgba(58,110,79,0.12);
      }
      .co-delivery-info {
        display: flex;
        align-items: flex-start;
        gap: 7px;
        font-size: 12.5px;
        color: #7a9a7a;
        background: #f4f8f5;
        padding: 10px 12px;
        border-radius: 10px;
        margin-top: 8px;
        line-height: 1.45;
      }
      .co-delivery-info--ok { color: #2e7d4f; background: #eaf5ee; }
      .co-pickup-address {
        display: flex;
        gap: 14px;
        padding: 16px;
        background: #f5faf7;
        border-radius: 14px;
        border: 1.5px solid #ddeae1;
        margin-bottom: 12px;
      }
      .co-pickup-icon { font-size: 28px; flex-shrink: 0; }
      .co-pickup-address strong { display: block; margin-bottom: 4px; font-size: 14px; color: #1a2e1a; }
      .co-pickup-address p { font-size: 13px; color: #5d7361; margin: 0; line-height: 1.5; }

      /* ── Summary ── */
      .co-summary {
        display: flex;
        flex-direction: column;
        gap: 10px;
        margin-bottom: 14px;
      }
      .co-summary-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 12px;
        background: #f8faf8;
        border-radius: 12px;
        border: 1px solid #edf3ef;
      }
      .co-summary-img {
        width: 44px; height: 44px;
        border-radius: 8px;
        object-fit: cover;
        flex-shrink: 0;
        background: #eee;
      }
      .co-summary-info { flex: 1; min-width: 0; }
      .co-summary-title {
        font-size: 13.5px;
        font-weight: 600;
        color: #1a2e1a;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .co-summary-meta { font-size: 12px; color: #7a9a7a; margin-top: 2px; }
      .co-summary-price {
        font-size: 14px;
        font-weight: 700;
        color: #3a6e4f;
        flex-shrink: 0;
      }

      .co-summary-details {
        background: #f5faf7;
        border-radius: 12px;
        padding: 14px 16px;
        border: 1px solid #e0ece5;
        font-size: 13px;
        margin-bottom: 14px;
      }
      .co-summary-details p {
        margin: 0 0 6px;
        color: #4b6450;
        display: flex; justify-content: space-between;
      }
      .co-summary-details p:last-child { margin-bottom: 0; }
      .co-summary-details p strong { color: #1a2e1a; }

      .co-total-row {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 14px 16px;
        background: #1a2e1a;
        border-radius: 14px;
        color: #fff;
      }
      .co-total-row span:first-child { font-size: 14px; opacity: 0.8; }
      .co-total-row span:last-child { font-size: 20px; font-weight: 800; }

      /* ── Footer ── */
      .co-footer {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 24px;
        padding-top: 20px;
        border-top: 1.5px solid #edf3ef;
        gap: 12px;
      }
      .co-footer-right { display: flex; gap: 10px; margin-left: auto; }
      .co-btn-back {
        padding: 13px 22px;
        border-radius: 12px;
        border: 1.5px solid #ddeae1;
        background: transparent;
        font-size: 14px;
        font-weight: 600;
        color: #4b6450;
        cursor: pointer;
        transition: all 0.15s;
        font-family: inherit;
      }
      .co-btn-back:hover { background: #f0f7f3; border-color: #3a6e4f; color: #2d5840; }
      .co-btn-next {
        padding: 13px 28px;
        border-radius: 12px;
        border: none;
        background: linear-gradient(135deg, #3a6e4f 0%, #4d8a65 100%);
        color: #fff;
        font-size: 14px;
        font-weight: 700;
        cursor: pointer;
        box-shadow: 0 2px 0 #2a5038, 0 4px 16px rgba(58,110,79,0.25);
        transition: transform 0.12s, box-shadow 0.12s;
        font-family: inherit;
        display: flex; align-items: center; gap: 8px;
      }
      .co-btn-next:hover {
        transform: translateY(-1px);
        box-shadow: 0 2px 0 #1f3e2c, 0 6px 20px rgba(58,110,79,0.32);
      }
      .co-btn-next:active { transform: translateY(1px); }
      .co-btn-next:disabled {
        opacity: 0.7; cursor: not-allowed; transform: none;
        box-shadow: 0 2px 0 #2a5038;
      }
      .co-spinner {
        width: 16px; height: 16px;
        border: 2px solid rgba(255,255,255,0.4);
        border-top-color: #fff;
        border-radius: 50%;
        animation: coSpin 0.7s linear infinite;
      }
      @keyframes coSpin { to { transform: rotate(360deg); } }

      /* ── Success state ── */
      .co-success {
        text-align: center;
        padding: 16px 0 8px;
        animation: coPaneIn 0.3s ease both;
      }
      .co-success-icon {
        width: 72px; height: 72px;
        border-radius: 50%;
        background: linear-gradient(135deg, #e8f5ee 0%, #d4ecdf 100%);
        display: flex; align-items: center; justify-content: center;
        margin: 0 auto 20px;
        box-shadow: 0 0 0 8px rgba(58,110,79,0.08);
      }
      .co-success-icon svg { stroke: #3a6e4f; }
      .co-success h2 { font-size: 22px; color: #111d11; margin: 0 0 10px; }
      .co-success p { font-size: 14px; color: #5d7361; line-height: 1.6; margin: 0 0 24px; }
      .co-success-order-num {
        display: inline-block;
        background: #e8f5ee;
        color: #2d5840;
        font-size: 13px;
        font-weight: 700;
        padding: 8px 18px;
        border-radius: 999px;
        letter-spacing: 0.5px;
        margin-bottom: 24px;
      }

      /* ── Mobile ── */
      @media (max-width: 560px) {
        .co-modal { padding: 24px 20px 20px; border-radius: 20px; }
        .co-step-line { min-width: 24px; }
        .co-pane-title { font-size: 16px; }
        .co-delivery-tabs { grid-template-columns: 1fr 1fr; }
      }
    `;
    document.head.appendChild(s);
  }

  // ─── Bind Events ────────────────────────────────────────────
  function bindEvents() {
    document.getElementById("co-close-btn").addEventListener("click", closeCheckout);
    document.getElementById("checkout-overlay").addEventListener("click", (e) => {
      if (e.target.id === "checkout-overlay") closeCheckout();
    });
    document.getElementById("co-btn-back").addEventListener("click", goBack);
    document.getElementById("co-btn-next").addEventListener("click", goNext);

    // Delivery tabs
    document.querySelectorAll(".co-delivery-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        document.querySelectorAll(".co-delivery-tab").forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        orderData.deliveryType = tab.dataset.type;
        toggleDeliveryFields();
      });
    });

    // Телефон: авто-форматирование
    document.getElementById("co-phone").addEventListener("input", formatPhoneInput);

    // ESC
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") closeCheckout();
    });
  }

  function toggleDeliveryFields() {
    const isCourier = orderData.deliveryType === "courier";
    document.getElementById("co-courier-fields").style.display = isCourier ? "" : "none";
    document.getElementById("co-pickup-fields").style.display = isCourier ? "none" : "";
  }

  function formatPhoneInput(e) {
    let val = e.target.value.replace(/\D/g, "");
    if (val.startsWith("8")) val = "7" + val.slice(1);
    if (!val.startsWith("7") && val.length > 0) val = "7" + val;
    let formatted = "+7";
    if (val.length > 1) formatted += " (" + val.slice(1, 4);
    if (val.length >= 4) formatted += ") " + val.slice(4, 7);
    if (val.length >= 7) formatted += "-" + val.slice(7, 9);
    if (val.length >= 9) formatted += "-" + val.slice(9, 11);
    e.target.value = formatted;
  }

  // ─── Navigation ─────────────────────────────────────────────
  async function goNext() {
    if (currentStep === 0) {
      if (!validateContacts()) return;
      collectContacts();
      goToStep(1);
    } else if (currentStep === 1) {
      if (!validateDelivery()) return;
      collectDelivery();
      buildSummary();
      goToStep(2);
    } else if (currentStep === 2) {
      await submitOrder();
    }
  }

  function goBack() {
    if (currentStep > 0) goToStep(currentStep - 1);
  }

  function goToStep(step) {
    // Текущий pane out
    document.getElementById(`co-pane-${currentStep}`).classList.remove("active");

    // Stepper update
    const stepEls = document.querySelectorAll(".co-step");
    const lineEls = document.querySelectorAll(".co-step-line");

    stepEls[currentStep].classList.remove("active");
    if (step > currentStep) stepEls[currentStep].classList.add("done");
    else stepEls[currentStep].classList.remove("done");

    currentStep = step;
    stepEls[currentStep].classList.add("active");
    lineEls.forEach((line, i) => {
      line.classList.toggle("done", i < currentStep);
    });

    // New pane in
    document.getElementById(`co-pane-${currentStep}`).classList.add("active");

    // Back button
    document.getElementById("co-btn-back").style.display = currentStep > 0 ? "" : "none";

    // Next button label
    const nextBtn = document.getElementById("co-btn-next");
    if (currentStep === 2) {
      nextBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
        Подтвердить заказ
      `;
    } else {
      nextBtn.textContent = "Далее →";
    }
  }

  // ─── Validation ─────────────────────────────────────────────
  function validateContacts() {
    let valid = true;

    const name = document.getElementById("co-name").value.trim();
    const phone = document.getElementById("co-phone").value.trim();
    const email = document.getElementById("co-email").value.trim();

    if (!name) { setError("co-name", "Введите имя"); valid = false; }
    else clearError("co-name");

    const digitsOnly = phone.replace(/\D/g, "");
    if (digitsOnly.length < 11) { setError("co-phone", "Введите корректный номер"); valid = false; }
    else clearError("co-phone");

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("co-email", "Введите корректный email");
      valid = false;
    } else clearError("co-email");

    return valid;
  }

  function validateDelivery() {
    if (orderData.deliveryType === "pickup") return true;
    let valid = true;
    const city = document.getElementById("co-city").value.trim();
    const address = document.getElementById("co-address").value.trim();
    if (!city) { setError("co-city", "Введите город"); valid = false; }
    else clearError("co-city");
    if (!address) { setError("co-address", "Введите адрес"); valid = false; }
    else clearError("co-address");
    return valid;
  }

  function setError(inputId, message) {
    const input = document.getElementById(inputId);
    input.classList.add("error");
    let err = input.parentElement.querySelector(".co-field-error");
    if (!err) {
      err = document.createElement("div");
      err.className = "co-field-error";
      input.parentElement.appendChild(err);
    }
    err.textContent = message;
    err.classList.add("show");
  }

  function clearError(inputId) {
    const input = document.getElementById(inputId);
    input.classList.remove("error");
    const err = input.parentElement.querySelector(".co-field-error");
    if (err) err.classList.remove("show");
  }

  // ─── Data Collection ────────────────────────────────────────
  function collectContacts() {
    orderData.name = document.getElementById("co-name").value.trim();
    orderData.phone = document.getElementById("co-phone").value.trim();
    orderData.email = document.getElementById("co-email").value.trim();
    orderData.comment = document.getElementById("co-comment").value.trim();
  }

  function collectDelivery() {
    if (orderData.deliveryType === "courier") {
      orderData.city = document.getElementById("co-city").value.trim();
      orderData.address = document.getElementById("co-address").value.trim();
    } else {
      orderData.city = "Алматы";
      orderData.address = "Самовывоз: ул. Абая, 1";
    }
  }

  // ─── Build Summary (step 3) ─────────────────────────────────
  function buildSummary() {
    const cart = getCart();
    const summaryEl = document.getElementById("co-summary");
    const totalRowEl = document.getElementById("co-total-row");

    let total = 0;
    summaryEl.innerHTML = cart.map((item) => {
      const itemPrice = Number(item.price || 0);
      const itemTotal = itemPrice * item.quantity;
      total += itemTotal;

      const variantParts = [];
      if (item.flavor) variantParts.push(item.flavor);
      if (item.weight_g) variantParts.push(`${item.weight_g} г`);

      return `
        <div class="co-summary-item">
          <img class="co-summary-img" src="${item.image_url || 'assets/img/placeholder.png'}" alt="" onerror="this.style.display='none'">
          <div class="co-summary-info">
            <div class="co-summary-title">${escHtml(item.title || "")}</div>
            <div class="co-summary-meta">${variantParts.length ? variantParts.join(" · ") + " · " : ""}${item.quantity} шт.</div>
          </div>
          <div class="co-summary-price">${itemTotal.toLocaleString("ru-RU")} ₸</div>
        </div>
      `;
    }).join("");

    // Детали доставки
    const deliveryLabel = orderData.deliveryType === "courier"
      ? `Курьер, ${orderData.city}, ${orderData.address}`
      : "Самовывоз, ул. Абая, 1";

    summaryEl.innerHTML += `
      <div class="co-summary-details">
        <p><span>Получатель:</span> <strong>${escHtml(orderData.name)}</strong></p>
        <p><span>Телефон:</span> <strong>${escHtml(orderData.phone)}</strong></p>
        <p><span>Email:</span> <strong>${escHtml(orderData.email)}</strong></p>
        <p><span>Доставка:</span> <strong>${escHtml(deliveryLabel)}</strong></p>
        ${orderData.comment ? `<p><span>Комментарий:</span> <strong>${escHtml(orderData.comment)}</strong></p>` : ""}
      </div>
    `;

    totalRowEl.innerHTML = `
      <span>Итого к оплате</span>
      <span>${total.toLocaleString("ru-RU")} ₸</span>
    `;
  }

  // ─── Submit Order ────────────────────────────────────────────
  async function submitOrder() {
    const nextBtn = document.getElementById("co-btn-next");
    nextBtn.disabled = true;
    nextBtn.innerHTML = `<div class="co-spinner"></div> Оформляем...`;

    const cart = getCart();
    const total = cart.reduce((sum, i) => sum + Number(i.price || 0) * i.quantity, 0);

    // Получаем user_id если авторизован
    let userId = null;
    try {
      const { data: { session } } = await window._sb.auth.getSession();
      if (session) userId = session.user.id;
    } catch (_) {}

    const orderPayload = {
      user_id: userId,
      customer_name: orderData.name,
      customer_phone: orderData.phone,
      customer_email: orderData.email,
      delivery_type: orderData.deliveryType,
      delivery_city: orderData.city,
      delivery_address: orderData.address,
      comment: orderData.comment || null,
      items: cart.map((i) => ({
        product_id: i.id,
        variant_id: i.variantId || null,
        title: i.title,
        flavor: i.flavor || null,
        weight_g: i.weight_g || null,
        price: Number(i.price),
        quantity: i.quantity,
        image_url: i.image_url || null,
      })),
      total_price: total,
      status: 'new'
    };

    try {
      const { data, error } = await window._sb
        .from("orders")
        .insert([orderPayload])
        .select("id")
        .single();

      if (error) throw error;

      const orderId = data?.id || "—";

      // ── Декремент остатков на складе ──────────────────────────
      // Декрементируем сток для ВСЕХ позиций корзины у которых есть variantId.
      // Если variantId = null — товар добавлен без варианта (нет записей в product_variants),
      // тогда декрементировать нечего.
      console.log("[checkout] Корзина перед декрементом:", JSON.stringify(cart.map(i => ({
        title: i.title, variantId: i.variantId, qty: i.quantity
      }))));

      const variantItems = cart.filter(i => i.variantId != null);
      console.log("[checkout] Товаров с variantId:", variantItems.length);

      if (variantItems.length > 0) {
        await decrementStock(variantItems);
      } else {
        console.warn("[checkout] variantId = null у всех товаров — декремент пропущен.");
        console.warn("[checkout] Проверь: загружались ли варианты до добавления в корзину?");
      }

      // ── Обновляем UI вариантов если модалка товара открыта ────
      // После декремента stock в БД — перезагружаем варианты текущего товара,
      // иначе пользователь видит старое значение "В наличии: 15 шт." до перезагрузки страницы
      const productModal = document.getElementById("product-modal");
      const isProductModalOpen = productModal && productModal.classList.contains("open");
      if (isProductModalOpen && window.currentModalProduct && typeof window.loadProductVariants === "function") {
        window.loadProductVariants(window.currentModalProduct.id);
      }

      // ── Сброс корзины ─────────────────────────────────────────
      clearCartAndUpdateUI();

      showSuccess(orderId);

    } catch (err) {
      console.error("Order error:", err);
      nextBtn.disabled = false;
      nextBtn.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg>
        Подтвердить заказ
      `;

      if (typeof window.showToast === "function") {
        window.showToast("Ошибка при оформлении заказа. Попробуйте позже.");
      }
    }
  }

  // ─── Декремент остатков на складе ───────────────────────────
  // ─── Декремент через SQL функцию с SECURITY DEFINER ────────
  // Прямой UPDATE через anon key заблокирован RLS.
  // Решение: вызываем RPC-функцию decrement_variant_stock,
  // которая выполняется с правами владельца БД (обходит RLS).
  // SQL для создания функции — см. комментарий ниже.
  //
  // CREATE OR REPLACE FUNCTION decrement_variant_stock(
  //   p_variant_id UUID,
  //   p_qty        INT
  // ) RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  //   UPDATE product_variants
  //   SET stock = GREATEST(stock - p_qty, 0)
  //   WHERE id = p_variant_id;
  // $$;
  async function decrementStock(variantItems) {
    // Группируем: { variantId -> суммарное кол-во }
    const grouped = {};
    variantItems.forEach(item => {
      grouped[String(item.variantId)] = (grouped[String(item.variantId)] || 0) + item.quantity;
    });

    console.log("[stock] Декремент через RPC:", grouped);

    const promises = Object.entries(grouped).map(async ([variantId, qty]) => {
      const { error } = await window._sb.rpc("decrement_variant_stock", {
        p_variant_id: variantId,   // UUID строка — не кастуем в Number
        p_qty:        qty,
      });

      if (error) {
        console.error(`[stock] RPC error для варианта ${variantId}:`, error.message);
      } else {
        console.log(`[stock] Вариант ${variantId} уменьшен на ${qty}`);
      }
    });

    await Promise.allSettled(promises);
  }

  // ─── Сброс корзины и обновление UI ──────────────────────────
  function clearCartAndUpdateUI() {
    // ✅ ИСПРАВЛЕНО (БАГ 5 & 6): Раньше код делал:
    //   localStorage.removeItem() + window.cart = [] + renderCart()
    // Но `cart` в app.js — локальная переменная, не window.cart.
    // window.cart = [] создавал новое свойство на window, не меняя app.js-переменную.
    // renderCart() затем читала старый незачищенный `cart` → корзина не очищалась.
    //
    // Теперь: если app.js загружен и экспортировал window.clearCart(), вызываем его.
    // Он атомарно: cart=[] → saveCartToStorage() → renderCart() — всё в правильном scope.
    if (typeof window.clearCart === "function") {
      window.clearCart();
      return;
    }

    // Fallback (если app.js не загружен, напр. на других страницах):
    // 1. Очищаем localStorage напрямую
    localStorage.removeItem("herbix_cart");

    // 2. Обновляем счётчик в шапке
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = "0";

    // 3. Если корзина открыта — показываем пустое состояние
    const cartItemsEl = document.getElementById("cart-items");
    if (cartItemsEl) cartItemsEl.innerHTML = "<p>Корзина пуста.</p>";
    const cartTotalEl = document.getElementById("cart-total");
    if (cartTotalEl) cartTotalEl.textContent = "0 ₸";
  }

  // ─── Success Screen ─────────────────────────────────────────
  function showSuccess(orderId) {
    const body = document.querySelector(".co-body");
    const stepper = document.querySelector(".co-stepper");
    const footer = document.querySelector(".co-footer");

    stepper.style.display = "none";
    footer.style.display = "none";

    body.innerHTML = `
      <div class="co-success">
        <div class="co-success-icon">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" stroke-dasharray="20" stroke-dashoffset="20" style="animation: coCheckDraw 0.5s 0.2s ease forwards;">
            </polyline>
          </svg>
        </div>
        <h2>Заказ оформлен!</h2>
        <p>Спасибо, <strong>${escHtml(orderData.name)}</strong>!<br>
        Мы свяжемся с вами по телефону <strong>${escHtml(orderData.phone)}</strong><br>в ближайшее время для подтверждения.</p>
        <div class="co-success-order-num">Заказ №&nbsp;${orderId}</div>
        <button class="co-btn-next" onclick="window._closeCheckout()" style="margin:0 auto;display:flex;">
          На главную
        </button>
      </div>
    `;

    // Анимация галочки
    const style = document.createElement("style");
    style.textContent = `@keyframes coCheckDraw { to { stroke-dashoffset: 0; } }`;
    document.head.appendChild(style);
  }

  // ─── Auth Modal (красивый попап "войдите") ──────────────────
  function showAuthModal() {
    // Удаляем старый если есть
    const old = document.getElementById("co-auth-modal");
    if (old) old.remove();

    const el = document.createElement("div");
    el.id = "co-auth-modal";
    el.style.cssText = `
      position:fixed;inset:0;z-index:1200;
      display:flex;align-items:center;justify-content:center;
      background:rgba(10,20,12,0.55);backdrop-filter:blur(6px);
      animation:coFadeIn 0.2s ease both;
    `;
    el.innerHTML = `
      <div style="
        background:#fff;border-radius:24px;
        padding:40px 36px 32px;width:min(400px,92vw);
        text-align:center;position:relative;
        box-shadow:0 32px 80px rgba(0,0,0,0.22),0 0 0 1px rgba(58,110,79,0.08);
        animation:coSlideIn 0.35s cubic-bezier(0.22,1,0.36,1) both;
      ">
        <button onclick="document.getElementById('co-auth-modal').remove();document.body.classList.remove('no-scroll');" style="
          position:absolute;top:14px;right:14px;
          width:32px;height:32px;border-radius:50%;border:none;
          background:#f2f5f2;color:#4b6450;cursor:pointer;
          display:flex;align-items:center;justify-content:center;font-size:18px;
        ">×</button>

        <div style="
          width:72px;height:72px;border-radius:50%;
          background:linear-gradient(135deg,#e8f5ee,#d4ecdf);
          display:flex;align-items:center;justify-content:center;
          margin:0 auto 20px;
          box-shadow:0 0 0 10px rgba(58,110,79,0.07);
        ">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#3a6e4f" stroke-width="2" stroke-linecap="round">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>

        <h2 style="margin:0 0 10px;font-size:20px;font-weight:800;color:#111d11;">Нужна авторизация</h2>
        <p style="margin:0 0 24px;font-size:14px;color:#5d7361;line-height:1.6;">
          Чтобы оформить заказ, сначала войдите в аккаунт или зарегистрируйтесь — это займёт меньше минуты.
        </p>

        <div style="display:flex;flex-direction:column;gap:10px;">
          <a href="auth.html" style="
            display:block;padding:13px 24px;border-radius:12px;
            background:linear-gradient(135deg,#3a6e4f,#4d8a65);
            color:#fff;font-size:14px;font-weight:700;text-decoration:none;
            box-shadow:0 2px 0 #2a5038,0 4px 16px rgba(58,110,79,0.25);
            transition:transform 0.12s;
          " onmouseover="this.style.transform='translateY(-1px)'" onmouseout="this.style.transform=''">
            Войти в аккаунт
          </a>
          <a href="auth.html#register" style="
            display:block;padding:12px 24px;border-radius:12px;
            border:1.5px solid #ddeae1;background:transparent;
            color:#3a6e4f;font-size:14px;font-weight:600;text-decoration:none;
            transition:background 0.15s;
          " onmouseover="this.style.background='#f0f7f3'" onmouseout="this.style.background=''">
            Зарегистрироваться
          </a>
        </div>
      </div>
    `;
    document.body.appendChild(el);
    document.body.classList.add("no-scroll");

    // Закрыть по клику на фон
    el.addEventListener("click", (e) => {
      if (e.target === el) {
        el.remove();
        document.body.classList.remove("no-scroll");
      }
    });
  }

  // ─── Open / Close ────────────────────────────────────────────
  async function openCheckout() {
    // Проверяем авторизацию
    const { data: { session } } = await window._sb.auth.getSession();
    if (!session) {
      showAuthModal();
      return;
    }

    const cart = getCart();
    if (!cart.length) {
      if (typeof window.showToast === "function") {
        window.showToast("Корзина пуста — добавьте товары");
      }
      return;
    }

    // ✅ ИСПРАВЛЕНО (БАГ 4): showSuccess() заменяет .co-body через innerHTML,
    // уничтожая все #co-pane-* элементы. При повторном открытии модалки
    // getElementById("co-pane-0") возвращал null → TypeError/crash.
    // Решение: если структура пэйнов разрушена — пересоздаём оверлей целиком.
    const needsRebuild = !document.getElementById("co-pane-0");
    if (needsRebuild) {
      const old = document.getElementById("checkout-overlay");
      if (old) old.remove();
      injectHTML();   // пересоздаём HTML модалки
      injectStyles(); // стили уже есть (idempotent guard), но безопасно вызвать
      bindEvents();   // переподвешиваем все обработчики
    }

    // Предзаполняем данные из профиля если есть
    prefillFromProfile();

    currentStep = 0;
    orderData = { name: "", phone: "", email: "", deliveryType: "courier", city: "", address: "", comment: "" };

    // Восстанавливаем stepper в начальное состояние
    document.querySelectorAll(".co-step").forEach((s) => s.classList.remove("active", "done"));
    document.querySelector(".co-step[data-step='0']").classList.add("active");
    document.querySelectorAll(".co-step-line").forEach((l) => l.classList.remove("done"));
    document.querySelectorAll(".co-pane").forEach((p) => p.classList.remove("active"));
    document.getElementById("co-pane-0").classList.add("active");

    // Восстанавливаем stepper и footer (showSuccess их скрывал через style.display)
    const stepper = document.querySelector(".co-stepper");
    const footer = document.querySelector(".co-footer");
    if (stepper) stepper.style.display = "";
    if (footer) footer.style.display = "";

    document.getElementById("co-btn-back").style.display = "none";
    document.getElementById("co-btn-next").textContent = "Далее →";
    document.getElementById("co-btn-next").disabled = false;

    document.getElementById("checkout-overlay").classList.add("open");
    document.body.classList.add("no-scroll");
  }

  async function prefillFromProfile() {
    try {
      const { data: { session } } = await window._sb.auth.getSession();
      if (!session) return;

      const { data } = await window._sb
        .from("profiles")
        .select("full_name, phone")
        .eq("id", session.user.id)
        .single();

      if (data?.full_name) document.getElementById("co-name").value = data.full_name;
      if (data?.phone) document.getElementById("co-phone").value = data.phone;
      document.getElementById("co-email").value = session.user.email || "";
    } catch (_) {}
  }

  function closeCheckout() {
    document.getElementById("checkout-overlay").classList.remove("open");
    document.body.classList.remove("no-scroll");
  }

  // ─── Helpers ────────────────────────────────────────────────
  function getCart() {
    try {
      return JSON.parse(localStorage.getItem("herbix_cart") || "[]");
    } catch { return []; }
  }

  function escHtml(str) {
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // ─── Public API ──────────────────────────────────────────────
  window.openCheckout = openCheckout;
  window._closeCheckout = () => {
    closeCheckout();
    // Обновляем счётчик корзины
    const badge = document.getElementById("cart-count");
    if (badge) badge.textContent = "0";
    // Закрываем панель корзины если открыта
    const cartModal = document.getElementById("cart-modal");
    if (cartModal) cartModal.classList.remove("open");
    document.body.classList.remove("no-scroll");
  };

  // ─── Авто-инициализация ──────────────────────────────────────
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();

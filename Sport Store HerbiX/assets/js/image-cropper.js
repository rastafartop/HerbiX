// ===== image-cropper.js =====
(function () {
  const style = document.createElement("style");
  style.textContent = `
    .cropper-overlay {
      display: none;
      position: fixed;
      inset: 0;
      background: rgba(0,0,0,0.85);
      z-index: 9999;
      align-items: center;
      justify-content: center;
    }
    .cropper-overlay.active { display: flex; }
    .cropper-modal {
      background: #1e1e1e;
      border-radius: 16px;
      padding: 24px;
      width: min(420px, 95vw);
      display: flex;
      flex-direction: column;
      gap: 16px;
      box-shadow: 0 24px 80px rgba(0,0,0,0.6);
    }
    .cropper-title {
      color: #fff;
      font-size: 17px;
      font-weight: 600;
      text-align: center;
      margin: 0;
    }
    .cropper-canvas-wrap {
      position: relative;
      width: 100%;
      aspect-ratio: 1;
      background: #111;
      border-radius: 12px;
      overflow: hidden;
      cursor: grab;
      user-select: none;
      touch-action: none;
    }
    .cropper-canvas-wrap:active { cursor: grabbing; }
    .cropper-canvas {
      position: absolute;
      top: 0; left: 0;
      transform-origin: 0 0;
      image-rendering: auto;
    }
    .cropper-circle-mask {
      position: absolute;
      inset: 0;
      pointer-events: none;
      width: 100%;
      height: 100%;
    }
    .cropper-zoom-wrap {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .cropper-zoom-wrap span {
      color: #aaa;
      font-size: 18px;
      line-height: 1;
      flex-shrink: 0;
    }
    .cropper-zoom-slider {
      flex: 1;
      -webkit-appearance: none;
      height: 4px;
      border-radius: 2px;
      background: #444;
      outline: none;
      cursor: pointer;
    }
    .cropper-zoom-slider::-webkit-slider-thumb {
      -webkit-appearance: none;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background: #4f9cf9;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(79,156,249,0.4);
    }
    .cropper-actions { display: flex; gap: 10px; }
    .cropper-btn {
      flex: 1;
      padding: 12px;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: opacity 0.15s;
    }
    .cropper-btn:active { opacity: 0.8; }
    .cropper-btn-cancel { background: #2e2e2e; color: #ccc; }
    .cropper-btn-apply { background: #4f9cf9; color: #fff; }
  `;
  document.head.appendChild(style);

  const overlay = document.createElement("div");
  overlay.className = "cropper-overlay";
  overlay.innerHTML = `
    <div class="cropper-modal">
      <p class="cropper-title">Выберите область фото</p>
      <div class="cropper-canvas-wrap" id="cropper-wrap">
        <canvas class="cropper-canvas" id="cropper-canvas"></canvas>
        <svg class="cropper-circle-mask" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <mask id="hole">
              <rect width="100" height="100" fill="white"/>
              <circle cx="50" cy="50" r="48" fill="black"/>
            </mask>
          </defs>
          <rect width="100" height="100" fill="rgba(0,0,0,0.55)" mask="url(#hole)"/>
          <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.5)" stroke-width="0.5"/>
        </svg>
      </div>
      <div class="cropper-zoom-wrap">
        <span>🔍</span>
        <input type="range" class="cropper-zoom-slider" id="cropper-zoom" min="1" max="3" step="0.01" value="1" />
      </div>
      <div class="cropper-actions">
        <button class="cropper-btn cropper-btn-cancel" id="cropper-cancel">Отмена</button>
        <button class="cropper-btn cropper-btn-apply" id="cropper-apply">Готово</button>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  const canvas = document.getElementById("cropper-canvas");
  const ctx = canvas.getContext("2d");
  const wrap = document.getElementById("cropper-wrap");
  const zoomSlider = document.getElementById("cropper-zoom");

  let img = new Image();
  let scale = 1;
  let minScale = 1;
  let offsetX = 0, offsetY = 0;
  let dragStartX, dragStartY, dragOffsetX, dragOffsetY;
  let isDragging = false;
  let onApplyCallback = null;
  let wrapSize = 0;

  function clampOffset() {
    const scaledW = img.naturalWidth * scale;
    const scaledH = img.naturalHeight * scale;
    offsetX = Math.min(0, Math.max(wrapSize - scaledW, offsetX));
    offsetY = Math.min(0, Math.max(wrapSize - scaledH, offsetY));
  }

  function draw() {
    const w = img.naturalWidth * scale;
    const h = img.naturalHeight * scale;
    canvas.width = w;
    canvas.height = h;
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(img, 0, 0, w, h);
    canvas.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
  }

  function initLayout() {
    // Берём размер после того как overlay уже показан
    wrapSize = wrap.offsetWidth;

    // Масштаб чтобы меньшая сторона = wrapSize (изображение заполняет круг)
    const shorter = Math.min(img.naturalWidth, img.naturalHeight);
    minScale = wrapSize / shorter;
    scale = minScale;

    zoomSlider.min = minScale;
    zoomSlider.max = minScale * 3;
    zoomSlider.step = minScale * 0.01;
    zoomSlider.value = minScale;

    // Центрируем изображение
    offsetX = (wrapSize - img.naturalWidth * scale) / 2;
    offsetY = (wrapSize - img.naturalHeight * scale) / 2;

    draw();
  }

  function openCropper(src, callback) {
    onApplyCallback = callback;

    img = new Image();
    img.onload = () => {
      overlay.classList.add("active");
      // Два rAF — ждём пока браузер отрендерит overlay и посчитает размеры
      requestAnimationFrame(() => requestAnimationFrame(initLayout));
    };
    img.crossOrigin = "anonymous";
    img.src = src;
  }

  // Зум слайдер
  zoomSlider.addEventListener("input", () => {
    const newScale = parseFloat(zoomSlider.value);
    const cx = wrapSize / 2;
    const cy = wrapSize / 2;
    offsetX = cx - (cx - offsetX) * (newScale / scale);
    offsetY = cy - (cy - offsetY) * (newScale / scale);
    scale = newScale;
    clampOffset();
    draw();
  });

  // Drag мышью
  wrap.addEventListener("mousedown", (e) => {
    isDragging = true;
    dragStartX = e.clientX;
    dragStartY = e.clientY;
    dragOffsetX = offsetX;
    dragOffsetY = offsetY;
  });
  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    offsetX = dragOffsetX + (e.clientX - dragStartX);
    offsetY = dragOffsetY + (e.clientY - dragStartY);
    clampOffset();
    draw();
  });
  window.addEventListener("mouseup", () => { isDragging = false; });

  // Touch
  let lastTouchDist = null;
  wrap.addEventListener("touchstart", (e) => {
    if (e.touches.length === 1) {
      isDragging = true;
      dragStartX = e.touches[0].clientX;
      dragStartY = e.touches[0].clientY;
      dragOffsetX = offsetX;
      dragOffsetY = offsetY;
    }
    if (e.touches.length === 2) {
      isDragging = false;
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist = Math.hypot(dx, dy);
    }
  }, { passive: true });

  wrap.addEventListener("touchmove", (e) => {
    if (e.touches.length === 1 && isDragging) {
      offsetX = dragOffsetX + (e.touches[0].clientX - dragStartX);
      offsetY = dragOffsetY + (e.touches[0].clientY - dragStartY);
      clampOffset();
      draw();
    }
    if (e.touches.length === 2 && lastTouchDist) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const newScale = Math.min(
        parseFloat(zoomSlider.max),
        Math.max(minScale, scale * (dist / lastTouchDist))
      );
      const cx = wrapSize / 2;
      const cy = wrapSize / 2;
      offsetX = cx - (cx - offsetX) * (newScale / scale);
      offsetY = cy - (cy - offsetY) * (newScale / scale);
      scale = newScale;
      zoomSlider.value = scale;
      lastTouchDist = dist;
      clampOffset();
      draw();
    }
  }, { passive: true });

  wrap.addEventListener("touchend", () => { isDragging = false; lastTouchDist = null; });

  // Колесо мыши
  wrap.addEventListener("wheel", (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.05 : 0.05;
    const newScale = Math.min(
      parseFloat(zoomSlider.max),
      Math.max(minScale, scale + delta * scale)
    );
    const cx = wrapSize / 2;
    const cy = wrapSize / 2;
    offsetX = cx - (cx - offsetX) * (newScale / scale);
    offsetY = cy - (cy - offsetY) * (newScale / scale);
    scale = newScale;
    zoomSlider.value = scale;
    clampOffset();
    draw();
  }, { passive: false });

  // Отмена
  document.getElementById("cropper-cancel").addEventListener("click", () => {
    overlay.classList.remove("active");
  });

  // Готово — вырезаем круг 400x400 и отдаём blob
  document.getElementById("cropper-apply").addEventListener("click", () => {
    const size = 400;
    const out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    const octx = out.getContext("2d");

    octx.beginPath();
    octx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    octx.closePath();
    octx.clip();

    // Координаты исходника
    const srcX = -offsetX / scale;
    const srcY = -offsetY / scale;
    const srcSize = wrapSize / scale;

    octx.drawImage(img, srcX, srcY, srcSize, srcSize, 0, 0, size, size);

    out.toBlob((blob) => {
      overlay.classList.remove("active");
      if (onApplyCallback) onApplyCallback(blob);
    }, "image/jpeg", 0.92);
  });

  window.openAvatarCropper = openCropper;
})();

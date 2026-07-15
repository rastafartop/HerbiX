// ===== profile.js =====
// Используем глобальный клиент если уже создан (из user-nav.js), иначе создаём.
// ВАЖНО: ключ должен быть идентичен ключу в user-nav.js / supabase-client.js.
if (!window._sb) {
  window._sb = supabase.createClient(
    "https://qjytxxkztdeyxygoiybi.supabase.co",
    // ✅ ИСПРАВЛЕНО: был неправильный символ на позиции 86 ('H' вместо 'X' → "dleHh5" → "dleXh5")
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeXR4eGt6dGRleXh5Z29peWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM3NjcsImV4cCI6MjA4OTk5OTc2N30.afZ40Kl6SXjTt7DGtIFDyKWPsYxaC75_jL1X79PonpQ"
  );
}
const db = window._sb;

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  setTimeout(() => t.classList.remove("show"), 2500);
}

function showStatus(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className = `profile-save-status show ${type}`;
  setTimeout(() => el.classList.remove("show"), 3000);
}

function setAvatar(name, avatarUrl) {
  const img = document.getElementById("avatar-img");
  const initials = document.getElementById("avatar-initials");
  if (avatarUrl) {
    img.src = avatarUrl + "?t=" + Date.now();
    img.style.display = "block";
    initials.style.display = "none";
    img.onerror = () => {
      img.style.display = "none";
      initials.style.display = "block";
    };
  } else {
    const letters = (name || "?").trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);
    initials.textContent = letters;
    img.style.display = "none";
    initials.style.display = "block";
  }
}

function formatPhone(raw) {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "7") {
    return `+7 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7, 9)}-${digits.slice(9, 11)}`;
  }
  return raw;
}

function initNav() {
  const btns = document.querySelectorAll(".profile-nav-btn[data-section]");
  btns.forEach(btn => {
    btn.addEventListener("click", () => {
      btns.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      document.querySelectorAll(".profile-section").forEach(s => s.classList.remove("active"));
      document.getElementById("section-" + btn.dataset.section)?.classList.add("active");
    });
  });
}

function initPasswordToggles() {
  document.querySelectorAll(".toggle-password").forEach(btn => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      input.type = input.type === "password" ? "text" : "password";
      btn.textContent = input.type === "password" ? "👁" : "🙈";
    });
  });
}

async function loadProfile(user) {
  const metaName = user.user_metadata?.full_name || "";
  document.getElementById("field-name").value = metaName;
  document.getElementById("field-email").value = user.email;
  document.getElementById("sidebar-email").textContent = user.email;
  document.getElementById("sidebar-name").textContent = metaName || user.email.split("@")[0];

  const { data, error } = await db
    .from("profiles")
    .select("full_name, phone, avatar_url")
    .eq("id", user.id)
    .single();

  if (error) {
    console.warn("Profile load:", error);
    setAvatar(metaName || user.email.split("@")[0], null);
    return;
  }

  const name = data.full_name || metaName || "";
  document.getElementById("field-name").value = name;
  document.getElementById("field-phone").value = formatPhone(data.phone);
  document.getElementById("sidebar-name").textContent = name || user.email.split("@")[0];
  setAvatar(name || user.email.split("@")[0], data.avatar_url || null);
}

async function saveInfo(userId) {
  const name = document.getElementById("field-name").value.trim();
  const phone = document.getElementById("field-phone").value.trim();
  const btn = document.getElementById("save-info-btn");
  btn.disabled = true;
  btn.textContent = "Сохраняем...";

  const { error: dbError } = await db
    .from("profiles")
    .upsert({ id: userId, full_name: name || null, phone: phone || null });

  await db.auth.updateUser({ data: { full_name: name || null } });

  btn.disabled = false;
  btn.textContent = "Сохранить изменения";

  if (dbError) { showStatus("save-info-status", "Ошибка сохранения", "error"); return; }

  document.getElementById("sidebar-name").textContent = name || "Пользователь";
  showStatus("save-info-status", "✓ Сохранено", "success");
  showToast("Данные обновлены!");
}

async function savePassword() {
  const p1 = document.getElementById("field-new-password").value;
  const p2 = document.getElementById("field-confirm-password").value;

  if (!p1 || !p2) { showStatus("save-password-status", "Заполните оба поля", "error"); return; }
  if (p1.length < 6) { showStatus("save-password-status", "Минимум 6 символов", "error"); return; }
  if (p1 !== p2) { showStatus("save-password-status", "Пароли не совпадают", "error"); return; }

  const btn = document.getElementById("save-password-btn");
  btn.disabled = true;
  btn.textContent = "Меняем...";

  const { error } = await db.auth.updateUser({ password: p1 });

  btn.disabled = false;
  btn.textContent = "Изменить пароль";

  if (error) { showStatus("save-password-status", error.message || "Ошибка", "error"); return; }

  document.getElementById("field-new-password").value = "";
  document.getElementById("field-confirm-password").value = "";
  showStatus("save-password-status", "✓ Пароль изменён", "success");
  showToast("Пароль успешно изменён!");
}

async function uploadAvatar(file, userId, ext = "jpg") {
  const avatarWrap = document.querySelector(".profile-avatar-wrap");
  const loader = document.createElement("div");
  loader.className = "avatar-upload-loading";
  loader.textContent = "...";
  avatarWrap.appendChild(loader);

  const ext2 = file.name ? file.name.split(".").pop() : ext;

  // Используем timestamp в имени файла — это гарантированно сбивает кеш CDN
  const ts = Date.now();
  const newPath = `${userId}/avatar_${ts}.${ext2}`;

  // Удаляем все старые аватары этого пользователя
  const { data: existingFiles } = await db.storage.from("avatars").list(userId);
  if (existingFiles && existingFiles.length > 0) {
    const oldPaths = existingFiles.map(f => `${userId}/${f.name}`);
    await db.storage.from("avatars").remove(oldPaths);
  }

  const { error: uploadError } = await db.storage
    .from("avatars")
    .upload(newPath, file, { upsert: false, contentType: file.type });

  loader.remove();

  if (uploadError) { showToast("Ошибка загрузки фото"); console.error(uploadError); return; }

  const { data: urlData } = db.storage.from("avatars").getPublicUrl(newPath);
  // Сохраняем новый URL (уже уникальный — кеш браузера не проблема)
  const freshUrl = urlData.publicUrl;
  await db.from("profiles").upsert({ id: userId, avatar_url: freshUrl });

  // Получаем актуальное имя для инициалов
  const currentName = document.getElementById("sidebar-name").textContent || "";
  setAvatar(currentName, freshUrl);
  showToast("Фото обновлено!");
}

document.addEventListener("DOMContentLoaded", async () => {
  const { data: { session } } = await db.auth.getSession();
  if (!session) { window.location.href = "auth.html"; return; }

  const user = session.user;
  initNav();
  initPasswordToggles();
  await loadProfile(user);

  document.getElementById("save-info-btn").addEventListener("click", () => saveInfo(user.id));
  document.getElementById("save-password-btn").addEventListener("click", savePassword);
  document.getElementById("avatar-input").addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 20 * 1024 * 1024) { showToast("Файл слишком большой (макс. 20 МБ)"); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      window.openAvatarCropper(ev.target.result, (blob) => {
        uploadAvatar(blob, user.id);
      });
    };
    reader.readAsDataURL(file);
    // Сбрасываем input чтобы можно было выбрать тот же файл снова
    e.target.value = "";
  });
  document.getElementById("logout-btn").addEventListener("click", async () => {
    await db.auth.signOut();
    window.location.href = "auth.html";
  });
});

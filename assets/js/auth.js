// ===== auth.js =====
// Используем глобальный клиент из user-nav.js
if (!window._sb) {
  window._sb = supabase.createClient(
    "https://qjytxxkztdeyxygoiybi.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeXR4eGt6dGRleXh5Z29peWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM3NjcsImV4cCI6MjA4OTk5OTc2N30.afZ40Kl6SXjTt7DGtIFDyKWPsYxaC75_jL1X79PonpQ"
  );
}
const db = window._sb;

function showToast(message) {
  const toast = document.getElementById("toast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add("show");
  setTimeout(() => toast.classList.remove("show"), 2500);
}

function setAuthMessage(text, type = "info") {
  const el = document.getElementById("auth-message");
  if (!el) return;
  el.textContent = text;
  el.className = `auth-message ${type}`;
}

function initTabs() {
  const tabs = document.querySelectorAll(".auth-tab");
  const slider = document.querySelector(".auth-tab-slider");
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");

  tabs.forEach((tab, index) => {
    tab.addEventListener("click", () => {
      tabs.forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      if (slider) slider.style.transform = `translateX(${index * 100}%)`;
      if (tab.dataset.tab === "login") {
        loginForm.classList.add("active");
        registerForm.classList.remove("active");
      } else {
        registerForm.classList.add("active");
        loginForm.classList.remove("active");
      }
      setAuthMessage("");
    });
  });
}

async function handleRegister(e) {
  e.preventDefault();
  setAuthMessage("");

  const name = document.getElementById("reg-name").value.trim();
  const email = document.getElementById("reg-email").value.trim();
  const password = document.getElementById("reg-password").value;
  const password2 = document.getElementById("reg-password-confirm").value;

  if (!email || !password || !password2) { setAuthMessage("Заполните все обязательные поля.", "error"); return; }
  if (password.length < 6) { setAuthMessage("Пароль должен быть не менее 6 символов.", "error"); return; }
  if (password !== password2) { setAuthMessage("Пароли не совпадают.", "error"); return; }

  setAuthMessage("Создаём аккаунт...", "info");

const { data, error } = await db.auth.signUp({
  email,
  password,
  options: {
    data: { full_name: name || null },
    emailRedirectTo: 'http://127.0.0.1:5500/confirm.html'
  },
});

  if (error) {
    setAuthMessage(error.message || "Ошибка регистрации.", "error");
    return;
  }

  if (data.user) {
    try {
      await db.from("profiles").insert({ id: data.user.id, full_name: name || null });
    } catch (err) {
      console.warn("Profile exception:", err);
    }
  }

  setAuthMessage("Вы успешно зарегистрированы!", "success");

  const popup = document.getElementById("success-popup");
  if (popup) {
    popup.classList.add("active");
    const closeBtn = document.getElementById("popup-close");
    if (closeBtn) closeBtn.onclick = () => { window.location.href = "index.html"; };
  } else {
    showToast("Регистрация успешна 🎉");
    setTimeout(() => { window.location.href = "index.html"; }, 1500);
  }
}

async function handleLogin(e) {
  e.preventDefault();
  setAuthMessage("");

  const email = document.getElementById("login-email").value.trim();
  const password = document.getElementById("login-password").value;

  if (!email || !password) { setAuthMessage("Введите e-mail и пароль.", "error"); return; }

  setAuthMessage("Проверяем данные...", "info");

  const { error } = await db.auth.signInWithPassword({ email, password });

  if (error) {
    setAuthMessage(error.message || "Ошибка входа.", "error");
    return;
  }

  setAuthMessage("Вход выполнен успешно!", "success");
  showToast("Добро пожаловать в HerbiX!");
  setTimeout(() => { window.location.href = "index.html"; }, 1200);
}

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  document.getElementById("register-form")?.addEventListener("submit", handleRegister);
  document.getElementById("login-form")?.addEventListener("submit", handleLogin);

  // Если в URL есть #register — сразу открываем вкладку регистрации
  if (window.location.hash === "#register") {
    const regTab = document.querySelector('.auth-tab[data-tab="register"]');
    if (regTab) regTab.click();
  }
});

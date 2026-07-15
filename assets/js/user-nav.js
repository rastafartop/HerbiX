// ===== user-nav.js =====
(async () => {
  // Используем глобальный клиент если уже создан, иначе создаём
  if (!window._sb) {
    window._sb = supabase.createClient(
      "https://qjytxxkztdeyxygoiybi.supabase.co",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFqeXR4eGt6dGRleXh5Z29peWJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0MjM3NjcsImV4cCI6MjA4OTk5OTc2N30.afZ40Kl6SXjTt7DGtIFDyKWPsYxaC75_jL1X79PonpQ"
    );
  }
  const db = window._sb;

  const { data: { session } } = await db.auth.getSession();
  if (!session) return;

  const user = session.user;
  let avatarUrl = null;

  try {
    const { data } = await db
      .from("profiles")
      .select("full_name, avatar_url")
      .eq("id", user.id)
      .single();
    if (data?.avatar_url) avatarUrl = data.avatar_url;
    if (data?.full_name) user.user_metadata.full_name = data.full_name;
  } catch (_) {}

  const name = user.user_metadata?.full_name || user.email.split("@")[0];
  const initials = name.trim().split(/\s+/).map(w => w[0]).join("").toUpperCase().slice(0, 2);

  const authLink = document.querySelector("a.auth-user");
  if (!authLink) return;

  const avatarHTML = avatarUrl
    ? `<img src="${avatarUrl}" class="user-avatar user-avatar--img" alt="${name}" />`
    : `<span class="user-avatar">${initials}</span>`;

  authLink.href = "profile.html";
  authLink.style.position = "relative";
  authLink.innerHTML = `
    ${avatarHTML}
    <span class="auth-user-text">${name}</span>
  `;
  authLink.title = "Вы вошли как " + user.email;

  const dropdown = document.createElement("div");
  dropdown.className = "user-dropdown";
  dropdown.innerHTML = `
    <a href="profile.html">👤 Редактор профиля</a>
    <a href="orders.html">📦 Мои заказы</a>
    <button id="nav-logout-btn">↩ Выйти</button>
  `;
  authLink.appendChild(dropdown);

  const avatarEl = authLink.querySelector(".user-avatar");
  avatarEl.style.cursor = "pointer";
  avatarEl.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    dropdown.classList.toggle("open");
  });

  const nameEl = authLink.querySelector(".auth-user-text");
  nameEl.style.cursor = "pointer";
  nameEl.addEventListener("click", (e) => {
    e.stopPropagation();
    window.location.href = "profile.html";
  });

  document.addEventListener("click", (e) => {
    if (!authLink.contains(e.target)) dropdown.classList.remove("open");
  });

  document.getElementById("nav-logout-btn").addEventListener("click", async (e) => {
    e.stopPropagation();
    await db.auth.signOut();
    window.location.href = "auth.html";
  });
})();

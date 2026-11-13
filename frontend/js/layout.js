// layout.js
// Builds the parts of the page that every signed-in page shares:
// the left sidebar, the top header, the theme switch, the notification bell and the user menu.
// Each page calls initLayout("dashboard.html") once at the start of its own JS file.

const THEME_KEY = "compliance-theme";
const SIDEBAR_KEY = "sidebar-collapsed";

// The menu items of the sidebar. The "roles" list says who can see the page.
const NAV_ITEMS = [
  { href: "dashboard.html", label: "Dashboard", icon: "grid", roles: ["admin", "compliance", "viewer"] },
  { href: "profile.html", label: "Profile", icon: "user", roles: ["admin", "compliance", "viewer"] },
  { href: "upload.html", label: "Upload Policy", icon: "upload", roles: ["admin", "compliance"] },
  { href: "rules.html", label: "Rules", icon: "scroll", roles: ["admin", "compliance"] },
  { href: "ask-policy.html", label: "Ask policy", icon: "message", roles: ["admin", "compliance"] },
  { href: "policy-impact.html", label: "Policy Impact", icon: "compare", roles: ["admin", "compliance"] },
  { href: "violations.html", label: "Violations", icon: "alert", roles: ["admin", "compliance"] },
  { href: "review.html", label: "Review", icon: "clipboard", roles: ["admin", "compliance"] },
  { href: "reports.html", label: "Reports", icon: "chart", roles: ["admin", "compliance", "viewer"] },
  { href: "settings.html", label: "Settings", icon: "settings", roles: ["admin"] },
];

// Small inline icons (SVG) so we do not need any icon library.
const ICONS = {
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>',
  scroll: '<path d="M8 3H5a2 2 0 0 0-2 2v3"/><path d="M21 8V5a2 2 0 0 0-2-2h-3"/><path d="M3 16v3a2 2 0 0 0 2 2h3"/><path d="M16 21h3a2 2 0 0 0 2-2v-3"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
  message: '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z"/>',
  compare: '<circle cx="18" cy="18" r="3"/><circle cx="6" cy="6" r="3"/><path d="M13 6h3a2 2 0 0 1 2 2v7"/><path d="M11 18H8a2 2 0 0 1-2-2V9"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/><path d="m9 14 2 2 4-4"/>',
  chart: '<path d="M3 3v18h18"/><rect x="7" y="12" width="3" height="6"/><rect x="12" y="8" width="3" height="10"/><rect x="17" y="5" width="3" height="13"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>',
  menu: '<line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
  chevronDown: '<polyline points="6 9 12 15 18 9"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevronRight: '<polyline points="9 18 15 12 9 6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  check: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
};

// Returns one small SVG icon by name.
function icon(name) {
  const path = ICONS[name] || "";
  return (
    '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + path + "</svg>"
  );
}

// Applies the saved theme (dark or light) to the page.
function applyTheme(theme) {
  document.documentElement.classList.toggle("dark", theme === "dark");
  localStorage.setItem(THEME_KEY, theme);
}

// Switches between the dark and the light theme.
function toggleTheme() {
  const current = document.documentElement.classList.contains("dark") ? "dark" : "light";
  const next = current === "dark" ? "light" : "dark";
  applyTheme(next);
  const button = document.getElementById("theme-button");
  if (button) {
    button.innerHTML = icon(next === "dark" ? "sun" : "moon");
  }
}

// Returns the two letters shown in the round user picture.
function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map(function (part) {
      return part.charAt(0);
    })
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

// Writes the sidebar (logo + menu + collapse button) into the page.
function buildSidebar(activePage) {
  const holder = document.getElementById("sidebar");
  if (!holder) return;
  const role = getRole();

  let links = "";
  NAV_ITEMS.forEach(function (item) {
    if (item.roles.indexOf(role) === -1) return;
    const active = item.href === activePage ? " active" : "";
    links +=
      '<a class="nav-link' + active + '" href="' + item.href + '">' +
      '<span class="nav-icon">' + icon(item.icon) + "</span>" +
      '<span class="nav-label">' + item.label + "</span>" +
      "</a>";
  });

  holder.innerHTML =
    '<div class="sidebar-head">' +
    '<div class="logo-box">' + icon("shield") + "</div>" +
    '<div><p class="logo-title">AI Compliance</p><p class="logo-sub">Intelligence</p></div>' +
    "</div>" +
    '<nav class="sidebar-nav">' + links + "</nav>" +
    '<div class="sidebar-foot">' +
    '<button class="icon-btn" id="collapse-button" style="width:100%" title="Collapse sidebar">' +
    icon("chevronLeft") +
    "</button>" +
    "</div>";
}

// Writes the header (menu button, search, theme, bell, user menu) into the page.
function buildHeader(activePage) {
  const holder = document.getElementById("topbar");
  if (!holder) return;
  const user = getStoredUser() || { name: "User", role: "viewer" };

  holder.innerHTML =
    '<button class="icon-btn" id="menu-button" title="Menu">' + icon("menu") + "</button>" +
    '<form class="search-form" id="header-search">' +
    '<span class="search-icon">' + icon("search") + "</span>" +
    '<input type="search" id="header-search-input" placeholder="Search policies, rules, violations..." />' +
    "</form>" +
    '<div class="topbar-actions">' +
    '<button class="icon-btn" id="theme-button" title="Switch theme"></button>' +
    '<div class="dropdown">' +
    '<button class="icon-btn" id="bell-button" title="Notifications">' + icon("bell") + '<span class="badge-dot hidden" id="bell-count">0</span></button>' +
    '<div class="menu-panel notifications hidden" id="bell-panel">' +
    '<div class="menu-head"><h3>Notifications</h3><p class="text-small text-muted" id="bell-summary">Loading...</p></div>' +
    '<div class="notification-list" id="bell-list"></div>' +
    "</div>" +
    "</div>" +
    '<div class="dropdown">' +
    '<button class="icon-btn" id="user-button" title="Account">' +
    '<span class="logo-box" style="width:32px;height:32px;font-size:0.75rem">' + getInitials(user.name) + "</span>" +
    "</button>" +
    '<div class="menu-panel hidden" id="user-panel">' +
    '<div class="menu-head"><h3>' + escapeHtml(user.name) + "</h3>" +
    '<p class="text-small text-muted">' + roleLabel(user.role) + "</p></div>" +
    '<a class="menu-item" href="dashboard.html">Dashboard</a>' +
    '<a class="menu-item" href="profile.html">' + icon("user") + " Profile</a>" +
    (user.role === "admin" ? '<a class="menu-item" href="settings.html">' + icon("settings") + " Settings</a>" : "") +
    '<div class="menu-separator"></div>' +
    '<button class="menu-item danger" id="logout-button">' + icon("logout") + " Logout</button>" +
    "</div>" +
    "</div>" +
    "</div>";

  // Show the right icon for the theme that is active now.
  const darkNow = document.documentElement.classList.contains("dark");
  document.getElementById("theme-button").innerHTML = icon(darkNow ? "sun" : "moon");

  document.getElementById("theme-button").addEventListener("click", toggleTheme);
  document.getElementById("logout-button").addEventListener("click", signOut);

  // The search box sends the visitor to the search page.
  document.getElementById("header-search").addEventListener("submit", function (event) {
    event.preventDefault();
    const text = document.getElementById("header-search-input").value.trim();
    if (text) {
      window.location.href = "search.html?q=" + encodeURIComponent(text);
    }
  });

  setupUserMenu();
  setupNotificationBell();
}

// Opens and closes the user menu when the avatar is clicked.
function setupUserMenu() {
  const button = document.getElementById("user-button");
  const panel = document.getElementById("user-panel");
  button.addEventListener("click", function (event) {
    event.stopPropagation();
    panel.classList.toggle("hidden");
  });
  document.addEventListener("click", function (event) {
    if (!panel.contains(event.target)) {
      panel.classList.add("hidden");
    }
  });
}

// Loads the notifications and fills the bell menu.
async function setupNotificationBell() {
  const button = document.getElementById("bell-button");
  const panel = document.getElementById("bell-panel");
  const list = document.getElementById("bell-list");
  const summary = document.getElementById("bell-summary");
  const badge = document.getElementById("bell-count");

  button.addEventListener("click", function (event) {
    event.stopPropagation();
    panel.classList.toggle("hidden");
  });
  document.addEventListener("click", function (event) {
    if (!panel.contains(event.target)) {
      panel.classList.add("hidden");
    }
  });

  let notifications = [];
  try {
    notifications = await fetchNotifications();
  } catch (error) {
    summary.textContent = "Could not load notifications";
    return;
  }

  const unread = notifications.filter(function (item) {
    return !item.read;
  });

  if (unread.length > 0) {
    badge.textContent = unread.length > 9 ? "9+" : unread.length;
    badge.classList.remove("hidden");
  }
  summary.textContent = unread.length + " unread";

  if (notifications.length === 0) {
    list.innerHTML = '<p class="text-muted text-small" style="padding:1.5rem;text-align:center">No notifications</p>';
    return;
  }

  let html = "";
  notifications.forEach(function (item) {
    const iconName = item.type === "critical" ? "alert" : item.type === "warning" ? "alert" : item.type === "success" ? "check" : "info";
    const color = item.type === "critical" ? "text-danger" : item.type === "warning" ? "text-success" : item.type === "success" ? "text-success" : "";
    html +=
      '<button class="notification-item' + (item.read ? "" : " unread") + '" data-id="' + item.id + '">' +
      '<span class="' + color + '">' + icon(iconName) + "</span>" +
      "<span><strong>" + escapeHtml(item.title) + "</strong><br />" +
      '<span class="text-small text-muted">' + formatRelativeTime(item.created_at) + "</span></span>" +
      "</button>";
  });
  list.innerHTML = html;

  list.querySelectorAll(".notification-item").forEach(function (item) {
    item.addEventListener("click", async function () {
      const id = item.getAttribute("data-id");
      try {
        await markNotificationRead(id);
        badge.classList.add("hidden");
        item.classList.remove("unread");
        summary.textContent = "0 unread";
      } catch (error) {
        // If the backend refuses, we simply keep the badge.
      }
      panel.classList.add("hidden");
    });
  });
}

// Turns a date from the backend into a short text like "5 min ago".
function formatRelativeTime(iso) {
  if (!iso) return "";
  const date = new Date(iso);
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes < 1) return "Just now";
  if (minutes < 60) return minutes + " min ago";
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return hours + " hour" + (hours === 1 ? "" : "s") + " ago";
  const days = Math.floor(hours / 24);
  if (days < 7) return days + " day" + (days === 1 ? "" : "s") + " ago";
  return date.toLocaleDateString();
}

// Makes sure text from the backend cannot break the page (no HTML is inserted).
function escapeHtml(text) {
  return String(text === undefined || text === null ? "" : text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// Shows a small message in the corner of the screen.
function showToast(message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(function () {
    toast.remove();
  }, 3000);
}

// Sets up the sidebar collapse button and the mobile drawer.
function setupSidebarToggles() {
  const sidebar = document.getElementById("sidebar");
  const wrap = document.getElementById("main-wrap");
  const collapseButton = document.getElementById("collapse-button");
  const menuButton = document.getElementById("menu-button");

  // Remember if the sidebar was collapsed.
  if (localStorage.getItem(SIDEBAR_KEY) === "1") {
    sidebar.classList.add("collapsed");
    wrap.classList.add("sidebar-collapsed");
  }

  collapseButton.addEventListener("click", function () {
    sidebar.classList.toggle("collapsed");
    wrap.classList.toggle("sidebar-collapsed");
    localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains("collapsed") ? "1" : "0");
  });

  // On a phone the button opens and closes the sidebar like a drawer.
  menuButton.addEventListener("click", function () {
    if (window.innerWidth <= 720) {
      sidebar.classList.toggle("open");
    } else {
      sidebar.classList.toggle("collapsed");
      wrap.classList.toggle("sidebar-collapsed");
      localStorage.setItem(SIDEBAR_KEY, sidebar.classList.contains("collapsed") ? "1" : "0");
    }
  });
}

// Builds the shared layout of a page.
// activePage is the file name of the current page, for example "dashboard.html".
function initLayout(activePage) {
  // Use the theme the visitor chose before (dark by default).
  const savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(savedTheme === "light" ? "light" : "dark");

  buildSidebar(activePage);
  buildHeader(activePage);
  setupSidebarToggles();
}

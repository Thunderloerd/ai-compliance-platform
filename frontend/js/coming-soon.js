// coming-soon.js
// A simple page for the parts of the app that are not built yet.
// It still checks the login and the role, so nobody opens a page they may not see.

// The name of each page and the title we show on it.
const COMING_SOON_PAGES = {
  "policy-impact.html": "Policy Impact",
  "reports.html": "Reports",
  "ask-policy.html": "Ask policy",
  "search.html": "Search",
  "profile.html": "Profile",
  "settings.html": "Settings",
};

// Finds the name of this page from the address bar (for example "reports.html").
function getCurrentPageName() {
  const parts = window.location.pathname.split("/");
  const name = parts[parts.length - 1];
  return name || "index.html";
}

// Sets the page up: checks the login and the role, then shows the message.
function initComingSoon() {
  const pageName = getCurrentPageName();
  if (!requireAuth(pageName)) return;
  initLayout(pageName);

  const title = COMING_SOON_PAGES[pageName] || "This page";
  const titleElement = document.getElementById("coming-title");
  if (titleElement) {
    titleElement.textContent = title;
  }
  document.title = title + " | AI Compliance Intelligence";
}

document.addEventListener("DOMContentLoaded", initComingSoon);

// auth.js
// Keeps track of who is logged in, checks the user's role and sends people to the login page.
// The login token itself is handled in api.js (localStorage key "auth_token").
// The logged-in user (name, role, email, department) is kept in localStorage under "auth_user".

const USER_KEY = "auth_user";

// The pages each role is allowed to open.
// admin = everything, compliance = everything except settings/users,
// viewer = only dashboard, profile and reports (and no action buttons).
const PAGE_ROLES = {
  "dashboard.html": ["admin", "compliance", "viewer"],
  "profile.html": ["admin", "compliance", "viewer"],
  "reports.html": ["admin", "compliance", "viewer"],
  "search.html": ["admin", "compliance", "viewer"],
  "upload.html": ["admin", "compliance"],
  "rules.html": ["admin", "compliance"],
  "ask-policy.html": ["admin", "compliance"],
  "policy-impact.html": ["admin", "compliance"],
  "violations.html": ["admin", "compliance"],
  "review.html": ["admin", "compliance"],
  "settings.html": ["admin"],
};

// Converts the role text from the backend ("Admin", "Compliance Officer", "Viewer")
// into the short names we use in the code ("admin", "compliance", "viewer").
function normalizeRole(role) {
  if (role === "Admin" || role === "admin") return "admin";
  if (role === "Compliance Officer" || role === "compliance") return "compliance";
  return "viewer";
}

// Returns the full name for a role, for example "Compliance Officer".
function roleLabel(role) {
  if (role === "admin") return "Admin";
  if (role === "compliance") return "Compliance Officer";
  return "Viewer";
}

// Reads the saved user from the browser. Returns null when nobody is logged in.
function getStoredUser() {
  try {
    const saved = localStorage.getItem(USER_KEY);
    if (!saved) return null;
    const user = JSON.parse(saved);
    user.role = normalizeRole(user.role);
    return user;
  } catch (error) {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

// Saves the logged-in user in the browser.
function setStoredUser(user) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

// Removes the logged-in user from the browser.
function clearStoredUser() {
  localStorage.removeItem(USER_KEY);
}

// True when somebody is logged in (both token and user are present).
function isLoggedIn() {
  return Boolean(getToken()) && Boolean(getStoredUser());
}

// Returns the role of the logged-in user: "admin", "compliance" or "viewer".
function getRole() {
  const user = getStoredUser();
  return user ? user.role : null;
}

// True when the logged-in user has the given role.
function hasRole(role) {
  return getRole() === role;
}

// True when the logged-in user is an admin.
function isAdmin() {
  return hasRole("admin");
}

// True when the logged-in user is a compliance officer.
function isCompliance() {
  return hasRole("compliance");
}

// True when the logged-in user is a viewer.
function isViewer() {
  return hasRole("viewer");
}

// True when the logged-in user may see action buttons (admin or compliance officer).
function canTakeActions() {
  return isAdmin() || isCompliance();
}

// Sends the visitor to the login page.
function redirectToLogin() {
  window.location.href = "login.html";
}

// Sends the visitor to the dashboard.
function redirectToDashboard() {
  window.location.href = "dashboard.html";
}

// Checks that the visitor may open this page.
// - Not logged in  -> go to login.html
// - Wrong role      -> go to dashboard.html (the backend also checks the role)
// - All good       -> keep the role in a global variable (currentRole)
function requireAuth(pageName) {
  if (!isLoggedIn()) {
    redirectToLogin();
    return false;
  }
  const allowed = PAGE_ROLES[pageName];
  if (allowed && allowed.indexOf(getRole()) === -1) {
    window.location.href = "dashboard.html";
    return false;
  }
  return true;
}

// Signs the user out: tells the backend, clears the saved user and goes back to the landing page.
async function signOut() {
  await logoutApi();
  clearStoredUser();
  window.location.href = "index.html";
}

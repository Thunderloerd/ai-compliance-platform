// login.js
// Handles the sign in form: sends email and password to the backend,
// saves the token and the user, then sends the visitor to the dashboard.

// Shows a message in the red box above the form.
function showLoginMessage(text) {
  const box = document.getElementById("login-message");
  box.textContent = text;
  box.classList.remove("hidden");
}

// Sets the page up: applies the saved theme and listens to the form.
function initLogin() {
  // Use the theme the visitor chose before (dark by default).
  const savedTheme = localStorage.getItem(THEME_KEY);
  applyTheme(savedTheme === "light" ? "light" : "dark");

  // If the visitor is already logged in, go straight to the dashboard.
  if (isLoggedIn()) {
    window.location.href = "dashboard.html";
    return;
  }

  document.getElementById("toggle-password").addEventListener("click", function () {
    const password = document.getElementById("password");
    const isHidden = password.type === "password";
    password.type = isHidden ? "text" : "password";
    this.textContent = isHidden ? "Hide" : "Show";
  });

  document.getElementById("login-form").addEventListener("submit", handleLogin);
}

// Sends the form to the backend and shows what happened.
async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const messageBox = document.getElementById("login-message");
  const button = document.getElementById("login-button");

  messageBox.classList.add("hidden");

  if (!email || !password) {
    showLoginMessage("Email and password are required.");
    return;
  }

  button.disabled = true;
  button.textContent = "Signing in...";

  try {
    const answer = await loginApi(email, password);
    const user = answer && answer.user;
    if (!user) {
      showLoginMessage("Login failed. Please check your credentials and try again.");
      return;
    }

    // Remember the user so the other pages know the name and the role.
    setStoredUser({
      name: user.name,
      email: user.email,
      department: user.department || "",
      role: normalizeRole(user.role),
    });

    window.location.href = "dashboard.html";
  } catch (error) {
    // The backend sends the real reason inside "detail", so we show it as it is.
    showLoginMessage(error.message || "Login failed. Please try again.");
  } finally {
    button.disabled = false;
    button.textContent = "Sign in";
  }
}

document.addEventListener("DOMContentLoaded", initLogin);

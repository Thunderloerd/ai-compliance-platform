// dashboard.js
// Loads the dashboard numbers from the backend and fills the cards, the chart and the violation list.
// If the backend cannot be reached, a clear message is shown instead of empty cards.

// Starts the page: checks the login, builds the layout and loads the data.
function initDashboard() {
  if (!requireAuth("dashboard.html")) return;
  initLayout("dashboard.html");
  loadDashboard();
}

// Gets the dashboard summary from the backend.
async function loadDashboard() {
  const errorBox = document.getElementById("dashboard-error");
  errorBox.classList.add("hidden");

  try {
    const summary = await fetchDashboardSummary();
    renderDashboard(summary);
  } catch (error) {
    showDashboardError(error.message || "Failed to load dashboard data.");
  }
}

// Shows the error message in the red box and empties the cards.
function showDashboardError(message) {
  const errorBox = document.getElementById("dashboard-error");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
  document.getElementById("kpi-score").textContent = "--";
  document.getElementById("kpi-policies").textContent = "--";
  document.getElementById("kpi-violations").textContent = "--";
  document.getElementById("kpi-alerts").textContent = "--";
  document.getElementById("recent-violations-box").innerHTML =
    '<div class="empty-state">No data. The backend could not be reached.</div>';
}

// Fills all the parts of the dashboard with the numbers from the backend.
function renderDashboard(summary) {
  const total = summary.total_violations || 1;
  const pending = summary.pending_violations || 0;
  let score = Math.round(100 - (pending / total) * 100);
  if (!isFinite(score)) score = 100;

  // The four number cards. The numbers count up slowly (like the old app did).
  animateNumber(document.getElementById("kpi-score"), score, "%");
  animateNumber(document.getElementById("kpi-policies"), summary.total_policies || 0, "");
  animateNumber(document.getElementById("kpi-violations"), summary.total_violations || 0, "");
  animateNumber(document.getElementById("kpi-alerts"), summary.high_severity || 0, "");

  // The round compliance score.
  document.getElementById("score-ring").innerHTML = buildScoreRing(score, 80, 8);

  // The scan button is only useful when there is a policy to check.
  const scanButton = document.getElementById("run-scan-button");
  const scanHint = document.getElementById("scan-hint");
  if ((summary.total_policies || 0) === 0) {
    scanButton.disabled = true;
    scanHint.textContent = "Upload at least one policy first, and connect your database via Settings or API.";
  } else {
    scanHint.textContent =
      "Your company database must have tables and columns that match the rules from your policies " +
      "(e.g. policy_docs with compliance_verified, retention_period_years). Create them in pgAdmin if the scan fails.";
  }

  // Viewers only look, they cannot start a scan.
  if (!canTakeActions()) {
    scanButton.classList.add("hidden");
  }

  renderRecentViolations(summary.recent_violations || []);
}

// Counts a number up from 0 to the real value.
function animateNumber(element, target, suffix) {
  const start = performance.now();
  const duration = 800;

  function step(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = Math.round(target * eased) + suffix;
    if (progress < 1) {
      requestAnimationFrame(step);
    }
  }
  requestAnimationFrame(step);
}

// Builds the round compliance score picture (an SVG circle).
function buildScoreRing(score, size, strokeWidth) {
  const radius = (size - strokeWidth) / 2;
  const circle = 2 * Math.PI * radius;
  const offset = circle - (score / 100) * circle;
  let color = "#ef4444";
  if (score >= 90) color = "#22c55e";
  else if (score >= 70) color = "#6366f1";
  else if (score >= 50) color = "#f59e0b";

  return (
    '<div class="compliance-ring" style="width:' + size + "px;height:" + size + 'px">' +
    '<svg width="' + size + '" height="' + size + '">' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '" fill="none" stroke="var(--muted)" stroke-width="' + strokeWidth + '"/>' +
    '<circle cx="' + size / 2 + '" cy="' + size / 2 + '" r="' + radius + '" fill="none" stroke="' + color + '" stroke-width="' + strokeWidth + '" stroke-linecap="round" ' +
    'stroke-dasharray="' + circle + '" stroke-dashoffset="' + offset + '"/>' +
    "</svg>" +
    '<span class="ring-text">' + score + "%</span>" +
    "</div>"
  );
}

// Shows the newest violations as a list.
function renderRecentViolations(violations) {
  const box = document.getElementById("recent-violations-box");

  if (violations.length === 0) {
    box.innerHTML = '<div class="empty-state">No violations found yet. Upload a policy and run a scan.</div>';
    return;
  }

  let html = "";
  violations.forEach(function (violation) {
    const severity = (violation.severity || "medium").toLowerCase();
    const badgeClass = severity === "critical" ? "badge-critical" : severity === "high" ? "badge-warning" : "badge-default";
    const text = (violation.explanation || "Violation").slice(0, 80);
    html +=
      '<a class="violation-row" href="violations.html?id=' + violation.id + '">' +
      '<span class="violation-icon">&#9888;</span>' +
      '<span class="violation-text">' +
      '<span class="title">' + escapeHtml(text) + "</span>" +
      '<span class="flex-gap" style="margin-top:0.25rem">' +
      '<span class="badge ' + badgeClass + '">' + escapeHtml(severity) + "</span>" +
      '<span class="text-small text-muted">#' + violation.id + "</span>" +
      "</span>" +
      "</span>" +
      "</a>";
  });
  box.innerHTML = html;
}

// Starts a compliance scan and shows the result of the scan.
async function handleRunScan() {
  const button = document.getElementById("run-scan-button");
  const message = document.getElementById("scan-message");
  button.disabled = true;
  button.textContent = "Scanning...";
  message.className = "text-small";
  message.textContent = "";

  try {
    const result = await runScan();
    if (result.message && result.rules_checked === 0) {
      message.textContent = result.message;
    } else {
      message.textContent =
        "Scan complete: " + result.total_violations + " violation(s) found (" + result.rules_checked + " rules checked" +
        (result.scan_duration_seconds !== undefined && result.scan_duration_seconds !== null ? " in " + result.scan_duration_seconds + "s" : "") + ").";
    }
    message.className = "text-small text-success";
    loadDashboard();
  } catch (error) {
    message.textContent = error.message || "Scan failed";
    message.className = "text-small text-danger";
  } finally {
    button.disabled = false;
    button.textContent = "Run scan now";
  }
}

document.addEventListener("DOMContentLoaded", function () {
  initDashboard();

  const scanButton = document.getElementById("run-scan-button");
  if (scanButton) {
    scanButton.addEventListener("click", handleRunScan);
  }
});

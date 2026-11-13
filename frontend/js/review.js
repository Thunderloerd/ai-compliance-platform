// review.js
// Handles the review page: pick a pending violation, read it, add a comment
// and approve or reject it. The audit log comes from the backend.

// All violations that came from the backend.
let allViolations = [];

// The violation that is open in the detail box.
let selectedId = null;

// True while we are saving an approve or reject.
let isSaving = false;

// Starts the page: checks the login, builds the layout and loads the data.
function initReview() {
  if (!requireAuth("review.html")) return;
  initLayout("review.html");

  document.getElementById("approve-button").addEventListener("click", function () {
    decideViolation("approved");
  });
  document.getElementById("reject-button").addEventListener("click", function () {
    decideViolation("dismissed");
  });

  loadReviewData();
}

// Gets the violations and the audit log from the backend.
async function loadReviewData() {
  const errorBox = document.getElementById("review-error");
  errorBox.classList.add("hidden");

  try {
    allViolations = await fetchViolations();
  } catch (error) {
    errorBox.textContent = error.message || "Failed to load violations.";
    errorBox.classList.remove("hidden");
    document.getElementById("detail-body").innerHTML =
      '<div class="empty-state">The violations could not be loaded.</div>';
    return;
  }

  renderPendingList();
  renderSelected();

  // The audit log is a separate call so a problem there does not stop the page.
  try {
    const entries = await fetchAuditLog(20);
    renderAuditLog(entries);
  } catch (error) {
    document.getElementById("audit-list").innerHTML =
      '<div class="empty-state">The audit log could not be loaded.</div>';
  }
}

// Draws the list of violations that still wait for a decision.
function renderPendingList() {
  const box = document.getElementById("pending-list");
  const pending = allViolations.filter(function (violation) {
    return violation.status === "pending";
  });

  document.getElementById("pending-count").textContent = pending.length + " violations";

  if (pending.length === 0) {
    box.innerHTML = '<div class="empty-state">No violations pending review</div>';
    return;
  }

  // The first pending violation is opened automatically.
  if (!selectedId || !pending.some(function (violation) { return violation.id === selectedId; })) {
    selectedId = pending[0].id;
  }

  let html = "";
  pending.forEach(function (violation) {
    const active = violation.id === selectedId ? " active" : "";
    html +=
      '<button class="list-item' + active + '" type="button" data-id="' + escapeHtml(violation.id) + '">' +
      '<div class="text-small" style="font-weight:500">' + escapeHtml(violation.clause) + "</div>" +
      '<div class="text-small text-muted" style="margin-top:.2rem">' + escapeHtml(violation.department) + "</div>" +
      "</button>";
  });
  box.innerHTML = html;

  box.querySelectorAll("[data-id]").forEach(function (button) {
    button.addEventListener("click", function () {
      selectedId = button.getAttribute("data-id");
      renderPendingList();
      renderSelected();
    });
  });
}

// Draws the details of the violation that is open.
function renderSelected() {
  const body = document.getElementById("detail-body");
  const commentCard = document.getElementById("comment-card");
  const selected = allViolations.find(function (violation) {
    return violation.id === selectedId;
  });

  if (!selected) {
    body.innerHTML =
      '<div class="empty-state" style="padding:2rem">' +
      '<p class="card-title">All caught up!</p>' +
      '<p class="card-desc" style="margin-top:.4rem">No violations pending review</p>' +
      "</div>";
    commentCard.classList.add("hidden");
    return;
  }

  commentCard.classList.remove("hidden");

  body.innerHTML =
    '<div class="flex-between" style="align-items:flex-start">' +
    "<div><h3 class=\"card-title\">Violation Details</h3>" +
    '<span class="badge ' + severityBadgeClass(selected.severity) + '" style="margin-top:.5rem">' +
    escapeHtml(selected.severity) +
    "</span></div>" +
    '<span class="text-small text-muted">#' + escapeHtml(selected.id) + "</span>" +
    "</div>" +
    '<div class="detail-grid" style="margin-top:1rem">' +
    "<div><p class=\"box-title\">Policy Clause</p><p>" + escapeHtml(selected.clause) + "</p></div>" +
    "<div><p class=\"box-title\">Policy</p><p>" + escapeHtml(selected.policyName) + "</p></div>" +
    "<div><p class=\"box-title\">Evidence</p><p class=\"text-small\" style=\"white-space:pre-wrap\">" +
    escapeHtml(selected.evidence || "—") +
    "</p></div>" +
    "<div><p class=\"box-title\">Affected Resource</p><p class=\"text-small\" style=\"font-family:monospace\">" +
    escapeHtml(selected.affectedResource) +
    "</p></div>" +
    "</div>" +
    '<div class="box ai" style="margin-top:1rem">' +
    '<p class="box-title">AI Explanation</p>' +
    "<p class=\"text-small\">" + escapeHtml(selected.aiExplanation || "—") + "</p>" +
    "</div>" +
    (selected.suggestedRemediation
      ? '<div class="box good" style="margin-top:1rem">' +
        '<p class="box-title">Suggested remediation</p>' +
        '<p class="text-small" style="white-space:pre-wrap">' + escapeHtml(selected.suggestedRemediation) + "</p>" +
        "</div>"
      : "") +
    '<div style="margin-top:1rem">' +
    '<p class="box-title">Audit trail for this violation</p>' +
    '<div id="violation-audit" class="timeline"><div class="loading-box"><span class="spinner"></span> Loading...</div></div>' +
    "</div>";

  loadViolationAudit(selected.id);
}

// Gets the history of one violation from the backend.
async function loadViolationAudit(violationId) {
  const box = document.getElementById("violation-audit");
  if (!box) return;
  try {
    const entries = await fetchViolationAudit(violationId);
    if (entries.length === 0) {
      box.innerHTML = '<p class="text-small text-muted">Nothing happened to this violation yet.</p>';
      return;
    }
    let html = "";
    entries.forEach(function (entry) {
      html +=
        '<div class="timeline-item">' +
        '<p class="text-small" style="font-weight:500">' + escapeHtml(actionLabel(entry.action_type)) + "</p>" +
        '<p class="text-small text-muted">' +
        escapeHtml(entry.performed_by || "system") + " &bull; " + escapeHtml(formatTime(entry.timestamp)) +
        "</p></div>";
    });
    box.innerHTML = html;
  } catch (error) {
    box.innerHTML = '<p class="text-small text-muted">The history could not be loaded.</p>';
  }
}

// Draws the audit log of the whole app.
function renderAuditLog(entries) {
  const box = document.getElementById("audit-list");

  if (entries.length === 0) {
    box.innerHTML = '<div class="empty-state">Nothing happened yet</div>';
    return;
  }

  let html = "";
  entries.forEach(function (entry) {
    html +=
      '<div class="timeline-item">' +
      '<p class="text-small" style="font-weight:500">' + escapeHtml(actionLabel(entry.action_type)) + "</p>" +
      '<p class="text-small text-muted">' +
      escapeHtml(entry.performed_by || "system") + " &bull; " + escapeHtml(formatTime(entry.timestamp)) +
      "</p></div>";
  });
  box.innerHTML = html;
}

// Approves or rejects the violation that is open.
async function decideViolation(status) {
  if (isSaving || !selectedId) return;

  const comment = document.getElementById("comment-input").value.trim();
  const message = document.getElementById("action-message");
  const errorBox = document.getElementById("review-error");
  errorBox.classList.add("hidden");
  isSaving = true;
  message.className = "text-small text-muted";
  message.textContent = status === "approved" ? "Approving..." : "Rejecting...";

  try {
    await updateViolationStatus(selectedId, status, comment || null);
    message.className = "text-small text-success";
    message.textContent = status === "approved" ? "Approved." : "Rejected.";
    document.getElementById("comment-input").value = "";
    await loadReviewData();
  } catch (error) {
    message.className = "text-small text-muted";
    message.textContent = "";
    errorBox.textContent = error.message || "Could not save the decision.";
    errorBox.classList.remove("hidden");
  } finally {
    isSaving = false;
  }
}

// Turns the action type of the backend into a readable text.
function actionLabel(actionType) {
  const labels = {
    policy_uploaded: "Policy uploaded",
    status_changed: "Violation status updated",
    scan_run: "Compliance scan run",
    login: "Signed in",
    logout: "Signed out",
    password_change: "Password updated",
    password_updated: "Password updated",
    report_viewed: "Report viewed",
    export: "Report exported",
  };
  if (labels[actionType]) return labels[actionType];
  return String(actionType || "").replace(/_/g, " ").replace(/\b\w/g, function (letter) {
    return letter.toUpperCase();
  });
}

// Turns a date from the backend into a readable date and time.
function formatTime(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleString();
}

// Picks the right badge color for a severity.
function severityBadgeClass(severity) {
  if (severity === "critical") return "badge-critical";
  if (severity === "high") return "badge-warning";
  return "badge-info";
}

document.addEventListener("DOMContentLoaded", initReview);

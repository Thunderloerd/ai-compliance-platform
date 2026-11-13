// rules.js
// Handles the rules page: the list of rules, the filters, adding a rule by hand
// and deleting a rule.

// The rules that came from the backend.
let allRules = [];

// The rule that is opened (details are shown).
let expandedRuleId = null;

// The rule we are about to delete (waiting for the "Yes" answer).
let deleteConfirmId = null;

// Starts the page: checks the login, builds the layout and loads the rules.
function initRules() {
  if (!requireAuth("rules.html")) return;
  initLayout("rules.html");

  document.getElementById("severity-filter").addEventListener("change", loadRules);
  document.getElementById("status-filter").addEventListener("change", renderRules);
  document.getElementById("refresh-button").addEventListener("click", loadRules);
  document.getElementById("add-rule-button").addEventListener("click", openAddRule);
  document.getElementById("add-rule-cancel").addEventListener("click", closeAddRule);
  document.getElementById("add-rule-save").addEventListener("click", saveNewRule);

  loadRules();
}

// Gets the rules from the backend. The backend can filter by severity.
async function loadRules() {
  const list = document.getElementById("rules-list");
  const errorBox = document.getElementById("rules-error");
  errorBox.classList.add("hidden");
  list.innerHTML = '<div class="loading-box"><span class="spinner"></span> Loading rules...</div>';

  const severity = document.getElementById("severity-filter").value;
  try {
    allRules = await fetchRules(severity);
    renderRules();
  } catch (error) {
    allRules = [];
    errorBox.textContent = error.message || "Failed to load rules.";
    errorBox.classList.remove("hidden");
    list.innerHTML = '<div class="empty-state">No rules could be loaded.</div>';
  }
}

// Draws the rules that pass the filters.
function renderRules() {
  const list = document.getElementById("rules-list");
  const status = document.getElementById("status-filter").value;

  let rules = allRules.slice();
  if (status === "active") {
    rules = rules.filter(function (rule) {
      return rule.status === "active";
    });
  }

  if (rules.length === 0) {
    list.innerHTML =
      '<div class="empty-state" style="padding:2rem">' +
      "<p class=\"card-title\">No rules yet</p>" +
      '<p class="card-desc" style="margin-top:.5rem">Rules are shown here after you upload policy PDFs. Go to ' +
      '<a href="upload.html" style="color:var(--primary);text-decoration:underline">Upload Policy</a>, upload a PDF, then click Refresh.</p>' +
      "</div>";
    return;
  }

  let html = "";
  rules.forEach(function (rule) {
    const badgeClass = rule.severity === "critical" ? "badge-critical" : rule.severity === "high" ? "badge-warning" : "badge-default";
    const isOpen = expandedRuleId === rule.id;

    html += '<div class="card" style="margin-bottom:1rem;overflow:hidden">';
    // The top part: click it to open the details
    html +=
      '<button class="rule-head" type="button" data-id="' + rule.id + '">' +
      '<span class="rule-icon">&#128220;</span>' +
      '<span style="flex:1;min-width:0">' +
      '<span style="display:block;font-weight:500">' + escapeHtml(rule.clause) + "</span>" +
      '<span class="flex-gap" style="margin-top:.5rem;flex-wrap:wrap">' +
      '<span class="badge ' + badgeClass + '">' + escapeHtml(rule.severity) + "</span>" +
      '<span class="badge badge-info">v' + escapeHtml(rule.version) + "</span>" +
      '<span class="badge badge-success">' + escapeHtml(rule.status) + "</span>" +
      '<span class="text-small text-muted">' + escapeHtml(rule.policyName) + " &bull; " + escapeHtml(rule.department) + "</span>" +
      "</span>" +
      "</span>" +
      '<span class="text-muted" style="font-size:1.1rem">' + (isOpen ? "&#9662;" : "&#9656;") + "</span>" +
      "</button>";

    // The details, only shown when the rule is open
    if (isOpen) {
      html +=
        '<div class="expand-row">' +
        '<div class="flex-between" style="align-items:flex-start;flex-wrap:wrap">' +
        '<div class="detail-grid" style="flex:1">' +
        "<div><p class=\"box-title\">Category</p><p>" + escapeHtml(rule.category) + "</p></div>" +
        "<div><p class=\"box-title\">Policy ID</p><p>" + escapeHtml(rule.policyId) + "</p></div>" +
        "<div><p class=\"box-title\">Created</p><p>" + escapeHtml(formatDate(rule.createdAt)) + "</p></div>" +
        '<div><p class="box-title">Rule ID</p><p>' + escapeHtml(rule.id) + "</p></div>" +
        "</div>" +
        '<div class="flex-gap" style="margin-top:.5rem">' +
        (deleteConfirmId === rule.id
          ? '<span class="text-small text-muted">Delete?</span>' +
            '<button class="btn btn-danger btn-sm" type="button" data-delete-yes="' + rule.id + '">Yes</button>' +
            '<button class="btn btn-ghost btn-sm" type="button" data-delete-no="1">No</button>'
          : '<button class="btn btn-ghost btn-sm text-danger" type="button" data-delete-ask="' + rule.id + '">Delete rule</button>') +
        "</div>" +
        "</div>" +
        "</div>";
    }

    html += "</div>";
  });

  list.innerHTML = html;
  listenToRuleButtons();
}

// Waits for the clicks on the buttons inside the rules list.
function listenToRuleButtons() {
  document.querySelectorAll("[data-id]").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.getAttribute("data-id");
      expandedRuleId = expandedRuleId === id ? null : id;
      deleteConfirmId = null;
      renderRules();
    });
  });

  document.querySelectorAll("[data-delete-ask]").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteConfirmId = button.getAttribute("data-delete-ask");
      renderRules();
    });
  });

  document.querySelectorAll("[data-delete-no]").forEach(function (button) {
    button.addEventListener("click", function () {
      deleteConfirmId = null;
      renderRules();
    });
  });

  document.querySelectorAll("[data-delete-yes]").forEach(function (button) {
    button.addEventListener("click", function () {
      removeRule(button.getAttribute("data-delete-yes"));
    });
  });
}

// Deletes one rule from the backend.
async function removeRule(ruleId) {
  const errorBox = document.getElementById("rules-error");
  errorBox.classList.add("hidden");
  try {
    await deleteRule(ruleId);
    deleteConfirmId = null;
    expandedRuleId = null;
    await loadRules();
  } catch (error) {
    errorBox.textContent = error.message || "Delete failed. Try again.";
    errorBox.classList.remove("hidden");
  }
}

// Opens the "Add rule" window and fills the list of policies.
async function openAddRule() {
  const modal = document.getElementById("add-rule-modal");
  const select = document.getElementById("add-policy");
  document.getElementById("add-rule-error").classList.add("hidden");
  modal.classList.remove("hidden");

  try {
    const policies = await fetchPolicies();
    let html = '<option value="">Select policy</option>';
    policies.forEach(function (policy) {
      html += '<option value="' + escapeHtml(policy.id) + '">' + escapeHtml(policy.name) + "</option>";
    });
    select.innerHTML = html;
  } catch (error) {
    select.innerHTML = '<option value="">Select policy</option>';
    showAddRuleError(error.message || "Could not load the policies.");
  }
}

// Closes the "Add rule" window.
function closeAddRule() {
  document.getElementById("add-rule-modal").classList.add("hidden");
}

// Shows a message inside the "Add rule" window.
function showAddRuleError(message) {
  const box = document.getElementById("add-rule-error");
  box.textContent = message;
  box.classList.remove("hidden");
}

// Saves the new rule to the backend.
async function saveNewRule() {
  const policyId = document.getElementById("add-policy").value;
  const severity = document.getElementById("add-severity").value;
  const clause = document.getElementById("add-clause").value.trim();

  if (!policyId || !clause) {
    showAddRuleError("Select a policy and enter rule text.");
    return;
  }

  const saveButton = document.getElementById("add-rule-save");
  saveButton.disabled = true;
  saveButton.textContent = "Adding...";

  try {
    await createRule(Number(policyId), severity, clause);
    closeAddRule();
    document.getElementById("add-clause").value = "";
    await loadRules();
  } catch (error) {
    showAddRuleError(error.message || "Failed to add rule");
  } finally {
    saveButton.disabled = false;
    saveButton.textContent = "Add rule";
  }
}

// Turns a date from the backend into a readable date.
function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

document.addEventListener("DOMContentLoaded", initRules);

// violations.js
// Handles the violations page: the table with the violations, the filters and
// the evidence panel that opens when you click a row.

// All violations that came from the backend.
let allViolations = [];

// The violation whose details are open.
let expandedId = null;

// Starts the page: checks the login, builds the layout and loads the violations.
function initViolations() {
  if (!requireAuth("violations.html")) return;
  initLayout("violations.html");

  document.getElementById("severity-filter").addEventListener("change", loadViolations);
  document.getElementById("search-input").addEventListener("input", renderViolations);
  document.getElementById("department-filter").addEventListener("change", renderViolations);
  document.getElementById("status-filter").addEventListener("change", renderViolations);

  // The dashboard can send us here with ?id=123 to open one violation.
  const wantedId = new URLSearchParams(window.location.search).get("id");
  if (wantedId) {
    expandedId = wantedId;
  }

  loadViolations();
}

// Gets the violations from the backend. The backend can filter by severity.
async function loadViolations() {
  const body = document.getElementById("violations-body");
  const errorBox = document.getElementById("violations-error");
  errorBox.classList.add("hidden");
  body.innerHTML = '<tr><td colspan="6"><div class="loading-box"><span class="spinner"></span> Loading violations...</div></td></tr>';

  const severity = document.getElementById("severity-filter").value;
  try {
    allViolations = await fetchViolations(severity);
    fillDepartmentFilter();
    renderViolations();
  } catch (error) {
    allViolations = [];
    errorBox.textContent = error.message || "Failed to load violations.";
    errorBox.classList.remove("hidden");
    body.innerHTML = '<tr><td colspan="6"><div class="empty-state">No violations could be loaded.</div></td></tr>';
  }
}

// Fills the department list with the departments we found in the data.
function fillDepartmentFilter() {
  const select = document.getElementById("department-filter");
  const departments = [];
  allViolations.forEach(function (violation) {
    if (departments.indexOf(violation.department) === -1) {
      departments.push(violation.department);
    }
  });
  let html = '<option value="all">All Departments</option>';
  departments.forEach(function (department) {
    html += '<option value="' + escapeHtml(department) + '">' + escapeHtml(department) + "</option>";
  });
  select.innerHTML = html;
}

// Draws the table with the violations that pass the filters.
function renderViolations() {
  const body = document.getElementById("violations-body");
  const search = document.getElementById("search-input").value.trim().toLowerCase();
  const department = document.getElementById("department-filter").value;
  const status = document.getElementById("status-filter").value;

  let list = allViolations.slice();

  if (search) {
    list = list.filter(function (violation) {
      return (
        violation.clause.toLowerCase().indexOf(search) !== -1 ||
        violation.policyName.toLowerCase().indexOf(search) !== -1 ||
        violation.aiExplanation.toLowerCase().indexOf(search) !== -1
      );
    });
  }
  if (department !== "all") {
    list = list.filter(function (violation) {
      return violation.department === department;
    });
  }
  if (status !== "all") {
    list = list.filter(function (violation) {
      return violation.status === status;
    });
  }

  if (list.length === 0) {
    body.innerHTML =
      '<tr><td colspan="6"><div class="empty-state" style="padding:2rem">' +
      '<p class="card-title">No violations yet</p>' +
      '<p class="card-desc" style="margin-top:.5rem">Violations appear here after you connect a company database, ' +
      "upload policy PDFs to create rules, and run a scan from the Dashboard.</p>" +
      "</div></td></tr>";
    return;
  }

  let html = "";
  list.forEach(function (violation) {
    const isOpen = expandedId === violation.id;
    html +=
      '<tr>' +
      '<td><span class="badge ' + severityBadgeClass(violation.severity) + '">' + escapeHtml(violation.severity) + "</span></td>" +
      "<td>" +
      '<div style="font-weight:500">' + escapeHtml(violation.clause) + "</div>" +
      '<div class="text-small text-muted">' + escapeHtml(violation.policyName) + "</div>" +
      "</td>" +
      '<td class="text-small">' + escapeHtml(violation.affectedResource) + "</td>" +
      '<td><span class="badge ' + statusBadgeClass(violation.status) + '">' + escapeHtml(violation.status.replace("_", " ")) + "</span></td>" +
      '<td class="text-small text-muted">' + escapeHtml(formatDate(violation.discoveredAt)) + "</td>" +
      '<td><button class="icon-btn" type="button" data-toggle="' + escapeHtml(violation.id) + '" title="Show details">' +
      (isOpen ? "&#9662;" : "&#9656;") +
      "</button></td>" +
      "</tr>";

    // The evidence panel, shown under the row when it is open.
    if (isOpen) {
      html +=
        '<tr><td colspan="6" style="padding:0">' +
        '<div class="expand-row">' +
        '<div class="detail-grid">' +
        "<div><p class=\"box-title\">Evidence</p><p class=\"text-small\" style=\"white-space:pre-wrap\">" +
        escapeHtml(violation.evidence || "—") +
        "</p></div>" +
        "<div><p class=\"box-title\">Affected Resource</p><p class=\"text-small\" style=\"font-family:monospace\">" +
        escapeHtml(violation.affectedResource) +
        "</p></div>" +
        "</div>" +
        '<div class="box ai" style="margin-top:1rem">' +
        '<p class="box-title">AI Explanation</p>' +
        '<p class="text-small">' + escapeHtml(violation.aiExplanation || "—") + "</p>" +
        "</div>" +
        (violation.suggestedRemediation
          ? '<div class="box good" style="margin-top:1rem">' +
            '<p class="box-title">Suggested remediation</p>' +
            '<p class="text-small" style="white-space:pre-wrap">' + escapeHtml(violation.suggestedRemediation) + "</p>" +
            "</div>"
          : "") +
        "</div>" +
        "</td></tr>";
    }
  });

  body.innerHTML = html;

  // Clicking the arrow opens or closes the evidence panel.
  document.querySelectorAll("[data-toggle]").forEach(function (button) {
    button.addEventListener("click", function () {
      const id = button.getAttribute("data-toggle");
      expandedId = expandedId === id ? null : id;
      renderViolations();
    });
  });
}

// Picks the right badge color for a severity.
function severityBadgeClass(severity) {
  if (severity === "critical") return "badge-critical";
  if (severity === "high") return "badge-warning";
  return "badge-info";
}

// Picks the right badge color for a status.
function statusBadgeClass(status) {
  if (status === "pending" || status === "pending_review") return "badge-warning";
  if (status === "approved" || status === "resolved") return "badge-success";
  if (status === "dismissed" || status === "rejected") return "badge-critical";
  return "badge-default";
}

// Turns a date from the backend into a readable date.
function formatDate(iso) {
  if (!iso) return "—";
  const date = new Date(iso);
  if (isNaN(date.getTime())) return "—";
  return date.toLocaleDateString();
}

document.addEventListener("DOMContentLoaded", initViolations);

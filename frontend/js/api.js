// api.js
// Every call to the backend is made from this file.
// It also handles the login token (stored in localStorage under the name "auth_token").
// No mock/fake data lives here: if the backend is not reachable you get a real error message.

const TOKEN_KEY = "auth_token";

// Builds the full address for a backend path, for example "/violations".
function buildUrl(path) {
  return API_BASE_URL.replace(/\/$/, "") + path;
}

// Returns the saved login token, or null when nobody is logged in.
function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

// Saves the login token in the browser.
function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

// Removes the login token from the browser (used when logging out).
function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Turns a failed answer from the backend into a readable message.
// The backend sends the real reason inside "detail", so we show that text.
async function readErrorMessage(response) {
  let message = response.statusText || "Request failed";
  try {
    const body = await response.json();
    const detail = body ? body.detail : null;
    if (typeof detail === "string") {
      message = detail;
    } else if (Array.isArray(detail) && detail.length > 0) {
      message = detail[0].msg || detail[0] || message;
    } else if (body && body.message) {
      message = body.message;
    }
  } catch (error) {
    // The backend did not send JSON, so we keep the default message.
  }
  return message;
}

// Makes one request to the backend.
// method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE"
// body: optional JavaScript value that is sent as JSON
// timeoutMs: optional time to wait before giving up (in milliseconds)
// Returns the parsed answer, or throws an Error with a readable message.
async function apiRequest(path, options) {
  const settings = options || {};
  const method = settings.method || "GET";
  const timeoutMs = settings.timeoutMs || 30000;

  const headers = { "Content-Type": "application/json" };
  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, timeoutMs);

  let response;
  try {
    response = await fetch(buildUrl(path), {
      method: method,
      headers: headers,
      body: settings.body === undefined ? undefined : JSON.stringify(settings.body),
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error && error.name === "AbortError") {
      throw new Error("The backend did not answer in time. It may be busy - please try again.");
    }
    throw new Error("Cannot reach the backend at " + API_BASE_URL + ". Make sure the server is running.");
  }
  clearTimeout(timer);

  if (!response.ok) {
    const message = await readErrorMessage(response);
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }
  const text = await response.text();
  if (!text) {
    return null;
  }
  try {
    return JSON.parse(text);
  } catch (error) {
    return text;
  }
}

// --- Small helpers for the pages ---

// Turns one rule from the backend into the fields the pages use.
function mapRule(rule) {
  const data = rule.rule_data || {};
  return {
    id: String(rule.id),
    policyId: String(rule.policy_id),
    policyName: rule.policy_name || "—",
    clause: rule.policy_clause_text || data.policy_clause_text || "",
    severity: rule.severity || "medium",
    status: "active",
    version: "1",
    department: "—",
    createdAt: rule.created_at || "",
    category: "—",
  };
}

// Turns one violation from the backend into the fields the pages use.
function mapViolation(violation) {
  let evidence = "";
  if (violation.evidence_snapshot && typeof violation.evidence_snapshot === "object") {
    evidence = JSON.stringify(violation.evidence_snapshot);
  } else {
    evidence = String(violation.evidence_snapshot === undefined ? "" : violation.evidence_snapshot);
  }
  return {
    id: String(violation.id),
    ruleId: String(violation.rule_id),
    policyId: violation.policy_id === null || violation.policy_id === undefined ? "" : String(violation.policy_id),
    policyName: violation.policy_name || "—",
    clause: violation.policy_clause_text || (violation.explanation || "").slice(0, 100) || "—",
    severity: violation.severity || "medium",
    department: "—",
    discoveredAt: violation.detected_at || violation.created_at || "",
    status: violation.status,
    evidence: evidence,
    aiExplanation: violation.explanation || "",
    suggestedRemediation: violation.suggested_remediation || "",
    affectedResource: violation.record_id,
    assignee: violation.reviewer_notes || "—",
  };
}

// Turns one policy from the backend into the fields the pages use.
function mapPolicy(policy) {
  return {
    id: String(policy.id),
    name: policy.name,
    version: String(policy.version),
    status: policy.is_active ? "active" : "inactive",
    uploadDate: policy.uploaded_at || "",
    department: "—",
    rulesCount: policy.rules_count || 0,
  };
}

// GET a path, for example apiGet("/dashboard/summary").
function apiGet(path, timeoutMs) {
  return apiRequest(path, { method: "GET", timeoutMs: timeoutMs });
}

// POST some data to a path.
function apiPost(path, body, timeoutMs) {
  return apiRequest(path, { method: "POST", body: body, timeoutMs: timeoutMs });
}

// PATCH some data to a path.
function apiPatch(path, body, timeoutMs) {
  return apiRequest(path, { method: "PATCH", body: body, timeoutMs: timeoutMs });
}

// DELETE a path.
function apiDelete(path, timeoutMs) {
  return apiRequest(path, { method: "DELETE", timeoutMs: timeoutMs });
}

// --- Health check ---

// Checks if the backend is reachable. Used to show "Backend connected" on pages.
async function fetchApiHealth() {
  try {
    const answer = await apiGet("/health", 8000);
    return { ok: true, status: answer ? answer.status : "" };
  } catch (error) {
    return { ok: false };
  }
}

// --- Dashboard ---

// Gets the dashboard summary (counts of policies, rules, violations).
function fetchDashboardSummary() {
  return apiGet("/dashboard/summary");
}

// Runs a compliance scan. The scan can take a while, so it waits up to 2 minutes.
function runScan() {
  return apiPost("/scan/run", undefined, 120000);
}

// --- Login / logout ---

// Logs in with email and password. Saves the token and returns the user.
async function loginApi(email, password) {
  const answer = await apiPost("/auth/login", { email: email, password: password });
  if (answer && answer.token) {
    setToken(answer.token);
  }
  return answer;
}

// Tells the backend that we signed out, then removes the token from the browser.
async function logoutApi() {
  const token = getToken();
  if (!token) {
    return;
  }
  try {
    await apiPost("/auth/logout");
  } catch (error) {
    // Even if the backend call fails we still sign out locally.
  }
  clearToken();
}

// Gets the details of the logged-in user (used for the profile and for 2FA).
async function fetchAuthMe() {
  const answer = await apiGet("/auth/me");
  return answer ? answer.user : null;
}

// --- Policies ---

// Gets all uploaded policies.
async function fetchPolicies() {
  const list = await apiGet("/policy");
  return list.map(mapPolicy);
}

// Uploads a policy PDF. The file is sent as form data, so it needs its own function.
async function uploadPolicyFile(file) {
  const formData = new FormData();
  formData.append("file", file);

  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }

  const controller = new AbortController();
  const timer = setTimeout(function () {
    controller.abort();
  }, 180000);

  let response;
  try {
    response = await fetch(buildUrl("/policy/upload"), {
      method: "POST",
      headers: headers,
      body: formData,
      signal: controller.signal,
    });
  } catch (error) {
    clearTimeout(timer);
    if (error && error.name === "AbortError") {
      throw new Error("Upload is taking longer than expected. The server may still be working - check Rules in a moment.");
    }
    throw new Error("Cannot reach the backend at " + API_BASE_URL + ". Make sure the server is running.");
  }
  clearTimeout(timer);

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  return response.json();
}

// Compares two policy versions and returns the rule differences.
function fetchPolicyCompare(oldPolicyId, newPolicyId) {
  const params = new URLSearchParams({
    old_policy_id: oldPolicyId,
    new_policy_id: newPolicyId,
    compute_impact: "true",
  });
  return apiGet("/policy/compare?" + params.toString());
}

// Asks a question about the policies (the smart search that uses AI).
function fetchPolicyAsk(query, policyId) {
  return apiPost("/policy/ask", { query: query, policy_id: policyId }, 120000);
}

// Shows how many policies are indexed for the smart search.
function fetchPolicyRagStatus() {
  return apiGet("/policy/rag-status");
}

// Indexes all policies for the smart search.
function fetchPolicyReindex() {
  return apiPost("/policy/reindex", undefined, 180000);
}

// --- Rules ---

// Gets all rules, optionally filtered by severity.
async function fetchRules(severity) {
  let path = "/rules";
  if (severity && severity !== "all") {
    path += "?severity=" + encodeURIComponent(severity);
  }
  const list = await apiGet(path);
  return list.map(mapRule);
}

// Creates one new rule by hand.
async function createRule(policyId, severity, clauseText) {
  const created = await apiPost("/rules", {
    policy_id: policyId,
    severity: severity,
    policy_clause_text: clauseText,
  });
  return mapRule(created);
}

// Deletes one rule.
function deleteRule(ruleId) {
  return apiRequest("/rules/" + ruleId, { method: "DELETE", timeoutMs: 15000 });
}

// --- Violations ---

// Gets all violations, optionally filtered by severity.
async function fetchViolations(severity) {
  let path = "/violations";
  if (severity && severity !== "all") {
    path += "?severity=" + encodeURIComponent(severity);
  }
  const list = await apiGet(path);
  return list.map(mapViolation);
}

// Changes the status of a violation to "approved" or "dismissed".
function updateViolationStatus(violationId, status, reviewerNotes) {
  const body = { status: status };
  if (reviewerNotes) {
    body.reviewer_notes = reviewerNotes;
  }
  return apiPatch("/violations/" + violationId, body);
}

// Gets the history (audit trail) of one violation.
function fetchViolationAudit(violationId) {
  return apiGet("/violations/" + violationId + "/audit");
}

// Gets the recent audit log entries of the whole app.
function fetchAuditLog(limit, entityType, entityId) {
  let path = "/audit?limit=" + (limit || 50);
  if (entityType) {
    path += "&entity_type=" + encodeURIComponent(entityType);
  }
  if (entityId !== undefined && entityId !== null) {
    path += "&entity_id=" + encodeURIComponent(entityId);
  }
  return apiGet(path);
}

// --- Notifications ---

// Gets the notifications for the bell menu.
function fetchNotifications() {
  return apiGet("/notifications");
}

// Marks one notification as read.
function markNotificationRead(notificationId) {
  return apiPatch("/notifications/" + notificationId + "/read");
}

// --- Settings (admin only) ---

// Gets all app settings.
function fetchSettings() {
  return apiGet("/settings");
}

// Saves the app settings.
function updateSettings(updates) {
  return apiPatch("/settings", updates);
}

// Gets the status of the connected company database.
function fetchDatabaseStatus() {
  return apiGet("/database/status");
}

// Connects a company database so scans can run.
function connectDatabase(credentials) {
  return apiPost("/database/connect", credentials);
}

// --- Users (admin only) ---

// Gets all users.
function fetchUsers() {
  return apiGet("/users");
}

// Creates a new user.
function createUser(user) {
  return apiPost("/users", user);
}

// Sets or resets the password of a user.
function setUserPassword(userId, password) {
  return apiPatch("/users/" + userId + "/password", { password: password });
}

// Deletes a user.
function deleteUser(userId) {
  return apiDelete("/users/" + userId);
}

// --- Reports ---

// Downloads a report file (pdf or csv) into the browser downloads folder.
async function downloadReport(format) {
  const headers = {};
  const token = getToken();
  if (token) {
    headers.Authorization = "Bearer " + token;
  }
  const response = await fetch(buildUrl("/reports/export/" + format), { headers: headers });
  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }
  const blob = await response.blob();
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "compliance-report." + format;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// --- Profile ---

// Gets the profile numbers for the current month.
function fetchProfileMetrics() {
  return apiGet("/profile/metrics");
}

// Gets the recent activity list for the profile page.
function fetchProfileActivity(limit, hours) {
  return apiGet("/profile/activity?limit=" + limit + "&hours=" + hours);
}

// Remembers that the user opened the reports page.
function trackReportViewed() {
  return apiPost("/profile/track", { action_type: "report_viewed" });
}

// --- Two factor login (2FA) ---

// Starts the 2FA setup and returns the secret key.
function enable2FA() {
  return apiPost("/auth/2fa/enable");
}

// Checks the 6 digit code and turns 2FA on.
function verify2FA(code) {
  return apiPost("/auth/2fa/verify", { code: code });
}

// Turns 2FA off.
function disable2FA() {
  return apiPost("/auth/2fa/disable");
}

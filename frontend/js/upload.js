// upload.js
// Handles the upload page: the drag and drop box, the upload progress and
// the list of rules that the AI found in the uploaded PDF.

// The maximum file size we use when the backend does not tell us another one.
const DEFAULT_MAX_FILE_SIZE_MB = 10;

// The uploaded rules, kept here so we can clear the list.
let uploadedRules = [];

// Starts the page: checks the login, builds the layout and sets up the dropzone.
function initUpload() {
  if (!requireAuth("upload.html")) return;
  initLayout("upload.html");
  setupDropzone();
  loadMaxFileSize();
}

// Asks the backend for the biggest allowed file size and shows it in the text.
async function loadMaxFileSize() {
  try {
    const settings = await fetchSettings();
    const value = Number(settings.policy_upload_max_file_size_mb) || DEFAULT_MAX_FILE_SIZE_MB;
    document.getElementById("max-size").textContent = Math.max(1, Math.min(500, value));
  } catch (error) {
    // If we cannot read the settings we keep the default size.
    document.getElementById("max-size").textContent = DEFAULT_MAX_FILE_SIZE_MB;
  }
}

// Connects the drag and drop box and the file picker.
function setupDropzone() {
  const dropzone = document.getElementById("dropzone");
  const fileInput = document.getElementById("file-input");

  dropzone.addEventListener("click", function () {
    if (dropzone.classList.contains("busy")) return;
    fileInput.click();
  });

  fileInput.addEventListener("change", function () {
    if (fileInput.files && fileInput.files[0]) {
      startUpload(fileInput.files[0]);
    }
  });

  dropzone.addEventListener("dragover", function (event) {
    event.preventDefault();
    if (!dropzone.classList.contains("busy")) {
      dropzone.classList.add("dragging");
    }
  });

  dropzone.addEventListener("dragleave", function () {
    dropzone.classList.remove("dragging");
  });

  dropzone.addEventListener("drop", function (event) {
    event.preventDefault();
    dropzone.classList.remove("dragging");
    if (dropzone.classList.contains("busy")) return;
    const file = event.dataTransfer.files[0];
    if (file) {
      startUpload(file);
    }
  });

  document.getElementById("try-again").addEventListener("click", function (event) {
    event.stopPropagation();
    resetUpload();
  });

  document.getElementById("upload-another").addEventListener("click", function (event) {
    event.stopPropagation();
    resetUpload();
  });

  document.getElementById("clear-rules").addEventListener("click", function () {
    uploadedRules = [];
    renderRules([]);
  });
}

// Shows only one of the three boxes of the dropzone (idle, busy or done).
function showStep(step) {
  document.getElementById("drop-idle").classList.toggle("hidden", step !== "idle");
  document.getElementById("drop-busy").classList.toggle("hidden", step !== "busy");
  document.getElementById("drop-done").classList.toggle("hidden", step !== "done");
}

// Sets the progress bar to a number between 0 and 100.
function setProgress(percent) {
  document.querySelector("#upload-progress span").style.width = percent + "%";
}

// Shows an error message above the cards.
function showUploadError(message) {
  const box = document.getElementById("upload-error");
  box.textContent = message;
  box.classList.remove("hidden");
}

// Uploads the PDF to the backend and shows the rules that come back.
async function startUpload(file) {
  showUploadError("");
  uploadedRules = [];

  // Only PDF files are allowed.
  if (file.type !== "application/pdf" && file.name.toLowerCase().slice(-4) !== ".pdf") {
    showUploadError("Only PDF files can be uploaded.");
    return;
  }

  // Check the file size (the backend may allow a bigger file).
  const maxMb = Number(document.getElementById("max-size").textContent) || DEFAULT_MAX_FILE_SIZE_MB;
  if (file.size > maxMb * 1024 * 1024) {
    showUploadError("This file is bigger than " + maxMb + "MB. Please upload a smaller file.");
    return;
  }

  document.getElementById("busy-file-name").textContent = file.name;
  document.getElementById("busy-message").textContent = "Uploading & processing PDF... (may take 30-90s)";
  document.getElementById("busy-hint").textContent = "This may take 15-60s for large PDFs.";
  document.getElementById("try-again").classList.add("hidden");
  setProgress(5);
  showStep("busy");
  document.getElementById("dropzone").classList.add("busy");

  // The bar moves slowly while we wait for the answer.
  const timer = setInterval(function () {
    const bar = document.querySelector("#upload-progress span");
    const current = parseFloat(bar.style.width) || 0;
    if (current < 85) {
      bar.style.width = current + 8 + "%";
    }
  }, 400);

  try {
    const rules = await uploadPolicyFile(file);
    clearInterval(timer);
    setProgress(100);

    document.getElementById("busy-message").textContent = "Extracting rules with AI...";
    document.getElementById("busy-hint").textContent = "Almost done...";

    // The backend sends the rule text inside rule_data.
    uploadedRules = rules.map(function (rule) {
      const data = rule.rule_data || {};
      const clause = data.policy_clause_text || rule.policy_clause_text || "Rule " + rule.id;
      return {
        id: rule.id,
        clause: clause,
        severity: (rule.severity || "medium").toLowerCase(),
      };
    });

    renderRules(uploadedRules);
    document.getElementById("done-file-name").textContent = file.name;
    showStep("done");
  } catch (error) {
    clearInterval(timer);
    const message = error.message || "Upload failed";
    showUploadError(message);
    document.getElementById("busy-message").textContent = message;
    document.getElementById("busy-hint").textContent = "";
    document.getElementById("try-again").classList.remove("hidden");
  } finally {
    document.getElementById("dropzone").classList.remove("busy");
  }
}

// Puts the dropzone back to the empty state.
function resetUpload() {
  uploadedRules = [];
  renderRules([]);
  showUploadError("");
  document.getElementById("file-input").value = "";
  document.getElementById("dropzone").classList.remove("busy");
  setProgress(0);
  showStep("idle");
}

// Draws the list of extracted rules.
function renderRules(rules) {
  const box = document.getElementById("rules-preview");
  const clearButton = document.getElementById("clear-rules");

  if (rules.length === 0) {
    clearButton.classList.add("hidden");
    box.innerHTML = '<div class="empty-state" style="min-height:320px">Upload a policy to see extracted rules</div>';
    return;
  }

  clearButton.classList.remove("hidden");
  let html = "";
  rules.forEach(function (rule) {
    const badgeClass = rule.severity === "critical" ? "badge-critical" : rule.severity === "high" ? "badge-warning" : "badge-info";
    html +=
      '<div class="box" style="margin-bottom:.75rem">' +
      '<p class="text-small" style="font-weight:500">' + escapeHtml(rule.clause) + "</p>" +
      '<span class="badge ' + badgeClass + '" style="margin-top:.5rem">' + escapeHtml(rule.severity) + "</span>" +
      "</div>";
  });
  box.innerHTML = html;
}

document.addEventListener("DOMContentLoaded", initUpload);

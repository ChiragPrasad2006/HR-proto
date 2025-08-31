let employees = [];
let serverPubKey;     // server public key (CryptoKey)
let clientKeys;       // { publicKey, privateKey, pubPem, privPem }

// --- init keys before anything ---
async function initCrypto() {
  serverPubKey = await loadServerPublicKey();
  clientKeys = await initClientKeys();
  console.log("🔑 Crypto initialized");
}

// --- generic encrypted request helper ---
async function sendEncrypted(payload) {
  // 1) encrypt with server public key
  const encrypted = await encryptPayloadForServer(payload, serverPubKey, clientKeys);

  // 2) send to server
  const res = await fetch("sync.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(encrypted)
  });

  // 3) server returns { ekey, ct, tag }
  const respObj = await res.json();

  // 4) decrypt with client private key
  const decrypted = await decryptServerResponse(respObj, clientKeys.privateKey);
  return decrypted;
}

// --- load employee list ---
async function loadEmployees() {
  const data = await sendEncrypted({ action: "get" });
  employees = data.employees;
  renderEmployees();
}

// --- render employees table ---
function renderEmployees() {
  const rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td>
      <td>${emp.position}</td>

      <td><input type="number" min="0" value="${emp.hoursWorked ?? 0}"
        onchange="updateField(${emp.id}, 'hoursWorked', this.value)"></td>

      <td>
        <select onchange="updateField(${emp.id}, 'difficulty', this.value)">
          <option value="1" ${Number(emp.difficulty)===1 ? 'selected' : ''}>Easy</option>
          <option value="2" ${Number(emp.difficulty)===2 ? 'selected' : ''}>Medium</option>
          <option value="3" ${Number(emp.difficulty)===3 ? 'selected' : ''}>Hard</option>
        </select>
      </td>

      <td><input type="number" min="0" value="${emp.projectsCompleted ?? 0}"
        onchange="updateField(${emp.id}, 'projectsCompleted', this.value)"></td>

      <td>${emp.score ?? 0}</td>
      <td><button onclick="removeEmployee(${emp.id})">Remove</button></td>
    </tr>
  `).join("");

  document.getElementById("employeeList").innerHTML = `
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Name</th><th>Position</th><th>Hours Worked</th>
        <th>Difficulty</th><th>Projects Completed</th><th>Score</th><th>Action</th>
      </tr>
      ${rows}
    </table>
  `;
}

// --- add employee ---
async function addEmployee() {
  const name = document.getElementById("empName").value;
  const position = document.getElementById("empPosition").value;
  if (!name || !position) {
    alert("Fill all fields");
    return;
  }

  const data = await sendEncrypted({
    action: "add",
    name, position,
    score: 0, hoursWorked: 0, difficulty: 1, projectsCompleted: 0
  });

  employees = data.employees;
  renderEmployees();
}

// --- remove employee ---
async function removeEmployee(id) {
  const data = await sendEncrypted({ action: "remove", id });
  employees = data.employees;
  renderEmployees();
}

// --- recalc scores ---
async function recalculate() {
  const data = await sendEncrypted({ action: "recalculate" });
  employees = data.employees;
  renderEmployees();
}

// --- update field ---
async function updateField(id, field, value) {
  if (["hoursWorked","projectsCompleted","difficulty"].includes(field)) {
    value = parseInt(value, 10) || 0;
  }
  const payload = { action: "update", id };
  payload[field] = value;

  const data = await sendEncrypted(payload);
  if (data.status !== "success") {
    alert("Update failed");
    return;
  }
  employees = data.employees;
  renderEmployees();
}

// --- run once on load ---
window.addEventListener("DOMContentLoaded", async () => {
  await initCrypto();
  await loadEmployees();
});

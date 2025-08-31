let employees = [];
let serverPubKey = null;
let clientKeys = null;

// ---------- INIT KEYS ----------
async function initCrypto() {
  // Load/generate client keypair
  clientKeys = await initClientKeys();
  // Load server public key
  serverPubKey = await loadServerPublicKey();
  console.log("🔑 Crypto ready");
}

// ---------- SECURE FETCH HELPER ----------
async function secureFetch(payload) {
  if (!serverPubKey || !clientKeys) {
    await initCrypto();
  }

  // Encrypt request
  const encrypted = await encryptPayloadForServer(payload, serverPubKey, clientKeys);

  // Send to server
  let res = await fetch("sync.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(encrypted)
  });

  let respObj = await res.json();

  // Decrypt response
  const decrypted = await decryptServerResponse(respObj, clientKeys.privateKey);
  return decrypted;
}

// ---------- LOAD EMPLOYEES ----------
async function loadEmployees() {
  const data = await sendToServer({ action: "get" });
  console.log(" Decrypted server response:", data);

  if (data && data.employees) {
    employees = data.employees;
  } else if (Array.isArray(data)) {
    employees = data;
  } else {
    console.error("Unexpected response format:", data);
    employees = [];
  }

  renderEmployees();
}



// ---------- RENDER ----------
function renderEmployees() {
  if (!employees || !Array.isArray(employees)) {
    console.warn("⚠️ Employees is not an array:", employees);
    document.getElementById("employeeList").innerHTML = "<p>No employees found</p>";
    return;
  }

  const rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td>
      <td>${emp.position}</td>
      <td>
        <input type="number" min="0" value="${emp.hoursWorked ?? 0}"
               onchange="updateField(${emp.id}, 'hoursWorked', this.value)">
      </td>
      <td>
        <select onchange="updateField(${emp.id}, 'difficulty', this.value)">
          <option value="1" ${Number(emp.difficulty)===1 ? 'selected' : ''}>Easy</option>
          <option value="2" ${Number(emp.difficulty)===2 ? 'selected' : ''}>Medium</option>
          <option value="3" ${Number(emp.difficulty)===3 ? 'selected' : ''}>Hard</option>
        </select>
      </td>
      <td>
        <input type="number" min="0" value="${emp.projectsCompleted ?? 0}"
               onchange="updateField(${emp.id}, 'projectsCompleted', this.value)">
      </td>
      <td>${emp.score ?? 0}</td>
      <td><button onclick="removeEmployee(${emp.id})">Remove</button></td>
    </tr>
  `).join("");

  document.getElementById("employeeList").innerHTML = `
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Name</th>
        <th>Position</th>
        <th>Hours Worked</th>
        <th>Difficulty</th>
        <th>Projects Completed</th>
        <th>Score</th>
        <th>Action</th>
      </tr>
      ${rows}
    </table>
  `;
}


// ---------- ADD ----------
async function addEmployee() {
  let name = document.getElementById("empName").value;
  let position = document.getElementById("empPosition").value;

  if (!name || !position) {
    alert("Fill all fields");
    return;
  }

  const data = await secureFetch({
    action: "add",
    name,
    position,
    score: 0,
    hoursWorked: 0,
    difficulty: 1,
    projectsCompleted: 0
  });

  employees = data.employees;
  renderEmployees();
}

// ---------- REMOVE ----------
async function removeEmployee(id) {
  const data = await secureFetch({ action: "remove", id });
  employees = data.employees;
  renderEmployees();
}

// ---------- RECALCULATE ----------
async function recalculate() {
  const data = await secureFetch({ action: "recalculate" });
  employees = data.employees;
  renderEmployees();
}

// ---------- UPDATE FIELD ----------
async function updateField(id, field, value) {
  if (['hoursWorked','projectsCompleted','difficulty'].includes(field)) {
    value = parseInt(value, 10) || 0;
  }

  const payload = { action: "update", id };
  payload[field] = value;

  const data = await secureFetch(payload);
  if (data.status !== "success") {
    alert("Update failed");
    return;
  }
  employees = data.employees;
  renderEmployees();
}

// Run crypto init at start
initCrypto();

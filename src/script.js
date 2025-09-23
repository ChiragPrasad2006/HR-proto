let employees = [];
const SERVER_URL = "http://192.168.1.24/hr-proto/src/";

async function loadEmployees() {
  try {
    const res = await fetch(SERVER_URL + "getdata.php");
    if (!res.ok) throw new Error("Failed to load employees");
    employees = await res.json();
    if (!Array.isArray(employees)) employees = [];
    renderEmployees();
  } catch (err) {
    console.error("loadEmployees failed:", err);
    alert("Failed to load employees. Check server.");
  }
}

function toggleSalary(button) {
    const input = button.parentNode.querySelector('.salary-input');
    if (input.type === "password") {
        input.type = "text";
    } else {
        input.type = "password";
    }
}

function renderEmployees() {
  const rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td>
      <td>${emp.position}</td>

      <!-- Hours Worked -->
      <td><input type="number" min="0" value="${emp.hoursWorked ?? 0}"
            onchange="updateField(${emp.id}, 'hoursWorked', this.value)"></td>

      <!-- Difficulty -->
      <td>
        <select onchange="updateField(${emp.id}, 'difficulty', this.value)">
          <option value="1" ${Number(emp.difficulty)===1 ? 'selected' : ''}>Easy</option>
          <option value="2" ${Number(emp.difficulty)===2 ? 'selected' : ''}>Medium</option>
          <option value="3" ${Number(emp.difficulty)===3 ? 'selected' : ''}>Hard</option>
        </select>
      </td>

      <!-- Projects Completed -->
      <td><input type="number" min="0" value="${emp.projectsCompleted ?? 0}"
            onchange="updateField(${emp.id}, 'projectsCompleted', this.value)"></td>

      <td>${emp.score ?? 0}</td>
      <td>
            <div class="salary-field">
                <input type="number" class="salary-input" value="${emp.salary ?? 0}" 
                    onchange="updateField(${emp.id}, 'salary', this.value)">
                <button class="toggle-password" onclick="toggleSalary(this)">Show</button>
            </div>
        </td>
      <td><button onclick="removeEmployee(${emp.id})">Remove</button></td>
    </tr>
  `).join("");

  document.getElementById("employeeList").innerHTML = `
    <table border="1" cellpadding="5" cellspacing="0">
      <tr>
        <th>Name</th><th>Position</th><th>Hours Worked</th>
        <th>Difficulty</th><th>Projects Completed</th><th>Score</th><th>Salary</th><th>Action</th>
      </tr>
      ${rows}
    </table>
  `;
}

// =================== CRUD OPS ===================
async function addEmployee() {
  const name = document.getElementById("empName").value;
  const position = document.getElementById("empPosition").value;

  if (!name || !position) return alert("Fill all fields");

  const res = await fetch("updatedata.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "add", name, position, score: 0,
      hoursWorked: 0, difficulty: 1, projectsCompleted: 0
    })
  });

  const data = await res.json();
  employees = data.employees;
  renderEmployees();
}

async function removeEmployee(id) {
  const res = await fetch("updatedata.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id })
  });

  const data = await res.json();
  employees = data.employees;
  renderEmployees();
}

async function updateField(id, field, value) {
  if (['hoursWorked','projectsCompleted','difficulty'].includes(field))
    value = parseInt(value, 10) || 0;

  const res = await fetch("updatedata.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "update", id, [field]: value })
  });

  const data = await res.json();
  employees = data.employees;
  renderEmployees();
}

async function recalculate() {
  const res = await fetch("calculate.php");
  const msg = await res.text();
  alert(msg);
  await loadEmployees();
}

// =================== IMPORT / EXPORT ===================
async function importFromServer() {
  try {
    let res = await fetch(SERVER_URL + "get_export.php");
    if (!res.ok) throw new Error("Failed to fetch data from server");
    let data = await res.json();

    // Send to updatedata.php to overwrite encrypted store
    await fetch("updatedata.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "overwrite_all", employees: data })
    });

    alert("✅ Import successful!");
    await loadEmployees();
  } catch (err) {
    console.error("❌ Import failed:", err);
    alert("Import failed: " + err.message);
  }
}

async function exportToServer() {
  try {
    // Get decrypted data from our encrypted store
    let res = await fetch("getdata.php");
    if (!res.ok) throw new Error("Failed to read local employees");
    let data = await res.json();

    // Send to remote server
    await fetch(SERVER_URL + "save_export.php", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    alert("✅ Export successful!");
  } catch (err) {
    console.error("❌ Export failed:", err);
    alert("Export failed: " + err.message);
  }
}


let employees = [];

async function loadEmployees() {
  let res = await fetch("getdata.php");
  employees = await res.json();
  renderEmployees();
}

function renderEmployees() {
  const rows = employees.map(emp => `
    <tr>
      <td>${emp.name}</td>
      <td>${emp.position}</td>

      <!-- Hours Worked (editable) -->
      <td>
        <input type="number" min="0" value="${emp.hoursWorked ?? 0}"
               onchange="updateField(${emp.id}, 'hoursWorked', this.value)">
      </td>

      <!-- Difficulty (dropdown shown as words, stored as integer) -->
      <td>
        <select onchange="updateField(${emp.id}, 'difficulty', this.value)">
          <option value="1" ${Number(emp.difficulty)===1 ? 'selected' : ''}>Easy</option>
          <option value="2" ${Number(emp.difficulty)===2 ? 'selected' : ''}>Medium</option>
          <option value="3" ${Number(emp.difficulty)===3 ? 'selected' : ''}>Hard</option>
        </select>
      </td>

      <!-- Projects Completed (editable) -->
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

async function addEmployee() {
  let name = document.getElementById("empName").value;
  let position = document.getElementById("empPosition").value;

  if (!name || !position) {
    alert("Fill all fields");
    return;
  }

  let res = await fetch("updatedata.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "add",
      name,
      position,
      score: 0,
      hoursWorked: 0,
      difficulty: 1, 
      projectsCompleted: 0
    })
  });

  let data = await res.json();
  employees = data.employees;
  renderEmployees();
}

async function removeEmployee(id) {
  let res = await fetch("updatedata.php", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "remove", id })
  });

  let data = await res.json();
  employees = data.employees;
  renderEmployees();
}

async function recalculate() {
  let res = await fetch("calculate.php");
  let msg = await res.text();
  alert(msg);
  await loadEmployees(); 
}

async function updateField(id, field, value) {
  if (['hoursWorked','projectsCompleted','difficulty'].includes(field)) {
    value = parseInt(value, 10) || 0;
  }

  const payload = { action: 'update', id };
  payload[field] = value;

  const res = await fetch('updatedata.php', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  const data = await res.json();
  if (data.status !== 'success') {
    alert('Update failed');
    return;
  }
  employees = data.employees;
  renderEmployees();
}

function presentUser(row, viewer) {
  const base = {
    id: row.id,
    tenant_id: row.tenant_id,
    full_name: row.full_name,
    email: row.email,
    role: row.role
  };

  if (viewer.role === 'admin') {
    base.salary = row.salary;
  }

  return base;
}

function presentProject(row, viewer) {
  const base = {
    id: row.id,
    tenant_id: row.tenant_id,
    name: row.name,
    description: row.description,
    status: row.status,
    owner_id: row.owner_id
  };

  if (viewer.role === 'admin') {
    base.budget = row.budget;
  }

  return base;
}

module.exports = { presentUser, presentProject };

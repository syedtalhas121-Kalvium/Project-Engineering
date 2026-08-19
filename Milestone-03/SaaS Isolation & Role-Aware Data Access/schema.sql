-- CorpFlow v2.0 tenant-isolated database schema
-- Every tenant-owned record is anchored by tenant_id. Cross-tenant references
-- are prevented by composite foreign keys on (tenant_id, referenced_id).

DROP TABLE IF EXISTS project_members;
DROP TABLE IF EXISTS billing_details;
DROP TABLE IF EXISTS projects;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS tenants;

CREATE TABLE tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user'
        CHECK (role IN ('admin', 'manager', 'user')),
    salary DECIMAL(10,2),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT users_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT users_tenant_email_key UNIQUE (tenant_id, email)
);

CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'inactive')),
    budget DECIMAL(12,2),
    owner_id INTEGER NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT projects_tenant_id_id_key UNIQUE (tenant_id, id),
    CONSTRAINT projects_owner_same_tenant_fk
        FOREIGN KEY (tenant_id, owner_id) REFERENCES users(tenant_id, id)
        ON DELETE RESTRICT
);

CREATE TABLE project_members (
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    project_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT NOW(),
    PRIMARY KEY (tenant_id, project_id, user_id),
    CONSTRAINT project_members_project_same_tenant_fk
        FOREIGN KEY (tenant_id, project_id) REFERENCES projects(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT project_members_user_same_tenant_fk
        FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id)
        ON DELETE CASCADE
);

CREATE TABLE billing_details (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL,
    card_holder_name VARCHAR(100),
    card_last4 VARCHAR(4),
    expiry_date VARCHAR(5),
    billing_address TEXT,
    CONSTRAINT billing_user_same_tenant_fk
        FOREIGN KEY (tenant_id, user_id) REFERENCES users(tenant_id, id)
        ON DELETE CASCADE,
    CONSTRAINT billing_one_record_per_user UNIQUE (tenant_id, user_id)
);

-- Tenant-first indexes keep all access paths aligned with the isolation key.
CREATE INDEX idx_users_tenant_id ON users (tenant_id);
CREATE INDEX idx_users_tenant_id_id ON users (tenant_id, id);
CREATE INDEX idx_users_tenant_email ON users (tenant_id, email);
CREATE INDEX idx_projects_tenant_id ON projects (tenant_id);
CREATE INDEX idx_projects_tenant_id_id ON projects (tenant_id, id);
CREATE INDEX idx_projects_tenant_owner ON projects (tenant_id, owner_id);
CREATE INDEX idx_project_members_tenant_project ON project_members (tenant_id, project_id);
CREATE INDEX idx_project_members_tenant_user ON project_members (tenant_id, user_id);
CREATE INDEX idx_billing_details_tenant_id ON billing_details (tenant_id);
CREATE INDEX idx_billing_details_tenant_user ON billing_details (tenant_id, user_id);

-- Seed two isolated organisations with the three supported application roles.
INSERT INTO tenants (id, name) VALUES
    (1, 'Pouch.io'),
    (2, 'Velocity');

INSERT INTO users (id, tenant_id, full_name, email, password_hash, role, salary) VALUES
    (1, 1, 'Alice Johnson', 'alice@pouch.io', 'pbkdf2:sha256:600000$hasher$81726a', 'admin', 125000.00),
    (2, 1, 'Bob Smith', 'bob@pouch.io', 'pbkdf2:sha256:600000$hasher$81726b', 'manager', 95000.00),
    (3, 2, 'Charlie Davis', 'charlie@velocity.com', 'pbkdf2:sha256:600000$hasher$81726c', 'admin', 140000.00),
    (4, 2, 'David Miller', 'david@velocity.com', 'pbkdf2:sha256:600000$hasher$81726d', 'user', 75000.00);

INSERT INTO projects (id, tenant_id, name, description, status, budget, owner_id) VALUES
    (1, 1, 'Pouch Portal', 'Customer portal for Pouch.io', 'active', 50000.00, 1),
    (2, 2, 'Velocity Engine', 'Back-end engine for Velocity', 'active', 120000.00, 3),
    (3, 1, 'Secret R&D', NULL, 'inactive', 250000.00, 1);

INSERT INTO project_members (tenant_id, project_id, user_id) VALUES
    (1, 1, 1),
    (1, 1, 2),
    (1, 3, 1),
    (2, 2, 3),
    (2, 2, 4);

INSERT INTO billing_details (tenant_id, user_id, card_holder_name, card_last4, expiry_date, billing_address) VALUES
    (1, 1, 'Alice Johnson', '4242', '12/28', '123 Tech Lane, SF'),
    (2, 3, 'Charlie Davis', '9182', '08/26', '789 Velocity Rd, NY');

-- Keep sequences correct after deterministic seed IDs.
SELECT setval(pg_get_serial_sequence('tenants', 'id'), (SELECT MAX(id) FROM tenants));
SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users));
SELECT setval(pg_get_serial_sequence('projects', 'id'), (SELECT MAX(id) FROM projects));
SELECT setval(pg_get_serial_sequence('billing_details', 'id'), (SELECT MAX(id) FROM billing_details));

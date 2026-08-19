-- TaskSphere corrected relational schema
-- Target dialect: PostgreSQL
-- The design uses surrogate primary keys, explicit foreign keys,
-- uniqueness constraints, and a junction table for project membership.

BEGIN;

CREATE TABLE users (
    user_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(254) NOT NULL,
    CONSTRAINT users_email_unique UNIQUE (email),
    CONSTRAINT users_email_not_blank CHECK (btrim(email) <> '')
);

CREATE TABLE projects (
    project_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    project_name VARCHAR(150) NOT NULL,
    owner_id BIGINT NOT NULL,
    CONSTRAINT projects_name_not_blank CHECK (btrim(project_name) <> ''),
    CONSTRAINT projects_owner_fk
        FOREIGN KEY (owner_id)
        REFERENCES users (user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT projects_name_owner_unique UNIQUE (owner_id, project_name)
);

CREATE TABLE user_projects (
    user_id BIGINT NOT NULL,
    project_id BIGINT NOT NULL,
    role VARCHAR(30) NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT user_projects_pk PRIMARY KEY (user_id, project_id),
    CONSTRAINT user_projects_user_fk
        FOREIGN KEY (user_id)
        REFERENCES users (user_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT user_projects_project_fk
        FOREIGN KEY (project_id)
        REFERENCES projects (project_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT user_projects_role_check
        CHECK (role IN ('member', 'manager', 'viewer')),
    CONSTRAINT user_projects_project_user_unique UNIQUE (project_id, user_id)
);

CREATE TABLE tasks (
    task_id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    task_name VARCHAR(200) NOT NULL,
    project_id BIGINT NOT NULL,
    assigned_user_id BIGINT,
    status VARCHAR(30) NOT NULL DEFAULT 'todo',
    CONSTRAINT tasks_name_not_blank CHECK (btrim(task_name) <> ''),
    CONSTRAINT tasks_project_fk
        FOREIGN KEY (project_id)
        REFERENCES projects (project_id)
        ON UPDATE CASCADE
        ON DELETE CASCADE,
    CONSTRAINT tasks_assignee_must_be_project_member_fk
        FOREIGN KEY (project_id, assigned_user_id)
        REFERENCES user_projects (project_id, user_id)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,
    CONSTRAINT tasks_status_check
        CHECK (status IN ('todo', 'in_progress', 'blocked', 'done'))
);

-- Indexes support the most common relationship and filtering queries.
CREATE INDEX tasks_project_idx ON tasks (project_id);
CREATE INDEX tasks_assigned_user_idx ON tasks (assigned_user_id);
CREATE INDEX user_projects_project_idx ON user_projects (project_id);
CREATE INDEX tasks_project_status_idx ON tasks (project_id, status);

COMMIT;

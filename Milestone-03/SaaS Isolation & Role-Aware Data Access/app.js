const express = require('express');
const usersRouter = require('./routes/users');
const projectsRouter = require('./routes/projects');

const app = express();
app.use(express.json());

app.get('/', (req, res) => {
  res.json({
    name: 'CorpFlow SaaS API',
    version: '2.0.0',
    status: 'online',
    message: 'Welcome to the tenant-isolated CorpFlow workforce management API.',
    security: 'Tenant and role context required for protected endpoints.'
  });
});

app.use('/users', usersRouter);
app.use('/projects', projectsRouter);

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found.' });
});

if (require.main === module) {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    console.log(`\nCorpFlow SaaS API running on port ${PORT}`);
    console.log('----------------------------------');
    console.log(`Root:     http://localhost:${PORT}/`);
    console.log(`Users:    http://localhost:${PORT}/users`);
    console.log(`Projects: http://localhost:${PORT}/projects\n`);
  });
}

module.exports = app;

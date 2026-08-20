const express = require('express');
const userRoutes = require('./routes/user.routes');
const errorHandler = require('../middleware/errorHandler');

const app = express();
app.use(express.json());
app.use('/users', userRoutes);

// Error middleware must be registered after all routes.
app.use(errorHandler);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

module.exports = app;
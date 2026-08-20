const prisma = require('./lib/db');
const AppError = require('../utils/AppError');

// POST /users
async function createUser(req, res, next) {
  const { name, email } = req.body;

  if (!name || !email) {
    return next(new AppError('Name and email are required', 400));
  }

  try {
    const user = await prisma.user.create({ data: { name, email } });
    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

// GET /users/:id
async function getUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    res.json(user);
  } catch (err) {
    next(err);
  }
}

// DELETE /users/:id
async function deleteUser(req, res, next) {
  try {
    const id = parseInt(req.params.id, 10);
    await prisma.user.delete({ where: { id } });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// GET /users/crash/test
async function crashTest(req, res, next) {
  try {
    throw new Error('Simulated server crash!');
  } catch (err) {
    next(err);
  }
}

module.exports = { createUser, getUser, deleteUser, crashTest };
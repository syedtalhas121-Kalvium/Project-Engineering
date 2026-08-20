'use strict';

const expenseService = require('../services/expenseService');
const logger = require('../logger');

function logControllerError(message, req, error) {
    logger.error(message, {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        error
    });
}

exports.addExpense = async (req, res, next) => {
    try {
        const expense = await expenseService.createExpense(req.body);
        logger.info('Expense created', {
            requestId: req.requestId,
            payerId: expense.payerId,
            expenseId: expense.id
        });
        res.status(201).json(expense);
    } catch (error) {
        logControllerError('Expense creation failed', req, error);
        next(error);
    }
};

exports.getExpenses = async (req, res, next) => {
    try {
        const expenses = await expenseService.getAllExpenses();
        logger.info('Expenses retrieved', {
            requestId: req.requestId,
            count: expenses.length
        });
        res.json(expenses);
    } catch (error) {
        logControllerError('Expense retrieval failed', req, error);
        next(error);
    }
};

exports.getBalances = async (req, res, next) => {
    try {
        const balances = await expenseService.calculateBalances();
        logger.info('Balances calculated', {
            requestId: req.requestId,
            roommateCount: balances.roommates.length,
            total: balances.total
        });
        res.json(balances);
    } catch (error) {
        logControllerError('Balance calculation failed', req, error);
        next(error);
    }
};

'use strict';

const prisma = require('../db');

function roundCurrency(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

exports.createExpense = async (data) => {
    const description = typeof data.description === 'string' ? data.description.trim() : '';
    const amount = Number(data.amount);
    const payerId = Number(data.payerId);

    if (!description || !Number.isFinite(amount) || amount <= 0 || !Number.isInteger(payerId)) {
        const error = new Error('description, a positive amount, and an integer payerId are required');
        error.statusCode = 400;
        throw error;
    }

    return prisma.expense.create({
        data: {
            description,
            amount: roundCurrency(amount),
            payerId
        }
    });
};

exports.getAllExpenses = async () => prisma.expense.findMany({
    include: { payer: true },
    orderBy: { createdAt: 'desc' }
});

exports.calculateBalances = async () => {
    const roommates = await prisma.roommate.findMany({ include: { expenses: true } });
    const expenses = await prisma.expense.findMany();
    const total = roundCurrency(expenses.reduce((acc, curr) => acc + curr.amount, 0));
    const share = roommates.length ? roundCurrency(total / roommates.length) : 0;

    const results = roommates.map((roommate) => {
        const paid = roundCurrency(roommate.expenses.reduce((acc, expense) => acc + expense.amount, 0));
        return {
            name: roommate.name,
            paid,
            balance: roundCurrency(paid - share)
        };
    });

    return {
        total,
        averageShare: share,
        roommates: results
    };
};

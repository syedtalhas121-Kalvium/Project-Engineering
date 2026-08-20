'use strict';

const express = require('express');
const morgan = require('morgan');
const expenseRoutes = require('./src/routes/expenseRoutes');
const prisma = require('./src/db');
const logger = require('./src/logger');
const { loadConfig } = require('./src/config');

let config;
try {
    config = loadConfig();
} catch (error) {
    // loadConfig already emits a structured error; exit before accepting traffic.
    process.exitCode = 1;
    return;
}

const app = express();

morgan.token('request-id', (req) => req.requestId || '-');
morgan.token('user-id', (req) => req.user?.id || '-');

app.use((req, res, next) => {
    req.requestId = req.headers['x-request-id'] || `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    res.setHeader('x-request-id', req.requestId);
    next();
});

app.use(morgan((tokens, req, res) => JSON.stringify({
    timestamp: new Date().toISOString(),
    level: res.statusCode >= 500 ? 'ERROR' : res.statusCode >= 400 ? 'WARN' : 'INFO',
    message: 'HTTP request completed',
    requestId: tokens['request-id'](req, res),
    method: tokens.method(req, res),
    path: tokens.url(req, res),
    status: Number(tokens.status(req, res)),
    durationMs: Number(tokens['response-time'](req, res)),
    contentLength: tokens.res(req, res, 'content-length') || '-'
})));

app.use(express.json());
app.use('/expenses', expenseRoutes);

app.use((error, req, res, next) => {
    logger.error('Unhandled request error', {
        requestId: req.requestId,
        method: req.method,
        path: req.originalUrl,
        error
    });

    if (res.headersSent) return next(error);
    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    res.status(statusCode).json({
        error: statusCode === 500 ? 'Internal server error' : error.message,
        requestId: req.requestId
    });
});

async function start() {
    try {
        await prisma.$connect();
        logger.info('Database connection established', { environment: config.nodeEnv });

        const server = app.listen(config.port, () => {
            logger.info('Server listening', { port: config.port, environment: config.nodeEnv });
        });

        const shutdown = async (signal) => {
            logger.info('Shutdown requested', { signal });
            server.close(async () => {
                await prisma.$disconnect();
                logger.info('Shutdown complete');
            });
        };

        process.once('SIGINT', () => shutdown('SIGINT'));
        process.once('SIGTERM', () => shutdown('SIGTERM'));
    } catch (error) {
        logger.error('Database connection failed during startup', { error });
        await prisma.$disconnect().catch((disconnectError) => {
            logger.error('Database disconnect failed during startup cleanup', { error: disconnectError });
        });
        process.exitCode = 1;
    }
}

start();

module.exports = app;

'use strict';

const dotenv = require('dotenv');
const logger = require('./logger');

dotenv.config();

const REQUIRED_ENV = ['DATABASE_URL', 'JWT_SECRET', 'PORT'];

function loadConfig() {
    const missing = REQUIRED_ENV.filter((key) => !process.env[key]);

    if (missing.length > 0) {
        logger.error('Startup configuration validation failed', { missing });
        const error = new Error(`Missing required environment variables: ${missing.join(', ')}`);
        error.code = 'CONFIGURATION_ERROR';
        throw error;
    }

    const port = Number(process.env.PORT);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        logger.error('Startup configuration validation failed', {
            invalid: ['PORT'],
            reason: 'PORT must be an integer between 1 and 65535'
        });
        const error = new Error('PORT must be an integer between 1 and 65535');
        error.code = 'CONFIGURATION_ERROR';
        throw error;
    }

    return {
        databaseUrl: process.env.DATABASE_URL,
        jwtSecret: process.env.JWT_SECRET,
        nodeEnv: process.env.NODE_ENV || 'development',
        port
    };
}

module.exports = { loadConfig, REQUIRED_ENV };

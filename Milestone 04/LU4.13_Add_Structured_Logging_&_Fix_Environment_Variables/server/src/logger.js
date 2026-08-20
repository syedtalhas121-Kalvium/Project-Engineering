'use strict';

const SENSITIVE_KEYS = new Set(['authorization', 'cookie', 'password', 'token', 'secret', 'jwt', 'database_url']);

function sanitize(value) {
    if (Array.isArray(value)) {
        return value.map(sanitize);
    }

    if (value && typeof value === 'object') {
        return Object.fromEntries(
            Object.entries(value).map(([key, entry]) => [
                key,
                SENSITIVE_KEYS.has(key.toLowerCase()) ? '[REDACTED]' : sanitize(entry)
            ])
        );
    }

    return value;
}

function serializeError(error) {
    if (!error) return undefined;

    return {
        name: error.name,
        message: error.message,
        stack: error.stack
    };
}

function write(level, message, context = {}) {
    const entry = {
        timestamp: new Date().toISOString(),
        level,
        message,
        ...sanitize(context)
    };

    const output = `${JSON.stringify(entry)}\n`;
    const stream = level === 'ERROR' ? process.stderr : process.stdout;
    stream.write(output);
}

module.exports = {
    debug: (message, context) => write('DEBUG', message, context),
    info: (message, context) => write('INFO', message, context),
    warn: (message, context) => write('WARN', message, context),
    error: (message, context = {}) => write('ERROR', message, {
        ...context,
        error: context.error ? serializeError(context.error) : undefined
    })
};

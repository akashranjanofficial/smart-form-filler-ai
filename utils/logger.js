export const Logger = {
    // Config
    API_URL: 'http://localhost:3000/logs',

    // Log levels
    info: (message, data = null) => Logger.send('info', message, data),
    warn: (message, data = null) => Logger.send('warn', message, data),
    error: (message, data = null) => Logger.send('error', message, data),
    debug: (message, data = null) => Logger.send('debug', message, data),

    // Internal sender
    send: (level, message, data) => {
        // 1. Always log to local console (for DevTools)
        const timestamp = new Date().toISOString();
        const logMsg = `[${level.toUpperCase()}] ${message}`;

        if (level === 'error') console.error(logMsg, data || '');
        else if (level === 'warn') console.warn(logMsg, data || '');
        else console.log(logMsg, data || '');

        // 2. Fire and forget to Server
        try {
            const payload = {
                level,
                message: data ? `${message} | ${JSON.stringify(data)}` : message,
                service: 'EXTENSION'
            };

            fetch(Logger.API_URL, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            }).then(res => {
                // Success
            }).catch(err => {
                // Server down? Fallback to console
                console.warn('Logger: Failed to send log to Brain. Is server running?', err);
            });
        } catch (e) {
            // Ignore network errors
        }
    }
};

import winston from 'winston';
import path from 'path';

const logFormat = winston.format.printf(({ level, message, timestamp, service }) => {
    return `${timestamp} [${service || 'SERVER'}] ${level.toUpperCase()}: ${message}`;
});

export const logger = winston.createLogger({
    level: 'debug',
    format: winston.format.combine(
        winston.format.timestamp(),
        logFormat
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: path.join(process.cwd(), 'debug.log') })
    ]
});

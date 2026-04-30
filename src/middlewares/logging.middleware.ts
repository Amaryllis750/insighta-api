import type {NextFunction, Request, Response} from 'express';
import winston from 'winston';

const logger = winston.createLogger({
    format: winston.format.simple(),
    transports: [
        new winston.transports.Console(), 
        new winston.transports.File({filename: 'request.log'})
    ]
});

const logging = (req: Request, res: Response, next: NextFunction) => {
    const method = req.method;
    const path = req.path;
    const startTime = process.hrtime();

    res.on('finish', () => {
        const elapsedTime = process.hrtime(startTime);
        const elapsedTimeInMs = elapsedTime[0] * 1000 + elapsedTime[1] / 1e6;

        const message = `${method} ${path} ${res.statusCode} ${elapsedTimeInMs}ms`;
        logger.info(message);
    });

    next();
}

export {logging};
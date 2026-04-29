import rateLimit, {ipKeyGenerator} from 'express-rate-limit';
import type {Request, Response} from 'express';

const rateLimiter = rateLimit({
    windowMs: 60 * 1000, 
    limit: async (req: Request, res: Response) => {
        if (req.path.includes("auth")) return 10;
        return 60;
    }, 
    handler: async (req: Request, res: Response) => {
        return res.status(429).json({"status": "error", "message": "Too many requests"})
    }, 
    standardHeaders: true, 
    keyGenerator: async (req: Request, res: Response) => {
        if(req.path.includes("auth")) return req.path;
        return ipKeyGenerator(req.ip!)
    }
});

export default rateLimiter;
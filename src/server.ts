import express from 'express';
import cors from 'cors';
import profileRouter from './routes/profileRoute.js';
import authRouter from './routes/authRoute.js';
import cookieParser from 'cookie-parser';
import { verifyHeaders } from './middlewares/profile.middleware.js';
import rateLimiter from './middlewares/rateLimiter.middleware.js';
import { logging } from './middlewares/logging.middleware.js';
import meRouter from './routes/meRoute.js';
import authMiddleware from './middlewares/auth.middleware.js';

const PORT = 4000;

const app = express();

// middlwares...
app.use(express.json());
app.use(cors({
    origin: ['http://localhost:5173'], 
    credentials: true
}));
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(rateLimiter);
app.use(logging);

app.use('/api/profiles', verifyHeaders, authMiddleware, profileRouter);
app.use('/auth', authRouter);
app.use('/api/me', authMiddleware, meRouter);

app.listen(PORT, () => console.log(`Server is listening at port ${PORT}...`));

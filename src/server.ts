import express from 'express';
import cors from 'cors';
import profileRouter from './routes/profileRoute.js';
import authRouter from './routes/authRoute.js';
import cookieParser from 'cookie-parser';
import { verifyHeaders } from './middlewares/profile.middleware.js';
import rateLimiter from './middlewares/rateLimiter.middleware.js';
import { logging } from './middlewares/logging.middleware.js';

const PORT = 4000;

const app = express();

// middlwares...
app.use(express.json());
app.use(cors());
app.use(cookieParser(process.env.COOKIE_SECRET));
app.use(rateLimiter);
app.use(logging);

app.use('/api/profiles', verifyHeaders, profileRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, () => console.log(`Server is listening at port ${PORT}...`));

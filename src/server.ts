import express from 'express';
import cors from 'cors';
import profileRouter from './routes/profileRoute.js';
import authRouter from './routes/authRoute.js';

const PORT = 4000;

const app = express();

// middlwares...
app.use(express.json());
app.use(cors());

app.use('/api/profiles', profileRouter);
app.use('/api/auth', authRouter);

app.listen(PORT, ()=>(console.log(`Server is listening at port ${PORT}...`)));
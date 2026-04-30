import { Router } from 'express';
import { githubAuth, githubAuthCallback } from '../controllers/authController.js';

const router = Router();

router.get('/github', githubAuth);
router.get('/github/callback', githubAuthCallback);

export default router;

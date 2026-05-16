import { Router } from 'express';
import { githubAuth, githubAuthCallback, refresh } from '../controllers/authController.js';
import { getRefreshMiddleware } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/github', githubAuth);
router.get('/github/callback', githubAuthCallback);
router.post('/refresh', getRefreshMiddleware, refresh);

export default router;

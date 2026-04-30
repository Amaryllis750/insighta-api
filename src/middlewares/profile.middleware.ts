import type { NextFunction, Request, Response } from 'express';

const verifyHeaders = (req: Request, res: Response, next: NextFunction) => {
  const version = req.header('x-api-version');
  if (!version) {
    return res.status(400).json({ status: 'error', message: 'API version header required' });
  }

  next();
};

export { verifyHeaders };

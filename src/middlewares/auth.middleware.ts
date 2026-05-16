import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try {
        // check for the cookies
        const refreshToken = req.cookies['refresh_token'];
        const accessToken = req.cookies['access_token'];

        if (!accessToken || !refreshToken) return res.status(401).json({ "status": "error", "message": "Unauthorized. Missing refresh token and access token" });

        try {
            jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!);
            return next();
        }
        catch (e: any) {
            if (e instanceof jwt.TokenExpiredError) {
                return res.status(401).json({"status": "error", "message": "Expired access token"});
            }
            return res.status(401).json({ "status": "error", "message": "Unauthorized" });
        }
    }
    catch (e) {
        console.log(e);
        return res.status(500).json({ "status": "error", "message": "Error during authentication" });
    }
}

export const getRefreshMiddleware = (req: Request, res: Response, next: NextFunction) => {
    try{
        const refreshToken = req.cookies['refresh_token'];
        if(!refreshToken) return res.status(400).json({"status": "error", "message": "Couldn't find refresh token"});

        // append the refresh token to the request body
        req.body['refresh_token'] = refreshToken as string;
        return next();
    }
    catch(e){
        console.log(e);
        return res.status(500).json({"status": "error", "message": "Error during authentication"});
    }
}

export default authMiddleware;
import { getDatabase } from "../db/conn.js"
import { Users } from "../schema/user.schema.js";
import jwt from "jsonwebtoken";
import type {Request, Response} from 'express';
import { eq } from "drizzle-orm";
import type { TokenPayload } from "../types/token.type.js";

const getAccountDetails = async (req: Request, res: Response) => {
    const db = getDatabase();
    const accessToken = req.cookies['access_token'];

    const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET!) as TokenPayload;
    const result = await db.select().from(Users).where(eq(Users.id, decoded.userId));

    res.status(200).json({"status": "success", "message": "successfully retrieved account details", "data": result[0]});
}

export {getAccountDetails}
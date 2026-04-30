import * as dotenv from "dotenv";
import type { Request, Response } from "express";
import { generateCodeChallenge, generateRandomString } from "../util/code_generators.js";
import { Users, type CreateUser } from "../schema/user.schema.js";
import { getDatabase } from "../db/conn.js";
import { eq } from "drizzle-orm";

dotenv.config({ quiet: true });

const createUser = async (payload: CreateUser) => {
    const db = getDatabase();
    // const result = await db.insert(Users).values(payload).returning();
}

const githubAuth = async (req: Request, res: Response) => {
    try {
        const redirectUrl = `http://localhost:4000/api/auth/github/callback`;
        const clientId = process.env.GITHUB_CLIENT_ID;
        if(!clientId) return res.status(500).json({ "status": "error", "message": "Upstream or server error" });

        const codeVerifier = generateRandomString(50); // create code verifier of length 50
        const codeChallenge = await generateCodeChallenge(codeVerifier);
        const state = crypto.randomUUID();

        var queries = new URLSearchParams({
            "client_id": clientId,
            "redirect_uri": redirectUrl,
            "scope": "user:email read:user", 
            "state": state, 
            "code_challenge": codeChallenge, 
            "code_challenge_method": "S256"
        });

        const url = `https://github.com/login/oauth/authorize?${queries}`;

        res.cookie('code_verifier', codeVerifier, {
            httpOnly: true, 
            secure: true, 
            signed: true, 
            sameSite: 'lax', 
            maxAge: 5 * 60 * 60
        });

        res.cookie('code_state', state, {
            httpOnly: true, 
            secure: true, 
            signed: true, 
            sameSite: 'lax', 
            maxAge: 5 * 60 * 60
        })
        
        res.redirect(url);
    }
    catch (err: any) {
        console.error(err.message);
        return res.status(500).json({ "status": "error", "message": "Upstream or server error" });
    }
};

const githubAuthCallback = async (req: Request, res: Response) => {
    const { code } = req.query as { code: string };

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // get the code verifier
    const verifier = req.signedCookies.code_verifier as string;
    const state = req.signedCookies.code_state as string;
    if(!verifier) return res.status(500).json({"status": "error", "message": "Upstream or server error"});
    if(!state) return res.status(500).json({"status": "error", "message": "Upstream or server failure"});

    const tokenData = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            headers: {
                'Accept': 'application/json', 
                'Content-Type': 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                code_verifier: verifier, 
                state
            })
        }
    ).then(res => res.json());
    const accessToken = tokenData.access_token;


    const userData = await fetch(
        'https://api.github.com/user',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    ).then(r => r.json());


    const emailData = await fetch(
        'https://api.github.com/user/emails',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    ).then(r=>r.json());
    const email = emailData.find((e: any) => e.primary && e.verified)?.email;

    // retrieve or create user....
    const db = getDatabase();

    const user = await db.select().from(Users).where(eq(Users.email, email));
    if(!user){
        // create user
        const payload: CreateUser = {
            email, 
            github_id: userData.id as string, 
            username: userData.name as string, 
            avatar_url: userData.avatar_url as string, 
            is_active: true,
            last_login_at: new Date(),
        };
        await createUser(payload);
    }

    res.redirect(`http://localhost:5173/`);
}

export { githubAuth, githubAuthCallback }
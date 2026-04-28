import * as dotenv from "dotenv";
import type { Request, Response } from "express";
import { generateCodeChallenge, generateRandomString } from "../util/code_generators.js";

dotenv.config({ quiet: true });

const githubAuth = async (req: Request, res: Response) => {
    try {
        const redirectUrl = `http://localhost:4000/api/auth/github/callback`;
        const clientId = process.env.GITHUB_CLIENT_ID;
        if(!clientId) return res.status(500).json({ "status": "error", "message": "Upstream or server error" });

        console.log('I was hit');

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
        res.redirect(url);
    }
    catch (err: any) {
        console.log(err.message);
        return res.status(500).json({ "status": "error", "message": "Upstream or server error" });
    }
};

const githubAuthCallback = async (req: Request, res: Response) => {
    const { code } = req.query as { code: string };
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // get the code verifier
    const verifier = req.signedCookies.code_verifier as string;
    if(!verifier) return res.status(500).json({"status": "error", "message": "Upstream or server error"});

    const tokenResponse = await fetch(
        'https://github.com/login/oauth/access_token',
        {
            headers: {
                Accept: 'application/json'
            },
            method: 'POST',
            body: JSON.stringify({
                client_id: clientId,
                client_secret: clientSecret,
                code,
                code_verifier: verifier
            })
        }
    );

    const responseData = await tokenResponse.json();
    const accessToken = responseData.access_token;

    const userReponse = await fetch(
        'https://api.github.com/user',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );
    const userData = await userReponse.json();


    const emailResponse = await fetch(
        'https://api.github.com/user/emails',
        {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    );
    const emailData = await emailResponse.json();
    console.log(emailData);
    const email = emailData.find((e: any) => e.primary && e.verified)?.email;

    console.log(`Github user: `, {
        name: userData.name,
        email
    });

    res.redirect(`http://localhost:5173/home`);
}

export { githubAuth, githubAuthCallback }
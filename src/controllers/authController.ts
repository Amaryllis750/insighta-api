import * as dotenv from "dotenv";
import type { Request, Response } from "express";

dotenv.config({quiet: true});

const githubAuth = async (_req: Request, res: Response) => {
    const redirectUrl = `http://localhost:4000/api/auth/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID;

    console.log('I was hit');

    const url = `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUrl}&scope=user:email%20read:user`;

    res.redirect(url);
};

const githubAuthCallback = async (req: Request, res: Response) => {
    const { code } = req.query as { code: string };
    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

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
                code
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

export {githubAuth, githubAuthCallback}
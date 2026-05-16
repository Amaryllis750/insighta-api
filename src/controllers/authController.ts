import jwt from 'jsonwebtoken';
import * as dotenv from 'dotenv';
import type { Request, Response } from 'express';
import { generateCodeChallenge, generateRandomString } from '../util/code_generators.js';
import { Users, type CreateUser } from '../schema/user.schema.js';
import { getDatabase } from '../db/conn.js';
import { eq } from 'drizzle-orm';
import Tokens from '../schema/tokens.schema.js';
import type { TokenPayload } from '../types/token.type.js';

dotenv.config({ quiet: true });

const generateRefreshToken = (user: TokenPayload) => {
  if (!process.env.REFRESH_TOKEN_SECRET) throw Error("Token secret or expiration is not set");
  return jwt.sign(user, process.env.REFRESH_TOKEN_SECRET!, { expiresIn: '5m' });
}


const generateAccessToken = (user: TokenPayload) => {
  if (!process.env.ACCESS_TOKEN_SECRET) throw Error("Token secret or expiration is not set");
  return jwt.sign(user, process.env.ACCESS_TOKEN_SECRET!, { expiresIn: '3m' });
}

const githubAuth = async (req: Request, res: Response) => {
  try {
    const redirectUrl = `http://localhost:4000/auth/github/callback`;
    const clientId = process.env.GITHUB_CLIENT_ID;
    if (!clientId)
      return res.status(500).json({ status: 'error', message: 'Upstream or server error' });

    const codeVerifier = generateRandomString(50); // create code verifier of length 50
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = crypto.randomUUID();

    var queries = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUrl,
      scope: 'user:email read:user',
      state: state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    const url = `https://github.com/login/oauth/authorize?${queries}`;

    res.cookie('code_verifier', codeVerifier, {
      httpOnly: true,
      secure: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 60,
    });

    res.cookie('code_state', state, {
      httpOnly: true,
      secure: true,
      signed: true,
      sameSite: 'lax',
      maxAge: 5 * 60 * 60,
    });

    res.redirect(url);
  } catch (err: any) {
    console.error(err.message);
    return res.status(500).json({ status: 'error', message: 'Upstream or server error' });
  }
};

const githubAuthCallback = async (req: Request, res: Response) => {
  try {
    const { code } = req.query as { code: string };

    const clientId = process.env.GITHUB_CLIENT_ID;
    const clientSecret = process.env.GITHUB_CLIENT_SECRET;

    // get the code verifier
    const verifier = req.signedCookies.code_verifier as string;
    const state = req.signedCookies.code_state as string;
    if (!verifier) {
      console.log('no verifier')
      return res.status(500).json({ status: 'error', message: 'Upstream or server error' });
    }
    if (!state) {
      console.log('no state')
      return res.status(500).json({ status: 'error', message: 'Upstream or server failure' });
    }

    const tokenData = await fetch('https://github.com/login/oauth/access_token', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      method: 'POST',
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        code_verifier: verifier,
        state,
      }),
    }).then((res) => res.json()); 
    const githubAccessToken = tokenData.access_token;

    const userData = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
      },
    }).then((r) => r.json());

    const emailData = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${githubAccessToken}`,
      },
    }).then((r) => r.json());
    const email = emailData.find((e: any) => e.primary && e.verified)?.email;

    // retrieve or create user....
    const db = getDatabase();

    let result = await db.select().from(Users).where(eq(Users.email, email));
    if (result.length === 0) {
      // create user
      const payload: CreateUser = {
        email,
        github_id: userData.id as string,
        username: userData.name as string,
        avatar_url: userData.avatar_url as string,
        is_active: true,
        last_login_at: new Date(),
      };
      result = await db.insert(Users).values(payload).returning();
    }
    const user = result[0];
    if (!user || user == undefined) return res.status(500).json({ "status": "error", "message": "Upstream or server error" });

    // generate access tokens and refresh tokens
    const accessToken = generateAccessToken({ userId: user!.id });
    const refreshToken = generateRefreshToken({ userId: user!.id });

    await db.insert(Tokens).values({ refresh_token: refreshToken, user_id: user!.id }).onConflictDoUpdate({
      target: Tokens.user_id,
      set: { refresh_token: refreshToken }
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000, // 3 minutes per spec
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes per spec
    });

    res.redirect("http://localhost:5173/");

  }
  catch (e: any) {
    console.log('The error is: ', e);
    return res.status(500).json({ "status": "error", "message": "Upstream or server error" });
  }
};

const refresh = async (req: Request, res: Response) => {
  try {
    const { refresh_token: refreshToken } = req.body as { refresh_token: string };
    if (!refreshToken || typeof refreshToken !== "string") return res.status(400).json({ status: "error", message: "Missing refreshToken in request body" });

    const db = getDatabase();
    const result = await db.select().from(Tokens).where(eq(Tokens.refresh_token, refreshToken));

    if (result.length === 0) return res.status(404).json({ status: "error", message: "Refresh Token not found" });  // this means that the user has logged out before
    if (result && result[0]?.refresh_token !== refreshToken) res.status(400).json({status: "error", message: "Refresh Token already rotated"});

    // decode the refresh token, if the token is invalid or expired, it will throw and error and the user will be logged out
    const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
  

    // create new refresh tokens and access tokens
    const token = result[0]!;
    const newAccessToken = generateAccessToken({ userId: token.user_id! });
    const newRefreshToken = generateRefreshToken({ userId: token.user_id! });

    await db.update(Tokens).set({refresh_token: newRefreshToken}).where(eq(Tokens.refresh_token, refreshToken));

    res.cookie('access_token', newAccessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 3 * 60 * 1000, // 3 minutes per spec
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 5 * 60 * 1000, // 5 minutes per spec
    });

    return res.status(200).json({ status: "success", message: "Successfully created refresh tokens", access_token: newAccessToken, refresh_token: refreshToken });
  }
  catch (e) {
    console.log(e);
    if(e instanceof jwt.TokenExpiredError){
      return res.status(401).json({status: "error", message: "Refresh token expired"});
    }
    else if (e instanceof jwt.JsonWebTokenError){
      return res.status(401).json({status: "error", message: "Invalid refresh token"});
    }
    return res.status(500).json({ status: "error", message: "Upstream or server error" });
  }
}

export { githubAuth, githubAuthCallback, refresh };

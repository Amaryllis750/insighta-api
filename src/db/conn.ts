import { Pool } from "pg";
import dotenv from 'dotenv';
import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";

dotenv.config({ quiet: true });


let pool: Pool | undefined;
let db: NodePgDatabase<Record<string, never>> & {
    $client: Pool;
}


const getPool = () => {
    if (pool) return pool;

    const { DB_HOST, DB_PASSWORD, DB_NAME, DB_USER, DB_PORT, DB_URL } = process.env;

    if (DB_URL) {
        pool = new Pool({ connectionString: DB_URL, ssl: { rejectUnauthorized: false } });
        return pool;
    }

    if (!DB_HOST || !DB_PASSWORD || !DB_NAME || !DB_USER || !DB_PORT) {
        throw new Error("Database credentials are not defined");
    }

    pool = new Pool({
        host: DB_HOST,
        user: DB_USER,
        password: DB_PASSWORD,
        port: Number(DB_PORT),
        database: DB_NAME
    });

    return pool;
}


const getDatabase = () => {
    if (db) return db;

    const pgPool = getPool();
    db = drizzle({client: pgPool});

    return db;
}


export { getPool, getDatabase };
import {pgTable, uuid, text, pgEnum, boolean, timestamp} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm/sql/sql';

export const RolesEnum = pgEnum("roles", ['admin', 'analyst']);

const Users = pgTable("users", {
    id: uuid("id").primaryKey().default(sql`uuid_generate_v7()`), 
    github_id: text("github_id").notNull(), 
    username: text("username").notNull(), 
    email: text("email").unique().notNull(), 
    avatar_url: text("avatar_url"), 
    role: RolesEnum().default("analyst"), 
    is_active: boolean().default(true), 
    last_login_at: timestamp('last_login_at', {withTimezone: true}), 
    created_at: timestamp('created_at', {withTimezone: true}).defaultNow()
});

type CreateUser = typeof Users.$inferInsert;


export {Users};
export type {CreateUser}

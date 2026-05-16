import { pgTable, text, uuid, timestamp } from "drizzle-orm/pg-core";
import {sql} from 'drizzle-orm/sql/sql';
import { Users } from "./user.schema.js";

const Tokens = pgTable('tokens', {
    id: uuid('id').primaryKey().default(sql`uuid_generate_v7()`).notNull(), 
    refresh_token: text('refresh_token').notNull(), 
    user_id: uuid('user_id').references(() => Users.id).unique(), 
    created_at: timestamp('created_at', {withTimezone: true}).defaultNow()
});

export default Tokens;
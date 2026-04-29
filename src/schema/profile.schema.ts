import {pgTable, uuid, integer, text, real, date, timestamp} from 'drizzle-orm/pg-core';

const Profiles = pgTable("profiles", {
    id: uuid("id").primaryKey().defaultRandom(), 
    name: text("name").unique().notNull(), 
    gender: text("gender").notNull(), 
    gender_probability: real("gender_probability").notNull(),
    age: integer("age").notNull(), 
    age_group: text("age_group").notNull(), 
    country_id: text("country_id").notNull(), 
    country_probability: real("country_probability").notNull(),
    country_name: text("country_name").notNull(),
    created_at: timestamp("created_at", {withTimezone: true}).notNull().defaultNow()
});

export {Profiles};
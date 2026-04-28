import { z } from "zod";

const getProfileQuerySchema = z.object({
    gender: z.enum(["male", "female"]).optional(),
    country_id: z.string().toLowerCase().optional(),
    age_group: z.string().toLowerCase().optional(),
    min_age: z.coerce.number().optional(),
    max_age: z.coerce.number().optional(),
    min_gender_probability: z.coerce.number().optional(),
    min_country_probability: z.coerce.number().optional(),
    sort_by: z.enum(["age", "created_at", "gender_probability"]).optional(),
    order: z.enum(["asc", "desc"]).optional(),
    page: z.coerce.number().optional(),
    limit: z.coerce.number().optional(),
}).strict();

const searchProfileQuerySchema = z.object({
    q: z.string().toLowerCase(),
    page: z.coerce.number().optional(), 
    limit: z.coerce.number().optional()
});

export {getProfileQuerySchema, searchProfileQuerySchema};
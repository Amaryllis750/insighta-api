import type { Request, Response } from 'express';
import type { NameMeta } from '../model/nameMeta.js';
import { getDatabase } from '../db/conn.js';
import { Profiles } from '../schema/profile.schema.js';
import { and, asc, count, desc, eq, gt, lt } from 'drizzle-orm';
import { getCountryData } from 'countries-list';
import { parseSearchQuery } from '../util/parser.js';
import { getProfileQuerySchema, searchProfileQuerySchema } from '../model/profile.validator.js';

type Status = {
  status: 'success' | 'failure';
  data?: NameMeta;
  errorApi?: 'Genderize' | 'Agify' | 'Nationalize';
};

type Country = {
  country_id: string;
  probability: number;
};

const classifyAge = (age: number): 'child' | 'teenager' | 'adult' | 'senior' | 'invalid' => {
  if (age >= 0 && age <= 12) return 'child';
  if (age > 12 && age <= 19) return 'teenager';
  if (age > 19 && age <= 59) return 'adult';
  if (age > 60) return 'senior';
  else return 'invalid'; // when the age is less than 0
};

const getNameMetaInformation = async (name: string): Promise<Status> => {
  const genderResponse = await fetch(`https://api.genderize.io?name=${name}`);
  const genderData = await genderResponse.json();
  if (!genderData.gender || genderData.count == 0) {
    return { status: 'failure', errorApi: 'Genderize' };
  }

  const ageResponse = await fetch(`https://api.agify.io?name=${name}`);
  const ageData = await ageResponse.json();

  if (!ageData.age) return { status: 'failure', errorApi: 'Agify' };
  const ageGroup = classifyAge(Number(ageData.age));
  if (ageGroup == 'invalid') return { status: 'failure', errorApi: 'Agify' };

  const nationalityResponse = await fetch(`https://api.nationalize.io?name=${name}`);
  const nationalityData = await nationalityResponse.json();
  if (!nationalityData.country) return { status: 'failure', errorApi: 'Nationalize' };
  // get the country with the highest probability
  const country = nationalityData.country.reduce((acc: Country, current: Country) =>
    current.probability > acc.probability ? current : acc,
  );
  const countryName = getCountryData(country.country_id).name;

  const data: NameMeta = {
    name,
    gender: genderData.gender.toLowerCase(),
    gender_probability: genderData.probability,
    sample_size: genderData.count,
    age: ageData.age,
    age_group: ageGroup,
    country_id: country.country_id.toLowerCase(),
    country_name: countryName.toLowerCase(),
    country_probability: country.probability,
  };

  return { status: 'success', data };
};

const createProfile = async (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const nameRegex = /^[a-zA-Z'-]+$/;
    let name = req.body.name;

    if (!name)
      return res.status(400).json({ status: 'error', message: 'Missing name or bad name' });
    if (typeof name !== 'string')
      return res.status(400).json({ status: 'error', message: 'Name should be a string' });
    if (!nameRegex.test(name))
      return res.status(422).json({ status: 'error', message: 'Unprocessable entity' });

    name = name.toLowerCase();
    const result = await getNameMetaInformation(name);
    if (result.status === 'failure') {
      return res
        .status(502)
        .json({ status: 'error', message: `${!result.errorApi} returned an invalid response` });
    }
    const response = result.data!;

    // check if the name exists in the database
    const existing = await db.select().from(Profiles).where(eq(Profiles.name, name));
    if (existing.length > 0)
      return res
        .status(200)
        .json({ status: 'success', message: 'Profile already exists', data: existing[0] });

    const inserted = await db
      .insert(Profiles)
      .values({
        name: response.name,
        gender: response.gender as string,
        gender_probability: response.gender_probability,
        age: response.age,
        age_group: response.age_group as string,
        country_id: response.country_id,
        country_probability: response.country_probability,
        country_name: response.country_name,
      })
      .returning();

    return res.status(201).json({ status: 'success', data: inserted[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Upstream or server failure' });
  }
};

const getAllProfiles = async (req: Request, res: Response) => {
  try {
    const query = getProfileQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ status: 'error', message: 'Invalid query parameters' });
    }

    const {
      gender,
      country_id,
      age_group,
      min_age,
      max_age,
      min_gender_probability,
      min_country_probability,
      sort_by,
      order,
      page,
      limit,
    } = query.data;
    const pageNumber = page ? page : 1;
    const limitNumber = limit ? (limit >= 10 && limit <= 50 ? limit : 10) : 10;

    const db = getDatabase();

    const sortColumn =
      sort_by === 'age'
        ? Profiles.age
        : sort_by === 'gender_probability'
          ? Profiles.gender_probability
          : Profiles.created_at;

    const sortOrder = sort_by ? (order === 'desc' ? desc(sortColumn) : asc(sortColumn)) : undefined;

    const result = await db
      .select()
      .from(Profiles)
      .where(
        and(
          gender ? eq(Profiles.gender, gender) : undefined,
          age_group ? eq(Profiles.age_group, age_group) : undefined,
          country_id ? eq(Profiles.country_id, country_id) : undefined,
          min_age ? gt(Profiles.age, min_age) : undefined,
          max_age ? lt(Profiles.age, max_age) : undefined,
          min_gender_probability
            ? gt(Profiles.gender_probability, min_gender_probability)
            : undefined,
          min_country_probability
            ? lt(Profiles.country_probability, min_country_probability)
            : undefined,
        ),
      )
      .orderBy(...(sortOrder ? [sortOrder] : []))
      .limit(limitNumber)
      .offset((pageNumber - 1) * limitNumber);

    const rowCount = await db
      .select({ count: count() })
      .from(Profiles)
      .where(
        and(
          gender ? eq(Profiles.gender, gender) : undefined,
          age_group ? eq(Profiles.age_group, age_group) : undefined,
          country_id ? eq(Profiles.country_id, country_id) : undefined,
          min_age ? gt(Profiles.age, min_age) : undefined,
          max_age ? lt(Profiles.age, max_age) : undefined,
          min_gender_probability
            ? gt(Profiles.gender_probability, min_gender_probability)
            : undefined,
          min_country_probability
            ? lt(Profiles.country_probability, min_country_probability)
            : undefined,
        ),
      );
    const totalPages = Math.ceil((rowCount[0]?.count ?? 2026) / limitNumber);

    return res.status(200).json({
      status: 'success',
      page: pageNumber,
      limit: limitNumber,
      total: rowCount[0]?.count ?? 2026,
      data: result,
      total_pages: totalPages,
      links: {
        self: `/api/profiles?page=${pageNumber}&limit=${limitNumber}`,
        next:
          pageNumber == totalPages
            ? null
            : `/api/profiles?page=${pageNumber + 1}&limit=${limitNumber}`,
        prev: pageNumber == 1 ? null : `/api/profiles?page=${pageNumber - 1}&limit=${limitNumber}`,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Upstream or server failure' });
  }
};

const getProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    const result = await db
      .select()
      .from(Profiles)
      .where(eq(Profiles.id, id as string));

    return res.status(200).json({ status: 'success', data: result[0] });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Upstream or server failure' });
  }
};

const deleteProfile = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const db = getDatabase();
    await db.delete(Profiles).where(eq(Profiles.id, id as string));

    return res.sendStatus(204);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Upstream or server failure' });
  }
};

const searchProfiles = async (req: Request, res: Response) => {
  try {
    const query = searchProfileQuerySchema.safeParse(req.query);
    if (!query.success) {
      return res.status(400).json({ status: 'error', message: 'Invalid query parameters' });
    }
    const { q, page, limit } = query.data;

    const pageNumber = page ? page : 1;
    const limitNumber = limit ? (limit > 0 && limit <= 50 ? limit : 10) : 10;

    const db = getDatabase();
    const parseResult = parseSearchQuery(q);

    if (parseResult.noTokensFound)
      return res.status(400).json({ status: 'error', message: 'Unable to interpret query' });

    const filter = parseResult.filters!;

    const filters = [
      filter.gender ? eq(Profiles.gender, filter.gender) : undefined,
      filter.min_age ? gt(Profiles.age, filter.min_age) : undefined,
      filter.max_age ? lt(Profiles.age, filter.max_age) : undefined,
      filter.age_group ? eq(Profiles.age_group, filter.age_group) : undefined,
      filter.country_id ? eq(Profiles.country_id, filter.country_id) : undefined,
    ].filter(Boolean);

    const [totalResult] = await db
      .select({ count: count() })
      .from(Profiles)
      .where(and(...filters));

    const totalCount = totalResult?.count;
    const totalPages = Math.ceil(totalCount! / limitNumber);

    // 3. Get the Paginated Data
    const result = await db
      .select()
      .from(Profiles)
      .where(and(...filters))
      .limit(limitNumber)
      .offset((pageNumber - 1) * limitNumber);

    return res.status(200).json({
      status: 'success',
      page: pageNumber,
      limit: limitNumber,
      total: totalCount!,
      data: result,
      total_pages: totalPages,
      links: {
        self: `/api/profiles/search?page=${pageNumber}&limit=${limitNumber}`,
        next:
          pageNumber == totalPages
            ? null
            : `/api/profiles/search?page=${pageNumber + 1}&limit=${limitNumber}`,
        prev:
          pageNumber == 1
            ? null
            : `/api/profiles/search?page=${pageNumber - 1}&limit=${limitNumber}`,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ status: 'error', message: 'Server failure' });
  }
};

export { createProfile, getProfile, deleteProfile, getAllProfiles, searchProfiles };

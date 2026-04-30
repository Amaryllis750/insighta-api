import { extractAge } from './age_functions.js';
import { extractGender } from './gender_functions.js';
import { extractCountry } from './country_function.js';

export function parseSearchQuery(query: string) {
  if (!query?.trim()) return {};

  const normalized = query.trim().toLowerCase();
  const tokens = normalized.split(/[\s,]+/).filter(Boolean);

  const filters: {
    gender?: string;
    age_group?: string;
    min_age?: number;
    max_age?: number;
    country_id?: string;
  } = {};
  let tokensRecognized = false;

  const gender = extractGender(tokens);
  if (gender.size > 0) {
    tokensRecognized = true;
    if (gender.size === 1) filters.gender = [...gender][0]!;
  }

  const age = extractAge(normalized, tokens);
  if (age.age_group || age.min || age.max) {
    tokensRecognized = true;
    if (age.age_group) filters.age_group = age.age_group;
    if (age.min) filters.min_age = age.min;
    if (age.max) filters.max_age = age.max;
  }

  const country = extractCountry(normalized, tokens);
  if (country) {
    tokensRecognized = true;
    filters.country_id = country.toLowerCase();
  }

  if (!tokensRecognized) return { noTokensFound: true };

  return { filters };
}

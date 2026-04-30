import { countries } from 'countries-list';

const COUNTRY_NAME_TO_CODE = Object.entries(countries).reduce(
  (acc: Record<string, string>, [code, data]) => {
    acc[data.name.toLowerCase()] = code;
    return acc;
  },
  {},
);

const MULTI_WORD_COUNTRIES = Object.keys(COUNTRY_NAME_TO_CODE).filter((name) => name.includes(' '));

function matchMultiWord(query: string) {
  const lowerQuery = query.toLowerCase();
  for (const name of MULTI_WORD_COUNTRIES) {
    if (lowerQuery.includes(name)) return COUNTRY_NAME_TO_CODE[name];
  }
  return null;
}

function matchSingleWord(tokens: string[]) {
  for (const token of tokens) {
    const lowerToken = token.toLowerCase();
    if (COUNTRY_NAME_TO_CODE[lowerToken]) {
      return COUNTRY_NAME_TO_CODE[lowerToken];
    }
  }
  return null;
}

export function extractCountry(query: string, tokens: string[]) {
  return matchMultiWord(query) ?? matchSingleWord(tokens);
}

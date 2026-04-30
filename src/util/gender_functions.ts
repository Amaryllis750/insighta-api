const GENDER_MAP = {
  male: 'male',
  males: 'male',
  man: 'male',
  men: 'male',
  boy: 'male',
  boys: 'male',
  gentleman: 'male',
  gentlemen: 'male',
  female: 'female',
  females: 'female',
  woman: 'female',
  women: 'female',
  girl: 'female',
  girls: 'female',
  lady: 'female',
  ladies: 'female',
};

export function extractGender(tokens: string[]): Set<string> {
  const found = new Set<string>();

  for (const token of tokens) {
    const mapped = GENDER_MAP[token as keyof typeof GENDER_MAP];
    if (mapped) {
      found.add(mapped);
    }
  }

  return found;
}

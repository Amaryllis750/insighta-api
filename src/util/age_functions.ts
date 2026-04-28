const AGE_MAP = {
    young: { min: 16, max: 24 },
    child: { min: 0, max: 2 },
    teenager: { min: 13, max: 19 },
    adult: { min: 20, max: 59 },
    senior: { min: 60, max: Infinity }
};



function extractAgeRange(query: string) {
    const result: { min?: number, max?: number, age_group?: string } = {};

    // rank explicit age specifications above age group
    const between = query.match(/between\s+(\d+)\s+and\s+(\d+)/i);
    if (between) {
        if(between[1]) result.min = parseInt(between[1]);
        if (between[2]) result.max = parseInt(between[2]);
        return result; // between is unambiguous — skip further checks
    }

    const minMatch = query.match(
        /(?:above|over|older than|at least|minimum of?|from)\s+(\d+)/i
    );
    if (minMatch && minMatch[1]) result.min = parseInt(minMatch[1]);

    const maxMatch = query.match(
        /(?:below|under|younger than|at most|maximum of?|up to)\s+(\d+)/i
    );
    if (maxMatch && maxMatch[1]) result.max = parseInt(maxMatch[1] ?? "100");

    return result;
}

function extractAgeGroup(tokens: string[], explicit: {min?:number, max?: number, age_group?:string}) {
  const result = { ...explicit };

  for(const token of tokens){
    if(token in AGE_MAP){
        const group = token as keyof typeof AGE_MAP;
        if(group != "young") result.age_group = group;
        if(!result.min) result.min = AGE_MAP[group].min;
        if(!result.max) result.max = AGE_MAP[group].max;

        break;
    }
  }

  return result;
}

export function extractAge(query: string, tokens: string[]){
    const explicit = extractAgeRange(query);
    const result = extractAgeGroup(tokens, explicit);
    
    return result;
}
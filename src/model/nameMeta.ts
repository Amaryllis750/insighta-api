type NameMeta = {
  name: string;
  gender: 'male' | 'female';
  gender_probability: number;
  sample_size: number;
  age: number;
  age_group: 'child' | 'teenager' | 'adult' | 'senior';
  country_id: string;
  country_probability: number;
  country_name: string;
};

type NameMetaRecord = NameMeta & { id: string; created_at: string };

export type { NameMeta, NameMetaRecord };

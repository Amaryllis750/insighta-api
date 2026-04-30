import { Profiles } from "../schema/profile.schema.js";
import { getDatabase } from "./conn.js";
import seedProfiles from "./seed_profiles.json" with {type: "json"};

const seedDatabase = async () => {
    const db = getDatabase();

    const profilesData = seedProfiles.profiles;
    const records = profilesData.map(profile => ({...profile, name: profile.name.toLowerCase(), country_id: profile.country_id.toLowerCase()}));

    await db.insert(Profiles).values(records).onConflictDoNothing({target: Profiles.name});
}

await seedDatabase();
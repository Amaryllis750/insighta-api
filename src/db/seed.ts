import { profiles } from "../schema/profile.schema.js";
import { getDatabase } from "./conn.js";
import seedProfiles from "./seed_profiles.json" with {type: "json"};

const seedDatabase = async () => {
    const db = getDatabase();

    const profilesData = seedProfiles.profiles;
    const records = profilesData.map(profile => ({...profile, name: profile.name.toLowerCase(), country_id: profile.country_id.toLowerCase()}));

    await db.insert(profiles).values(records).onConflictDoNothing({target: profiles.name});
}

await seedDatabase();
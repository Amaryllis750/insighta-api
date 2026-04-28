# Intelligence Query API
## Overview
This is a RESTful API built with Node.js+Express for managing meta information on names. It provides `GET`, `POST`, and `DELETE` operations with proper error handling. It includes features such as pagination, sorting and natural language querying for filtering.

## Project Structure
```
stage_2
├── package.json
├── package-lock.json
├── README.md
├── src
│   ├── controllers
│   │   └── profileController.ts
│   ├── db
│   │   ├── conn.ts
│   │   ├── seed_profiles.json
│   │   └── seed.ts
│   ├── model
│   │   └── nameMeta.ts
│   ├── routes
│   │   └── profileRoute.ts
│   ├── schema
│   │   └── profile.schema.ts
│   ├── server.ts
│   └── util
│       └── parser.ts
└── tsconfig.json
```

## Technologies Used
- Node.js
- Express
- Typescipt
- Drizzle ORM

## Installation
NOTE: You should have `git` and `node` installed already
1. clone the repository
```bash
git clone git@github.com:Amaryllis750/hng14-stage1-profileapi.git
cd hng14-stage1-profileapi
```

2. Install dependencies
```bash 
npm install 
```

## Running the server
To run the server in development mode
``` bash
npm run dev
```

NOTE: You can start the server in production mode using
```bash
npm run start
```
But you must build the project first with `npm run build`


## Seeding the database
To seed the databse, run:
```bash 
npm run seed
```

## Environment Variables
- `DB_HOST` The host where the database is on
- `DB_PASSWORD` Password to access the database
- `DB_NAME` Name of the database to access
- `DB_USER` User to access the database with
- `DB_PORT` Port to access the database on
- `DB_URL` Url where the database can be accessed (Alternative to using the remaining variables)



## Schemas
### Profile Schema
| Column | Type | Nullable | Example |
|---|---|---|---|
| `id` | UUID | No | `019d98fa-3f2c-7316-acc9-338738a1faa2` |
| `name` | VARCHAR | No | `daniel` |
| `gender` | ENUM(`male`, `female`) | Yes | `male` |
| `gender_probability` | FLOAT | Yes | `null` |
| `sample_size` | INT | No | `2466344` |
| `age` | INT | Yes | `58` |
| `age_group` | ENUM(`child`, `teenager`, `adult`, `elderly`) | Yes | `adult` |
| `country_id` | CHAR(2) | No | `ro` |
| `country_probability` | FLOAT | Yes | `null` |
| `created_at` | TIMESTAMP | No | `2026-04-17T01:07:10.247Z` |

## API Endpoints
### Create a new profile for a name  `POST /api/profiles`
#### Request Sample:

```json
{
    "name": "daniel"
}
```

#### Response Sample: 
1. Already Existing Name
```json
{
  "status": "success",
  "message": "Profile already exists",
  "data": {
    "id": "019dbaac-0b91-755d-beb7-8a9b1a246b06",
    "name": "daniel",
    "gender": "male",
    "gender_probability": 0.99,
    "age": 58,
    "age_group": "adult",
    "country_id": "ro",
    "country_probability": 0.09323228,
    "created_at": "2026-04-23 15:08:50.5771Z"
  }
}
```

2. New Profile
```json
{
    "status": "success",
    "data": {
        "id": "019dbaac-0b91-755d-beb7-8a9b1a246b06",
        "name": "daniel",
        "gender": "male",
        "gender_probability": 0.99,
        "age": 58,
        "age_group": "adult",
        "country_id": "ro",
        "country_probability": 0.09323228,
        "created_at": "2026-04-23 15:08:50.577Z"
    }
}
```

###  Get a particular profile by the id `GET /api/profiles/:id`
#### Response Sample
```json
{
    "status": "success",
    "data": {
        "id": "b3f9c1e2-7d4a-4c91-9c2a-1f0a8e5b6d12",
        "name": "emmanuel",
        "gender": "male",
        "gender_probability": 0.99,
        "sample_size": 1234,
        "age": 25,
        "age_group": "adult",
        "country_id": "NG",
        "country_probability": 0.85,
        "created_at": "2026-04-01T12:00:00Z"
    }
}
```



### Get all profiles available  `GET /api/profiles`
#### Response Sample
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    },
    {
      "id": "id-2",
      "name": "sarah",
      "gender": "female",
      "age": 28,
      "age_group": "adult",
      "country_id": "US"
    }
  ]
}
```

### Delete profile by Id `DELETE /api/profiles/:id`
Returns 204 on success

### Search Profile with Natural Language `GET api/profiles/search?q=<query>`
#### Response Sample
```json
{
  "status": "success",
  "count": 2,
  "data": [
    {
      "id": "id-1",
      "name": "emmanuel",
      "gender": "male",
      "age": 25,
      "age_group": "adult",
      "country_id": "NG"
    },
    {
      "id": "id-2",
      "name": "sarah",
      "gender": "female",
      "age": 28,
      "age_group": "adult",
      "country_id": "US"
    }
  ]
}
```

## Parsing Rules
The parser relies greatly on regex to parse query strings. These are some of the rules it follows
### 1. Age Rules
`NOTE`: The parser parses explicit ages first before parsing age group descriptions i.e the parser would parse "between 10 and 17" before "parsing young"
| Input pattern | Example query | `min` | `max` | `age_group` |
|---|---|---|---|---|
| `between X and Y` | "between 20 and 35" | `20` | `35` | — |
| `above\|over\|older than\|at least\|minimum of\|from X` | "above 30" | `30` | — | — |
| `below\|under\|younger than\|at most\|maximum of\|up to X` | "under 40" | — | `40` | — |
| `young` token | "young males" | `16` | `24` | — |
| `child` token | "children from nigeria" | `0` | `12` | `child` |
| `teenager` token | "teenagers in ghana" | `13` | `19` | `teenager` |
| `adult` token | "adult females" | `20` | `59` | `adult` |
| `senior` token | "senior men above 65" | `65` | `Infinity` | `senior` |
| group token + explicit min | "teenagers above 17" | `17` | `19` | `teenager` |
| group token + explicit max | "adults under 40" | `20` | `40` | `adult` |
| no age signal | "females from kenya" | — | — | — |

### 2. Gender Rules
The parser looks for either of the following keywords
| Input Pattern | Gender |
|---|---|
`female\|girls\|lady\|ladies\|women\|woman\|females\|girl`|`female`
`male\|males\|boys\|boy\|man\|men\|gentleman\|gentlemen`|`male`

### 3. Country Rules
The parser simply breaks the string into tokens and compares each string with a country in the case of single word countries.

In the case of countries made up of more than one token, we compile a list of double(or thriple) word countries and check if they exist in the parsed string.

The parsed country is then converted to a country code and used to search the database


## Support
For support, open an issue.
const postgres = require('postgres');
require('dotenv').config();
const sql = postgres(process.env.DATABASE_URL);
sql`SELECT 1`.then(() => console.log('Connected!')).catch(e => console.error(e)).finally(() => sql.end());

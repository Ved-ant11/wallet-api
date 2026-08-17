import postgres from 'postgres'

if(!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set')
}

const sql = postgres(process.env.DATABASE_URL, {
  ssl: process.env.NODE_ENV === 'production' ? 'require' : { rejectUnauthorized: false },
  idle_timeout: 30,
  connect_timeout: 10,
});

export type SqlInstance = typeof sql;
export default sql;

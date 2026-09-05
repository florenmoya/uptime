import { readFile } from 'node:fs/promises';
import pg from 'pg';
import { settings } from '../src/lib/config';

const url=new URL(settings().databaseUrl);
const database=decodeURIComponent(url.pathname.slice(1));
if(!/^[a-z][a-z0-9_]*$/.test(database)||['postgres','template0','template1'].includes(database)) throw new Error('Choose a dedicated application database, such as uptime.');
const adminUrl=new URL(url);adminUrl.pathname='/postgres';
const admin=new pg.Client({connectionString:adminUrl.toString(),connectionTimeoutMillis:5000});
await admin.connect();
try {
  const exists=await admin.query('SELECT 1 FROM pg_database WHERE datname=$1',[database]);
  if(!exists.rowCount) await admin.query(`CREATE DATABASE "${database}"`);
}finally {await admin.end();}
const db=new pg.Client({connectionString:url.toString()});await db.connect();
try {
  await db.query('BEGIN');
  await db.query(await readFile(new URL('../db/schema.sql',import.meta.url),'utf8'));
  const seeds=[
    ['emarket-api','emarket-svc.philgeps.gov.ph','eMarketplace','https://emarket-svc.philgeps.gov.ph/'],
    ['emarket','emarket.philgeps.gov.ph','eMarketplace','https://emarket.philgeps.gov.ph/'],
    ['fact-prod','FACT PROD','FACT','http://126.52.131.6/'],
    ['fact-uat','FACT UAT','FACT','http://136.158.228.120/'],
    ['philgeps','philgeps.gov.ph','PhilGEPS','https://philgeps.gov.ph/'],
    ['training','training.philgeps.gov.ph','PhilGEPS','https://training.philgeps.gov.ph/'],
  ];
  for (const seed of seeds) await db.query('INSERT INTO monitors(id,name,project,url) VALUES($1,$2,$3,$4) ON CONFLICT(id) DO NOTHING',seed);
  await db.query('COMMIT');
  console.log('Dedicated database ready; six monitor seeds present. Existing settings preserved.');
}catch(error){await db.query('ROLLBACK');throw error;}finally{await db.end();}

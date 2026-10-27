import { MongoClient } from 'mongodb';
const uri = process.env.MONGODB_URI;
const name = process.env.MONGODB_DB;
if (!uri || !name) throw new Error('MONGODB_URI and MONGODB_DB are required');
const client = new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
await client.connect();
try {
  const db = client.db(name);
  const validator = {$jsonSchema: {
    bsonType: 'object',
    required: ['train_number', 'category', 'note', 'tags', 'source', 'created_at'],
    properties: {
      train_number: {bsonType: 'string', pattern: '^[0-9]{4,6}$'},
      station_code: {bsonType: 'string', maxLength: 10},
      category: {enum: ['DELAY_REVIEW', 'SERVICE', 'OTHER']},
      note: {bsonType: 'string', minLength: 10, maxLength: 1000},
      tags: {bsonType: 'array', maxItems: 5, items: {bsonType: 'string', maxLength: 24}},
      source: {enum: ['illustrative_seed', 'user_entry']},
      details: {bsonType: 'object'},
      created_at: {bsonType: 'date'}
    }
  }};
  const exists = await db.listCollections({name: 'service_notes'}).hasNext();
  if (!exists) await db.createCollection('service_notes', {validator});
  else await db.command({collMod: 'service_notes', validator});
  const notes = db.collection('service_notes');
  await notes.createIndex({train_number: 1, created_at: -1});
  await notes.createIndex({category: 1, created_at: -1});
  const seed = [
    {train_number: '22160', category: 'DELAY_REVIEW', note: 'The two sampled runs have high stop delays. Review more dates before drawing a broader reliability conclusion.', tags: ['sample', 'review'], source: 'illustrative_seed', details: {sample_runs: 2, basis: 'historical sample dashboard'}, created_at: new Date('2026-10-27T00:00:00.000Z')},
    {train_number: '22499', category: 'SERVICE', note: 'This is an example analyst note for the Service Notes interface. It does not describe a verified incident.', tags: ['sample', 'interface'], source: 'illustrative_seed', details: {sample_runs: 2}, created_at: new Date('2026-10-27T00:01:00.000Z')}
  ];
  for (const item of seed) await notes.updateOne({train_number: item.train_number, source: 'illustrative_seed'}, {$setOnInsert: item}, {upsert: true});
  console.log('MongoDB ready:', {database: name, collection: 'service_notes', notes: await notes.countDocuments()});
} finally { await client.close(); }

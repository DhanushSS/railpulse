import { MongoClient, type Collection, type Document } from 'mongodb';

export type ServiceNote = {
  train_number: string;
  station_code?: string;
  category: 'DELAY_REVIEW' | 'SERVICE' | 'OTHER';
  note: string;
  tags: string[];
  source: 'illustrative_seed' | 'user_entry';
  details?: Record<string, string | number | boolean>;
  created_at: Date;
  updated_at?: Date;
  deleted_at?: Date;
};

const uri = process.env.MONGODB_URI;
const database = process.env.MONGODB_DB;
if (!uri || !database) throw new Error('MONGODB_URI and MONGODB_DB are required. See .env.example.');

const cache = globalThis as unknown as { railpulseMongoClient?: MongoClient };
const client = cache.railpulseMongoClient ?? new MongoClient(uri, { serverSelectionTimeoutMS: 3000 });
cache.railpulseMongoClient = client;

export async function notesCollection(): Promise<Collection<ServiceNote & Document>> {
  await client.connect();
  return client.db(database).collection<ServiceNote & Document>('service_notes');
}

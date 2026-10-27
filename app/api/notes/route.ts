import { notesCollection, type ServiceNote } from '../../../lib/mongo';
import { pool } from '../../../lib/db';

export const dynamic = 'force-dynamic';
const categories = ['DELAY_REVIEW', 'SERVICE', 'OTHER'] as const;
const numberPattern = /^[0-9]{4,6}$/;
const stationPattern = /^[A-Z0-9]{1,10}$/;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const train = url.searchParams.get('train') ?? '';
  const category = url.searchParams.get('category') ?? '';
  if (train && !numberPattern.test(train)) return Response.json({error: 'Invalid train number'}, {status: 400});
  if (category && !categories.includes(category as typeof categories[number])) return Response.json({error: 'Invalid category'}, {status: 400});
  try {
    const collection = await notesCollection();
    const filter: {train_number?: string; category?: ServiceNote['category']} = {};
    if (train) filter.train_number = train;
    if (category) filter.category = category as ServiceNote['category'];
    const docs = await collection.find(filter).sort({created_at: -1}).limit(50).toArray();
    return Response.json({notes: docs.map(({_id, ...note}) => ({id: _id.toString(), ...note}))});
  } catch {
    return Response.json({error: 'Service Notes database unavailable'}, {status: 503});
  }
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = request.headers.get('origin');
  if (!['localhost', '127.0.0.1'].includes(url.hostname) || origin !== url.origin) {
    return Response.json({error: 'Local access required'}, {status: 403});
  }
  let body: unknown;
  try { body = await request.json(); } catch { return Response.json({error: 'Invalid JSON'}, {status: 400}); }
  if (!body || typeof body !== 'object' || Array.isArray(body)) return Response.json({error: 'Invalid note'}, {status: 400});
  const input = body as Record<string, unknown>;
  const train = typeof input.train_number === 'string' ? input.train_number.trim() : '';
  const station = typeof input.station_code === 'string' ? input.station_code.trim().toUpperCase() : '';
  const category = typeof input.category === 'string' ? input.category : '';
  const note = typeof input.note === 'string' ? input.note.trim() : '';
  const tags = Array.isArray(input.tags) ? input.tags : [];
  if (!numberPattern.test(train) || (station && !stationPattern.test(station)) ||
      !categories.includes(category as typeof categories[number]) || note.length < 10 || note.length > 1000 ||
      tags.length > 5 || tags.some(tag => typeof tag !== 'string' || !/^[a-z0-9 -]{1,24}$/.test(tag))) {
    return Response.json({error: 'Check train number, category, note length, station code, and tags'}, {status: 400});
  }
  try {
    const found = await pool.query('SELECT 1 FROM train WHERE train_number = $1 LIMIT 1', [train]);
    if (!found.rowCount) return Response.json({error: 'Train number is not in RailPulse'}, {status: 400});
    if (station) {
      const validStation = await pool.query('SELECT 1 FROM station WHERE station_code = $1 LIMIT 1', [station]);
      if (!validStation.rowCount) return Response.json({error: 'Station code is not in RailPulse'}, {status: 400});
    }
    const document: ServiceNote = {
      train_number: train,
      ...(station ? {station_code: station} : {}),
      category: category as ServiceNote['category'],
      note,
      tags: tags as string[],
      source: 'user_entry',
      created_at: new Date(),
    };
    const collection = await notesCollection();
    const result = await collection.insertOne(document);
    return Response.json({id: result.insertedId.toString()}, {status: 201});
  } catch {
    return Response.json({error: 'Could not save note'}, {status: 503});
  }
}

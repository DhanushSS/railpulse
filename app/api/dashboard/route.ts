import { authorize } from '../../../lib/auth';
import { getDashboard } from '../../../lib/dashboard';
export const dynamic='force-dynamic';
export async function GET() {
  const denied=await authorize();if(denied)return denied;
  try { return Response.json(await getDashboard(),{headers:{'Cache-Control':'no-store'}}); }
  catch { return Response.json({error:'The railway database is unavailable. Check the local PostgreSQL service, then retry.'},{status:503}); }
}

import { currentUser } from '../../../lib/auth';
import { pool } from '../../../lib/db';
import { notesCollection } from '../../../lib/mongo';
export const dynamic='force-dynamic';
export async function GET(){try{
 const user=await currentUser();if(!user)return Response.json({error:'Please sign in.'},{status:401});if(user.role!=='ADMIN')return Response.json({error:'Administrator access required.'},{status:403});
 const sql=`SELECT t.train_number,t.train_name,COUNT(*)::int observed_stops,ROUND(AVG(s.delay_minutes),2) avg_delay FROM train t JOIN journey j USING(train_id) JOIN stop_event s USING(journey_id) GROUP BY t.train_id HAVING AVG(s.delay_minutes) > (SELECT AVG(delay_minutes) FROM stop_event) ORDER BY avg_delay DESC`;
 const [ranked,daily]=await Promise.all([pool.query(sql),pool.query('SELECT t.train_number,r.journey_date::text,r.avg_delay,r.max_delay FROM train t CROSS JOIN LATERAL sp_train_delay_report(t.train_id) r ORDER BY t.train_number,r.journey_date')]);
 const pipeline=[{$match:{deleted_at:{$exists:false}}},{$group:{_id:'$category',notes:{$sum:1},trains:{$addToSet:'$train_number'}}},{$sort:{notes:-1,_id:1}}];
 const notes=await (await notesCollection()).aggregate(pipeline).toArray();
 return Response.json({ranked:ranked.rows,daily:daily.rows,notes,sql,pipeline});
 }catch{return Response.json({error:'Report databases unavailable.'},{status:503});}}

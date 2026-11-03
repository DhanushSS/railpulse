// RAILPULSE MONGODB DEMONSTRATION - read-only commands
// In mongosh: use railpulse
// Run these in the Compass mongosh console after: use railpulse

// 1. Stored documents (including real user notes and labeled illustrative notes)
await db.getCollection('service_notes').find({}).sort({created_at:-1}).limit(5).toArray()

// 2. Filter documents by train and category
await db.getCollection('service_notes').find({train_number:'22499',category:'SERVICE',deleted_at:{$exists:false}}).toArray()

// 3. NoSQL aggregation: active notes by category
await db.getCollection('service_notes').aggregate([
  {$match:{deleted_at:{$exists:false}}},
  {$group:{_id:'$category',notes:{$sum:1},trains:{$addToSet:'$train_number'}}},
  {$sort:{notes:-1,_id:1}}
]).toArray()

// 4. Compound indexes and collection validation
await db.getCollection('service_notes').indexes()
db.getCollectionInfos({name:'service_notes'})

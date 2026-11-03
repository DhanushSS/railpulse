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

// 5. Review cases: full-text index search
await db.incident_reviews.find({$text:{$search:'historical'}}).limit(6).toArray()

// 6. Faceted summaries and embedded timeline lengths
await db.incident_reviews.aggregate([
 {$facet:{
   statuses:[{$group:{_id:'$status',cases:{$sum:1}}}],
   trains:[{$group:{_id:'$train_number',cases:{$sum:1},updates:{$sum:{$size:'$updates'}}}}],
   total:[{$count:'cases'}]
 }}
]).toArray()

// 7. Embedded history analysis (empty until someone adds updates)
await db.incident_reviews.aggregate([
 {$unwind:'$updates'},
 {$group:{_id:'$updates.author',updates:{$sum:1}}},
 {$sort:{updates:-1}}
]).toArray()
await db.incident_reviews.getIndexes()

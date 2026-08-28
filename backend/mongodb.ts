import { MongoClient } from 'mongodb'
import { env } from './env.js'

export const mongoClient = new MongoClient(env.MONGODB_URI)
export const liveDatabase = mongoClient.db('wiki48fans_live')

export async function connectMongo() {
  await mongoClient.connect()
  await liveDatabase.command({ ping: 1 })
}

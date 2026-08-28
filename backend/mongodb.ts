import { MongoClient } from 'mongodb'
import { env } from './env.js'

export const mongoClient = new MongoClient(env.MONGODB_URI, {
  tls: true,
  serverSelectionTimeoutMS: 10000,
  connectTimeoutMS: 10000,
  retryWrites: true,
})
export const liveDatabase = mongoClient.db('wiki48fans_live')

export async function connectMongo() {
  try {
    await mongoClient.connect()
    await liveDatabase.command({ ping: 1 })
  } catch (error) {
    await mongoClient.close().catch(() => undefined)
    throw new Error(`MongoDB Atlas connection failed. Check Atlas Network Access, URI, and credentials. ${error instanceof Error ? error.message : String(error)}`)
  }
}

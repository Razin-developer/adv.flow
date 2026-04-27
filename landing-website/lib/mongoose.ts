import mongoose from "mongoose";

declare global {
  // eslint-disable-next-line no-var
  var __advflowMongoosePromise: Promise<typeof mongoose> | undefined;
}

export async function connectToMongo() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("MONGODB_URI is not configured.");
  }

  if (!global.__advflowMongoosePromise) {
    global.__advflowMongoosePromise = mongoose.connect(uri, {
      bufferCommands: false,
    });
  }

  return global.__advflowMongoosePromise;
}

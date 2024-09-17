import { connect } from "mongoose";

export const connectWithDatabase = async () => {
  try {
    await connect(
      `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@martina-cluster.bazq8v2.mongodb.net/Martina`
      // "mongodb://localhost:27017/Martina"
    );
    console.log("Database connection successful.");
  } catch (err) {
    throw err;
  }
};

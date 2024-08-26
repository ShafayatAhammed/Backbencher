import { connect } from "mongoose";

export const connectWithDatabase = async () => {
  try {
    await connect(
      `mongodb+srv://${process.env.DATABASE_USERNAME}:${process.env.DATABASE_PASSWORD}@martina-cluster.bazq8v2.mongodb.net/Martina`
      // "mongodb://localhost:27017/Martina"
    );
    console.log("Connection with the database successful.");
  } catch (err) {
    console.log("Something went wrong while connecting with the database!");
    throw new Error(err);
  }
};

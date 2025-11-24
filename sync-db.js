import { sequelize } from "./models/db.js";
import { User } from "./models/userModel.js";
import { Facility } from "./models/facilityModel.js";
import { Booking } from "./models/bookingModel.js";
import { Message } from "./models/messageModel.js";

const syncDatabase = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Connected to MySQL database!");

    // Sync all models
    await sequelize.sync({ force: false }); // Set to true to drop and recreate tables
    console.log("✅ Database synchronized successfully!");
  } catch (error) {
    console.error("❌ Error synchronizing database:", error);
  } finally {
    process.exit();
  }
};

syncDatabase();

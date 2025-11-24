import { sequelize } from "../models/db.js";
import { DataTypes } from "sequelize";

const ensureProfileColumn = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');
    const qi = sequelize.getQueryInterface();

    const tableName = 'Users';
    const desc = await qi.describeTable(tableName);

    if (!desc['profile_picture']) {
      console.log("➕ 'profile_picture' column missing — adding...");
      await qi.addColumn(tableName, 'profile_picture', { type: DataTypes.STRING, allowNull: true });
      console.log("✅ 'profile_picture' column added");
    } else {
      console.log("✅ 'profile_picture' column already exists");
    }
  } catch (err) {
    console.error('❌ Failed to ensure profile_picture column:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

ensureProfileColumn();

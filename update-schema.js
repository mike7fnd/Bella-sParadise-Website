import { sequelize } from "./models/db.js";
import { Facility } from "./models/facilityModel.js";
import { DataTypes } from "sequelize";

const ensureFacilityColumns = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ Connected to DB');
    const qi = sequelize.getQueryInterface();

    // Determine table name
    const tableName = typeof Facility.getTableName === 'function' ? Facility.getTableName() : 'Facilities';
    const name = typeof tableName === 'object' && tableName.tableName ? tableName.tableName : tableName;

    const desc = await qi.describeTable(name);

    const required = {
      imageUrl: { type: DataTypes.STRING, allowNull: true },
      description: { type: DataTypes.TEXT, allowNull: true }
    };

    for (const col of Object.keys(required)) {
      if (!desc[col]) {
        console.log(`➕ Column '${col}' is missing, adding...`);
        await qi.addColumn(name, col, required[col]);
        console.log(`✅ Column '${col}' added`);
      } else {
        console.log(`✅ Column '${col}' already exists`);
      }
    }

    console.log('✅ Facility table columns are up to date');
  } catch (err) {
    console.error('❌ Failed to update schema:', err && err.stack ? err.stack : err);
    process.exitCode = 1;
  } finally {
    await sequelize.close();
  }
};

ensureFacilityColumns();

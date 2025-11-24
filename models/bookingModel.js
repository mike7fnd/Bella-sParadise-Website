import { DataTypes } from "sequelize";
import { sequelize } from "./db.js";
import { User } from "./userModel.js";
import { Facility } from "./facilityModel.js";

export const Booking = sequelize.define("Booking", {
  userId: { type: DataTypes.INTEGER, allowNull: false },
  facilityId: { type: DataTypes.INTEGER, allowNull: false },
  check_in: { type: DataTypes.DATEONLY, allowNull: false },
  check_out: { type: DataTypes.DATEONLY, allowNull: false },
  guests: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  contact_phone: { type: DataTypes.STRING, allowNull: true },
  total: { type: DataTypes.DECIMAL(10, 2), allowNull: true },
  status: { type: DataTypes.ENUM('pending', 'confirmed', 'completed', 'cancelled'), allowNull: false, defaultValue: 'pending' },
  notes: { type: DataTypes.TEXT, allowNull: true }
});

// Define associations
Booking.belongsTo(User, { foreignKey: 'userId' });
Booking.belongsTo(Facility, { foreignKey: 'facilityId' });

export { sequelize };

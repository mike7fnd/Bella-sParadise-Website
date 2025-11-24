
/*
MIT License

Copyright (c) 2025 Christian I. Cabrera || XianFire Framework
Mindoro State University - Philippines

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

import { Sequelize } from "sequelize";
import { sequelize } from "./models/db.js";
import { User } from "./models/userModel.js";
import { Facility } from "./models/facilityModel.js";
import { Booking } from "./models/bookingModel.js";
import inquirer from "inquirer";

// Server-level connection (no database selected)
const rootSequelize = new Sequelize("mysql://root:@localhost:3306/");

const { createDb } = await inquirer.prompt([
  {
    type: "confirm",
    name: "createDb",
    message: "Database 'BPRBooking' may not exist. Create it?",
    default: true,
  },
]);

if (createDb) {
  await rootSequelize.query("CREATE DATABASE IF NOT EXISTS BPRBooking;");
  console.log("✅ Database created (if it did not exist)");
}

try {
  await sequelize.authenticate();
  console.log("✅ Connected to MySQL database!");
  await sequelize.sync({ force: true }); // Drops and recreates tables
  console.log("✅ Tables created for all models!");

  // Create admin user
  const existingAdmin = await User.findOne({ where: { email: "bellasparadisefarmresort@gmail.com" } });
  if (existingAdmin) {
    console.log("✅ Admin user already exists!");
  } else {
    const bcrypt = await import("bcrypt");
    const hashedPassword = await bcrypt.default.hash("admin12345", 10);

    await User.create({
      first_name: "Admin",
      last_name: "User",
      email: "bellasparadisefarmresort@gmail.com",
      mobile: "1234567890",
      province: "Admin Province",
      city: "Admin City",
      barangay: "Admin Barangay",
      street: "Admin Street",
      password: hashedPassword,
      sec_question_1: "What is your favorite color?",
      sec_answer_1: "Blue",
      sec_question_2: "What is your pet's name?",
      sec_answer_2: "Fluffy",
      role: "admin",
    });

    console.log("✅ Admin user created successfully!");
  }
} catch (err) {
  console.error("❌ Migration failed:", err);
} finally {
  process.exit();
}


#!/usr/bin/env node
import { sequelize } from './models/db.js';

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected OK');
    process.exit(0);
  } catch (err) {
    console.error('DB connection failed:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();

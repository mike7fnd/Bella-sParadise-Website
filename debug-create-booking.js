#!/usr/bin/env node
import { Booking } from './models/bookingModel.js';
import { Facility } from './models/facilityModel.js';
import { User } from './models/userModel.js';

(async () => {
  try {
    const user = await User.findOne();
    const facility = await Facility.findOne();
    console.log('Found user:', user ? user.id : null, 'facility:', facility ? facility.id : null);
    if (!user || !facility) {
      console.error('No user or facility exists; cannot create booking');
      process.exit(2);
    }

    const check_in = new Date();
    const check_out = new Date(Date.now() + 1000 * 60 * 60 * 24);

    const b = await Booking.create({
      userId: user.id,
      facilityId: facility.id,
      check_in: check_in.toISOString().slice(0, 10),
      check_out: check_out.toISOString().slice(0, 10),
      guests: 1,
      contact_phone: user.mobile || null,
      total: 0.00,
      notes: 'Debug booking'
    });

    console.log('Booking created id:', b.id);
    process.exit(0);
  } catch (err) {
    console.error('Booking creation failed:');
    console.error('message:', err && err.message);
    console.error('name:', err && err.name);
    console.error('original:', err && err.original);
    console.error('parent:', err && err.parent);
    console.error('stack:', err && err.stack);
    process.exit(1);
  }
})();

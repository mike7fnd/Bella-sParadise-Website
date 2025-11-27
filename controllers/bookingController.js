import { Booking } from "../models/bookingModel.js";
import { Facility } from "../models/facilityModel.js";
import { User } from "../models/userModel.js";
import nodemailer from 'nodemailer';
import bcrypt from 'bcrypt';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'bellasparadisefarmresort@gmail.com';

// Create a booking (requires authenticated session)
export const createBooking = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const currentUser = await User.findByPk(userId);
    if (!currentUser) return res.status(401).json({ message: 'User not found' });

    let bookingUserId = userId;
    let contact_phone = req.body.contact_phone;

    // If admin and guest details provided, find or create guest user
    if (currentUser.role === 'admin' && req.body.guest_name && req.body.email) {
      const { guest_name, email, phone } = req.body;
      let guestUser = await User.findOne({ where: { email } });
      if (!guestUser) {
        // Create guest user with minimal info
        guestUser = await User.create({
          first_name: guest_name.split(' ')[0] || guest_name,
          last_name: guest_name.split(' ').slice(1).join(' ') || '',
          email,
          mobile: phone || null,
          password: await bcrypt.hash(Math.random().toString(36), 10), // random password
          role: 'guest'
        });
      }
      bookingUserId = guestUser.id;
      contact_phone = phone || contact_phone;
    }

    const { facilityId, check_in, check_out, guests, notes, status } = req.body;
    if (!facilityId || !check_in || !check_out) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    const facility = await Facility.findByPk(facilityId);
    if (!facility) return res.status(404).json({ message: 'Facility not found' });

    // Compute number of nights (at least 1)
    const d1 = new Date(check_in);
    const d2 = new Date(check_out);
    let nights = Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24));
    if (isNaN(nights) || nights < 1) nights = 1;

    const pricePerNight = parseFloat(facility.price || 0);
    const total = (pricePerNight * nights).toFixed(2);

    const booking = await Booking.create({
      userId: bookingUserId,
      facilityId,
      check_in,
      check_out,
      guests: guests || 1,
      contact_phone: contact_phone || null,
      total,
      notes: notes || null,
      status: status || 'pending'
    });

    // Notify admin about the new booking (best-effort; non-blocking)
    try {
      // Only attempt to send email if SMTP credentials are provided
      const smtpUser = process.env.SMTP_USER;
      const smtpPass = process.env.SMTP_PASS;
      const smtpHost = process.env.SMTP_HOST;

      if (smtpUser && smtpPass) {
        const transporter = nodemailer.createTransport(
          smtpHost ? {
            host: smtpHost,
            port: process.env.SMTP_PORT ? parseInt(process.env.SMTP_PORT, 10) : 587,
            secure: process.env.SMTP_SECURE === 'true',
            auth: { user: smtpUser, pass: smtpPass }
          } : {
            service: 'gmail',
            auth: { user: smtpUser, pass: smtpPass }
          }
        );

        const facilityObj = await Facility.findByPk(facilityId);
        const mailOptions = {
          from: process.env.SMTP_FROM || smtpUser,
          to: ADMIN_EMAIL,
          subject: `New booking received — #BK${String(booking.id).padStart(3, '0')}`,
          text: `A new booking was created by user ${userId} for facility ${facilityObj ? facilityObj.name : facilityId}.
Check-in: ${check_in}
Check-out: ${check_out}
Guests: ${guests}
Contact: ${contact_phone || 'N/A'}
Notes: ${notes || '—'}
Total: ₱${total}

View bookings in the admin dashboard: /admin-bookings`,
          html: `<p>A new booking was created by user <strong>${userId}</strong> for facility <strong>${facilityObj ? facilityObj.name : facilityId}</strong>.</p>
                 <ul>
                   <li><strong>Check-in</strong>: ${check_in}</li>
                   <li><strong>Check-out</strong>: ${check_out}</li>
                   <li><strong>Guests</strong>: ${guests}</li>
                   <li><strong>Contact</strong>: ${contact_phone || 'N/A'}</li>
                   <li><strong>Notes</strong>: ${notes || '—'}</li>
                   <li><strong>Total</strong>: ₱${total}</li>
                 </ul>
                 <p>Open <a href="${process.env.APP_BASE_URL || ''}/admin-bookings">Admin Bookings</a> to review.</p>`
        };

        // fire-and-forget
        transporter.sendMail(mailOptions).then(info => {
          console.log('Admin notification sent:', info && info.messageId);
        }).catch(err => {
          console.error('Failed to send admin notification:', err && err.message);
        });
      } else {
        // If no SMTP configured, log to console so the host can pick it up
        console.log('New booking created (no SMTP configured). Admin email:', ADMIN_EMAIL, 'bookingId:', booking.id);
      }
    } catch (err) {
      console.error('Error while attempting to notify admin:', err && err.message);
    }

    res.status(201).json({ message: 'Booking created', booking });
  } catch (error) {
    console.error('Error creating booking:', error && error.stack ? error.stack : error);
    const dev = process.env.NODE_ENV !== 'production';
    res.status(500).json({ message: 'Internal server error', error: dev ? (error && error.message ? error.message : String(error)) : undefined });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const bookings = await Booking.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });
    const results = await Promise.all(bookings.map(async (b) => {
      const obj = b.toJSON ? b.toJSON() : b;
      obj.User = await User.findByPk(b.userId, { attributes: ['first_name', 'last_name', 'email', 'mobile'] });
      obj.Facility = await Facility.findByPk(b.facilityId);
      return obj;
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching user bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getAllBookings = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });
    const currentUser = await User.findByPk(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const bookings = await Booking.findAll({ order: [['createdAt', 'DESC']] });
    const results = await Promise.all(bookings.map(async (b) => {
      const obj = b.toJSON ? b.toJSON() : b;
      obj.User = await User.findByPk(b.userId, { attributes: ['first_name', 'last_name', 'email', 'mobile'] });
      obj.Facility = await Facility.findByPk(b.facilityId);
      return obj;
    }));

    res.json(results);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Update booking status (admin only)
export const updateBookingStatus = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });
    const currentUser = await User.findByPk(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).json({ message: 'Forbidden' });

    const bookingId = req.params.id;
    const { status } = req.body;
    if (!bookingId || !status) return res.status(400).json({ message: 'Missing booking id or status' });
    if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) return res.status(400).json({ message: 'Invalid status' });

    const booking = await Booking.findByPk(bookingId);
    if (!booking) return res.status(404).json({ message: 'Booking not found' });

    booking.status = status;
    await booking.save();

    res.json({ message: 'Booking status updated', booking });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

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
FITNESS FOR A FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/
import bcrypt from "bcrypt";
import qrcode from "qrcode";
import fs from 'fs';
import path from 'path';
import { User } from "../models/userModel.js";
import { Booking } from "../models/bookingModel.js";
import { Facility } from "../models/facilityModel.js";
import { sequelize } from "../models/db.js";
import { Op } from "sequelize";

export const registerUser = async (req, res) => {
  try {
    const {
      first_name,
      last_name,
      email,
      mobile,
      province,
      city,
      barangay,
      street,
      password,
      sec_question_1,
      sec_answer_1,
      sec_question_2,
      sec_answer_2,
    } = req.body;
    // Basic validation
    const missing = [];
    if (!first_name) missing.push('first_name');
    if (!last_name) missing.push('last_name');
    if (!email) missing.push('email');
    if (!mobile) missing.push('mobile');
    if (!province) missing.push('province');
    if (!city) missing.push('city');
    if (!barangay) missing.push('barangay');
    if (!password) missing.push('password');
    if (!sec_question_1) missing.push('sec_question_1');
    if (!sec_answer_1) missing.push('sec_answer_1');
    if (!sec_question_2) missing.push('sec_question_2');
    if (!sec_answer_2) missing.push('sec_answer_2');
    if (missing.length) return res.status(400).json({ message: 'Missing required fields', missing });

    // Check if user already exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const newUser = await User.create({
      first_name,
      last_name,
      email,
      mobile,
      province,
      city,
      barangay,
      street,
      password: hashedPassword,
      sec_question_1,
      sec_answer_1,
      sec_question_2,
      sec_answer_2,
      role: 'guest',
    });

    res.status(201).json({ message: "User registered successfully" });
  } catch (error) {
    console.error("Error registering user:", error && error.stack ? error.stack : error);
    // If it's a validation error from Sequelize, return 400
    if (error && error.name === 'SequelizeValidationError') {
      return res.status(400).json({ message: 'Validation error', errors: error.errors.map(e => e.message) });
    }
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) return res.status(400).json({ message: 'Email and password are required' });

    // Find user by email (add detailed error logging to capture DB error details)
    let user;
    try {
      user = await User.findOne({ where: { email } });
    } catch (dbErr) {
      console.error('User.findOne error:', dbErr);
      // Log common MySQL / sequelize error properties for easier diagnosis
      try { console.error('dbErr.original:', dbErr.original); } catch (e) { }
      try { console.error('dbErr.sqlMessage:', dbErr.sqlMessage); } catch (e) { }
      try { console.error('dbErr.code:', dbErr.code); } catch (e) { }
      try { console.error('dbErr.sql:', dbErr.sql); } catch (e) { }
      throw dbErr;
    }
    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Set session
    req.session.userId = user.id;
    req.session.email = user.email;
    req.session.first_name = user.first_name;
    req.session.last_name = user.last_name;

    // Redirect based on role
    if (user.role === 'admin') {
      res.redirect('/admin-dashboard');
    } else {
      res.redirect('/');
    }
  } catch (error) {
    console.error("Error logging in user:", error && error.stack ? error.stack : error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const logoutUser = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.status(500).json({ message: "Logout failed" });
    }
    res.redirect("/");
  });
};

export const getUserProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email,
      mobile: user.mobile,
      province: user.province,
      city: user.city,
      barangay: user.barangay,
      street: user.street,
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const updateUserProfile = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    const {
      first_name,
      last_name,
      email,
      mobile,
      province,
      city,
      barangay,
      street,
    } = req.body;

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update user fields
    user.first_name = first_name;
    user.last_name = last_name;
    user.email = email;
    user.mobile = mobile;
    user.province = province;
    user.city = city;
    user.barangay = barangay;
    user.street = street;

    await user.save();

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating user profile:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const loginPage = (req, res) => res.render("login");
export const registerPage = (req, res) => res.render("signup");
export const forgotPasswordPage = (req, res) => res.render("forgotpassword");
export const dashboardPage = (req, res) => res.render("dashboard");
export const adminDashboardPage = async (req, res) => {
  try {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();

    // Revenue this month: sum of total for confirmed/completed bookings in current month
    const revenueResult = await Booking.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('total')), 'totalRevenue']
      ],
      where: {
        status: { [Op.in]: ['confirmed', 'completed'] },
        check_in: {
          [Op.gte]: new Date(currentYear, currentMonth - 1, 1),
          [Op.lt]: new Date(currentYear, currentMonth, 1)
        }
      },
      raw: true
    });
    const revenue = revenueResult[0].totalRevenue || 0;

    // Bookings today: count where check_in = today
    const bookingsToday = await Booking.count({
      where: { check_in: today }
    });

    // Total capacity of all facilities
    const totalCapacityResult = await Facility.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('capacity')), 'totalCapacity']
      ],
      raw: true
    });
    const totalCapacity = totalCapacityResult[0].totalCapacity || 1; // avoid division by zero

    // Occupied today: sum of guests for confirmed bookings today
    const occupiedResult = await Booking.findAll({
      attributes: [
        [sequelize.fn('SUM', sequelize.col('guests')), 'totalGuests']
      ],
      where: {
        status: 'confirmed',
        check_in: today
      },
      raw: true
    });
    const occupiedGuests = occupiedResult[0].totalGuests || 0;
    const occupancyRate = Math.round((occupiedGuests / totalCapacity) * 100);

    // Pending check-ins: count where status = 'pending'
    const pendingCheckIns = await Booking.count({
      where: { status: 'pending' }
    });

    // Recent bookings: last 5, with user and facility
    const recentBookings = await Booking.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']],
      include: [
        { model: User, attributes: ['first_name', 'last_name'] },
        { model: Facility, attributes: ['name'] }
      ]
    });

    // Format recent bookings for view
    const getStatusClass = (status) => {
      switch (status) {
        case 'confirmed': return 'success';
        case 'pending': return 'pending';
        case 'completed': return 'success';
        case 'cancelled': return 'cancelled';
        default: return 'pending';
      }
    };

    const formattedRecentBookings = recentBookings.map(booking => ({
      id: `BKP${String(booking.id).padStart(5, '0')}`,
      guest: `${booking.User ? booking.User.first_name : 'Unknown'} ${booking.User ? booking.User.last_name : ''}`.trim(),
      facility: booking.Facility ? booking.Facility.name : 'Unknown',
      check_in: booking.check_in,
      status: booking.status.charAt(0).toUpperCase() + booking.status.slice(1),
      statusClass: getStatusClass(booking.status),
      amount: `₱${parseFloat(booking.total || 0).toFixed(2)}`
    }));

    res.render("admin-dashboard", {
      activePage: 'dashboard',
      revenue: `₱${parseFloat(revenue).toFixed(2)}`,
      bookingsToday,
      occupancyRate: `${occupancyRate}%`,
      pendingCheckIns,
      recentBookings: formattedRecentBookings
    });
  } catch (error) {
    console.error("Error rendering admin dashboard:", error);
    res.status(500).send("Internal server error");
  }
};
export const adminFacilitiesPage = (req, res) => res.render("admin-facilities", { activePage: 'facilities' });
export const adminBookingsPage = (req, res) => res.render("admin-bookings", { activePage: 'bookings' });
export const adminGuestsPage = async (req, res) => {
  try {
    const guests = await User.findAll({ where: { role: 'guest' } });
    res.render('admin-guests', { users: guests, activePage: 'guests' });
  } catch (error) {
    console.error('Error rendering admin guests page:', error);
    res.status(500).send('Internal server error');
  }
};

export const adminGuestProfilePage = async (req, res) => {
  try {
    // ensure admin
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.redirect('/login');
    const currentUser = await User.findByPk(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).send('Forbidden');

    const userId = req.params.id;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).send('User not found');

    const qrData = JSON.stringify({
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      mobile: user.mobile,
      address: `${user.street}, ${user.barangay}, ${user.city}, ${user.province}, Philippines`,
    });
    const qrCode = await qrcode.toDataURL(qrData);

    res.render('admin-guest-profile', { user, qrCode, activePage: 'guests' });
  } catch (error) {
    console.error('Error rendering admin guest profile:', error);
    res.status(500).send('Internal server error');
  }
};
export const profilePage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/login");
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.redirect("/login");
    }

    // Generate QR code with user information
    const qrData = JSON.stringify({
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      mobile: user.mobile,
      address: `${user.street}, ${user.barangay}, ${user.city}, ${user.province}, Philippines`,
    });

    const qrCode = await qrcode.toDataURL(qrData);

    // Fetch user's bookings to show progress on profile page
    const bookingsRaw = await Booking.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [{ model: Facility }]
    });

    const bookings = bookingsRaw.map(b => {
      const status = b.status || 'pending';
      let progress = 0;
      if (status === 'pending') progress = 25;
      else if (status === 'confirmed') progress = 65;
      else if (status === 'completed') progress = 100;
      else if (status === 'cancelled') progress = 0;

      return {
        id: b.id,
        facilityName: b.Facility ? b.Facility.name : 'Unknown',
        check_in: b.check_in,
        check_out: b.check_out,
        amount: `₱${parseFloat(b.total || 0).toFixed(2)}`,
        status,
        statusLabel: status.charAt(0).toUpperCase() + status.slice(1),
        progress
      };
    });

    res.render("profile", { user, qrCode, bookings });
  } catch (error) {
    console.error("Error rendering profile page:", error);
    res.status(500).send("Internal server error");
  }
};
export const settingsPage = (req, res) => res.render("settings");
export const privacyPolicyPage = (req, res) => res.render("privacy-policy");
export const uploadProfilePicture = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

    // If multer handled a file (future-proof), use that
    if (req.file && req.file.path) {
      const rel = '/uploads/' + path.basename(req.file.path);
      const user = await User.findByPk(userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      user.profile_picture = rel;
      await user.save();
      return res.json({ success: true, url: rel });
    }

    const { imageData } = req.body;
    if (!imageData) return res.status(400).json({ success: false, message: 'No image data provided' });

    // Handle data URLs: data:image/jpeg;base64,......
    const matches = imageData.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    let ext = 'jpg';
    let base64Data = imageData;
    if (matches) {
      const mime = matches[1];
      base64Data = matches[2];
      const parts = mime.split('/');
      if (parts[1]) ext = parts[1].replace('+xml', 'png');
    }

    const buffer = Buffer.from(base64Data, 'base64');
    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    await fs.promises.writeFile(filepath, buffer);

    const relativeUrl = '/uploads/' + filename;
    const user = await User.findByPk(userId);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    user.profile_picture = relativeUrl;
    await user.save();

    res.json({ success: true, url: relativeUrl });
  } catch (err) {
    console.error('Error uploading profile picture:', err);
    res.status(500).json({ success: false, message: 'Internal server error' });
  }
};

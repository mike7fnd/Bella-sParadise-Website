

import express from "express";
import { homePage, aboutPage, aboutPost, bookPage } from "../controllers/homeController.js";
const router = express.Router();

// Middleware to check if user is authenticated
const requireAuth = (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
};

// Middleware to check if user is admin
const requireAdmin = async (req, res, next) => {
  if (!req.session.userId) {
    return res.redirect('/login');
  }

  try {
    const { User } = await import("../models/userModel.js");
    const user = await User.findByPk(req.session.userId);
    if (!user || user.role !== 'admin') {
      return res.status(403).send('Access denied');
    }
    next();
  } catch (error) {
    console.error('Error checking admin role:', error);
    res.status(500).send('Internal server error');
  }
};
router.get("/", homePage);
router.get("/about", aboutPage);
router.post("/about", aboutPost);

router.get("/home", homePage);
router.get("/book", bookPage);

import { loginPage, registerPage, forgotPasswordPage, dashboardPage, adminDashboardPage, adminFacilitiesPage, adminBookingsPage, adminGuestsPage, adminGuestProfilePage, profilePage, settingsPage, privacyPolicyPage, loginUser, registerUser, logoutUser, uploadProfilePicture } from "../controllers/authController.js";

// Multer + uploads setup (moved up so `upload` is available to routes)
import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Ensure upload directory exists
const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const unique = Date.now() + '-' + Math.random().toString(36).slice(2, 8);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    cb(null, `${unique}-${safeName}`);
  }
});

const upload = multer({ storage });

router.get("/login", loginPage);
router.post("/login", loginUser);
router.get("/signup", registerPage);
router.post("/signup", registerUser);
router.get("/forgot-password", forgotPasswordPage);
router.get("/dashboard", dashboardPage);
router.get("/admin-dashboard", adminDashboardPage);
router.get("/admin-facilities", adminFacilitiesPage);
// router.get("/admin-bookings", adminBookingsPage);
router.get("/admin-bookings", adminBookingsPage);
router.get('/admin-guests', adminGuestsPage);
router.get('/admin-guests/:id', adminGuestProfilePage);
router.get("/profile", profilePage);
// Accept optional file upload named 'image' when changing profile picture
router.post("/profile/upload-picture", upload.single('image'), uploadProfilePicture);
router.get("/settings", settingsPage);
router.get("/privacy-policy", privacyPolicyPage);
router.get("/logout", logoutUser);

// Facility routes
import { getFacilities, getFacilityById, createFacility, updateFacility, deleteFacility } from "../controllers/facilityController.js";
import { createBooking, getAllBookings, getMyBookings, updateBookingStatus } from "../controllers/bookingController.js";
import { getUserProfile } from "../controllers/authController.js";
import { messagesPage, adminMessagesPage, getConversations, getConversationWith, sendMessage, getUnreadCount } from "../controllers/messageController.js";
import { sequelize } from "../models/db.js";

router.get("/api/facilities", getFacilities);
router.get("/api/facilities/:id", getFacilityById);
// Accept optional file upload named 'image' when creating/updating facilities
router.post("/api/facilities", upload.single('image'), createFacility);
router.put("/api/facilities/:id", upload.single('image'), updateFacility);
router.delete("/api/facilities/:id", deleteFacility);

// Booking routes
router.post('/api/bookings', createBooking);
router.get('/api/bookings/mine', getMyBookings);
router.get('/api/bookings', getAllBookings);
router.put('/api/bookings/:id/status', updateBookingStatus);

// Messaging API
router.get('/api/messages/conversations', getConversations);
router.get('/api/messages/conversation/:userId', getConversationWith);
router.post('/api/messages', sendMessage);
router.get('/api/messages/unread', getUnreadCount);

// Profile API used by client to prefill booking contact info
router.get('/api/profile', getUserProfile);

// Messaging pages
router.get('/messages', messagesPage);
router.get('/admin-messages', adminMessagesPage);

// Dev-only debug endpoints
if (process.env.NODE_ENV !== 'production') {
  router.get('/__debug/db', async (req, res) => {
    try {
      await sequelize.authenticate();
      res.json({ ok: true, message: 'DB connection OK' });
    } catch (err) {
      console.error('DB connection error:', err && err.stack ? err.stack : err);
      const dev = process.env.NODE_ENV !== 'production';
      res.status(500).json({ ok: false, message: dev ? (err && err.message ? err.message : String(err)) : 'DB connection failed' });
    }
  });
}

export default router;

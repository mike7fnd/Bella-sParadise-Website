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

import bcrypt from "bcrypt";
import { User } from "../models/userModel.js";
import { Facility } from "../models/facilityModel.js";

export const homePage = (req, res) => {
  const user = req.session.userId ? { id: req.session.userId } : null;
  res.render("home", { title: "XianFire Home", user });
};

export const aboutPage = (req, res) => {
  const user = req.session.userId ? { id: req.session.userId } : null;
  res.render("about", { title: "About Us", user });
};

export const aboutPost = (req, res) => {
  // Handle about post if needed
  res.redirect("/about");
};

export const signupPage = (req, res) => {
  res.render("signup", { title: "Sign Up" });
};

export const signupPost = async (req, res) => {
  // Handle signup post, similar to registerUser
  const { name, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, password: hashed });
  req.session.userId = user.id;
  res.redirect("/dashboard");
};

export const bookPage = async (req, res) => {
  try {
    const user = req.session.userId ? { id: req.session.userId } : null;
    // Fetch facilities server-side to provide initial data to the view
    const facilities = await Facility.findAll();
    const facilitiesData = facilities.map(f => f.toJSON ? f.toJSON() : f);
    res.render("book", { title: "Book Now", user, facilitiesData, facilitiesJSON: JSON.stringify(facilitiesData) });
  } catch (error) {
    console.error('Error rendering book page with facilities:', error);
    const user = req.session.userId ? { id: req.session.userId } : null;
    res.render("book", { title: "Book Now", user, facilitiesData: [], facilitiesJSON: JSON.stringify([]) });
  }
};

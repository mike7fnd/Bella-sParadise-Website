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
import { Facility } from "../models/facilityModel.js";

export const getFacilities = async (req, res) => {
  try {
    const facilities = await Facility.findAll();
    res.json(facilities);
  } catch (error) {
    console.error("Error fetching facilities:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getFacilityById = async (req, res) => {
  try {
    const { id } = req.params;
    const facility = await Facility.findByPk(id);
    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }
    res.json(facility);
  } catch (error) {
    console.error("Error fetching facility:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const createFacility = async (req, res) => {
  try {
    // If request came from multipart/form-data (with file), multer will populate req.file
    const { name, type, capacity, price, status, description } = req.body;
    let { imageUrl } = req.body || {};

    if (req.file) {
      // Store relative path that can be served from /public
      imageUrl = `/uploads/${req.file.filename}`;
    }

    // Basic server-side validation and coercion (be tolerant of casing/whitespace)
    const allowedTypes = ['Kubo', 'Cabana', 'Room', 'Hall', 'House'];
    const allowedStatuses = ['available', 'occupied', 'maintenance'];

    // Normalize incoming values
    const rawType = typeof type === 'string' ? type.trim() : '';
    const normalizedType = allowedTypes.find(t => t.toLowerCase() === rawType.toLowerCase());

    const rawStatus = typeof status === 'string' ? status.trim() : '';
    const normalizedStatus = allowedStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase());

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return res.status(400).json({ message: 'Name is required' });
    }
    if (!normalizedType) {
      return res.status(400).json({ message: 'Type is required and must be one of: ' + allowedTypes.join(', ') });
    }

    const capacityNum = parseInt(capacity, 10);
    if (Number.isNaN(capacityNum) || capacityNum <= 0) {
      return res.status(400).json({ message: 'Capacity must be a positive integer' });
    }

    const priceNum = parseFloat(price);
    if (Number.isNaN(priceNum) || priceNum < 0) {
      return res.status(400).json({ message: 'Price must be a non-negative number' });
    }

    if (!normalizedStatus) {
      return res.status(400).json({ message: 'Status is required and must be one of: ' + allowedStatuses.join(', ') });
    }

    const payload = {
      name: name.trim(),
      type: normalizedType,
      capacity: capacityNum,
      price: priceNum,
      status: normalizedStatus,
      description: description && description.trim().length ? description.trim() : null,
      imageUrl: imageUrl && imageUrl.trim().length ? imageUrl.trim() : null
    };

    console.info('Creating facility with payload:', payload);

    const newFacility = await Facility.create(payload);
    res.status(201).json(newFacility);
  } catch (error) {
    console.error("Error creating facility:", error && error.stack ? error.stack : error);
    // Handle Sequelize validation errors
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors ? error.errors.map(e => e.message) : [error.message];
      return res.status(400).json({ message: messages.join('; ') });
    }
    // Return a helpful message for debugging (non-sensitive)
    const msg = error && error.message ? error.message : 'Internal server error';
    res.status(500).json({ message: msg });
  }
};

export const updateFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, type, capacity, price, status, description } = req.body;
    let { imageUrl } = req.body || {};
    if (req.file) {
      imageUrl = `/uploads/${req.file.filename}`;
    }
    const facility = await Facility.findByPk(id);
    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }
    // Validate similar to create
    const allowedTypes = ['Kubo', 'Cabana', 'Room', 'Hall', 'House'];
    const allowedStatuses = ['available', 'occupied', 'maintenance'];

    if (name && (typeof name !== 'string' || name.trim().length === 0)) {
      return res.status(400).json({ message: 'Name must be a non-empty string' });
    }
    if (type) {
      const rawType = typeof type === 'string' ? type.trim() : '';
      const normalizedType = allowedTypes.find(t => t.toLowerCase() === rawType.toLowerCase());
      if (!normalizedType) {
        return res.status(400).json({ message: 'Type must be one of: ' + allowedTypes.join(', ') });
      }
      facility.type = normalizedType;
    }
    if (capacity !== undefined) {
      const capacityNum = parseInt(capacity, 10);
      if (Number.isNaN(capacityNum) || capacityNum <= 0) {
        return res.status(400).json({ message: 'Capacity must be a positive integer' });
      }
      facility.capacity = capacityNum;
    }
    if (price !== undefined) {
      const priceNum = parseFloat(price);
      if (Number.isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({ message: 'Price must be a non-negative number' });
      }
      facility.price = priceNum;
    }

    if (status) {
      const rawStatus = typeof status === 'string' ? status.trim() : '';
      const normalizedStatus = allowedStatuses.find(s => s.toLowerCase() === rawStatus.toLowerCase());
      if (!normalizedStatus) {
        return res.status(400).json({ message: 'Status must be one of: ' + allowedStatuses.join(', ') });
      }
      facility.status = normalizedStatus;
    }

    if (name) facility.name = name.trim();
    facility.description = (description && description.trim().length) ? description.trim() : facility.description;
    facility.imageUrl = (imageUrl && imageUrl.trim().length) ? imageUrl.trim() : facility.imageUrl;

    await facility.save();
    res.json(facility);
  } catch (error) {
    console.error("Error updating facility:", error);
    if (error.name === 'SequelizeValidationError' || error.name === 'SequelizeUniqueConstraintError') {
      const messages = error.errors ? error.errors.map(e => e.message) : [error.message];
      return res.status(400).json({ message: messages.join('; ') });
    }
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
};

export const deleteFacility = async (req, res) => {
  try {
    const { id } = req.params;
    const facility = await Facility.findByPk(id);
    if (!facility) {
      return res.status(404).json({ message: "Facility not found" });
    }
    await facility.destroy();
    res.json({ message: "Facility deleted successfully" });
  } catch (error) {
    console.error("Error deleting facility:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

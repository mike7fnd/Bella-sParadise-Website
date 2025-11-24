import { Facility } from "./models/facilityModel.js";

const facilitiesData = [
  {
    name: "Swimming Pool",
    type: "Room", // Assuming pool as a room/facility type, or add to ENUM if needed
    capacity: 50, // Arbitrary, as pool is shared
    price: 0.00,
    status: "available",
    description: "All accommodations, day tour, and overnight guests have access to the swimming pool."
  },
  {
    name: "Kubo sa Ilog",
    type: "Kubo",
    capacity: 8,
    price: 300.00,
    status: "available",
    description: "Perfect for groups looking to enjoy river views and grilling."
  },
  {
    name: "Kubo sa Patag",
    type: "Kubo",
    capacity: 8,
    price: 400.00,
    status: "available",
    description: "Includes powered outlets for convenience."
  },
  {
    name: "Cabana",
    type: "Cabana",
    capacity: 20,
    price: 1600.00,
    status: "available",
    description: "Good for 20 pax. Includes river access and entertainment options."
  },
  {
    name: "Function Hall",
    type: "Hall",
    capacity: 50,
    price: 2000.00,
    status: "available",
    description: "Perfect for events and gatherings with river access."
  },
  {
    name: "A-House",
    type: "House",
    capacity: 10,
    price: 5000.00,
    status: "available",
    description: "Rent the entire house for a private stay with all amenities included."
  },
  {
    name: "Kubo ni Bella",
    type: "Kubo",
    capacity: 8,
    price: 500.00,
    status: "available",
    description: "A themed kubo perfect for special occasions and celebrations."
  },
  {
    name: "Kubo ni Job",
    type: "Kubo",
    capacity: 8,
    price: 450.00,
    status: "available",
    description: "A private kubo in a secluded area for intimate gatherings."
  }
];

async function seedFacilities() {
  try {
    for (const facility of facilitiesData) {
      await Facility.create(facility);
      console.log(`Seeded facility: ${facility.name}`);
    }
    console.log("All facilities seeded successfully.");
  } catch (error) {
    console.error("Error seeding facilities:", error);
  }
}

seedFacilities();

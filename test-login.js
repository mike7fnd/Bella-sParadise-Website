import bcrypt from "bcrypt";
import { User } from "./models/userModel.js";

const testLogin = async () => {
  try {
    const user = await User.findOne({ where: { email: "bellasparadisefarmresort@gmail.com" } });
    if (!user) {
      console.log("Admin user not found");
      return;
    }

    console.log("User found:", { id: user.id, email: user.email, role: user.role });

    const isValid = await bcrypt.compare("admin12345", user.password);
    console.log("Password valid:", isValid);

    if (isValid) {
      console.log("Login should work - redirect to:", user.role === 'admin' ? '/admin-dashboard' : '/');
    } else {
      console.log("Password check failed");
    }
  } catch (error) {
    console.error("Error:", error);
  }
};

testLogin();

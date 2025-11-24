import { sequelize } from "../models/db.js";
import { User } from "../models/userModel.js";
import { Message } from "../models/messageModel.js";

(async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');

    let admin = await User.findOne({ where: { role: 'admin' } });
    if (!admin) {
      admin = await User.create({
        first_name: 'Admin',
        last_name: 'User',
        email: 'admin.test@example.com',
        mobile: '0000000000',
        province: 'Test',
        city: 'Test',
        barangay: 'Test',
        street: '',
        password: 'adminpass',
        sec_question_1: 'x', sec_answer_1: 'x', sec_question_2: 'x', sec_answer_2: 'x',
        role: 'admin'
      });
      console.log('Created admin id', admin.id);
    } else {
      console.log('Found admin id', admin.id);
    }

    let guest = await User.findOne({ where: { role: 'guest' } });
    if (!guest) {
      guest = await User.create({
        first_name: 'Guest',
        last_name: 'User',
        email: 'guest.test@example.com',
        mobile: '0000000000',
        province: 'Test',
        city: 'Test',
        barangay: 'Test',
        street: '',
        password: 'guestpass',
        sec_question_1: 'x', sec_answer_1: 'x', sec_question_2: 'x', sec_answer_2: 'x',
        role: 'guest'
      });
      console.log('Created guest id', guest.id);
    } else {
      console.log('Found guest id', guest.id);
    }

    const msg = await Message.create({ senderId: guest.id, recipientId: admin.id, content: 'Automated test message: please ignore', read: false });
    console.log('Inserted message id', msg.id);

    const unread = await Message.count({ where: { recipientId: admin.id, read: false } });
    console.log('Unread messages for admin:', unread);

    process.exit(0);
  } catch (err) {
    console.error('Test script error:', err && err.stack ? err.stack : err);
    process.exit(1);
  }
})();

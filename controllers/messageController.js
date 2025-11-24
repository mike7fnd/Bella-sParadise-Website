import { Message } from "../models/messageModel.js";
import { User } from "../models/userModel.js";
import { Op } from "sequelize";

// Render user messages page (user -> admin)
export const messagesPage = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.redirect('/login');

    // find an admin account to message (first admin)
    const admin = await User.findOne({ where: { role: 'admin' } });
    const adminId = admin ? admin.id : null;

    const user = await User.findByPk(userId);
    res.render('messages', { adminId, user });
  } catch (err) {
    console.error('Error rendering messages page:', err);
    res.status(500).send('Internal server error');
  }
};

// Render admin messages page
export const adminMessagesPage = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.redirect('/login');
    const currentUser = await User.findByPk(currentUserId);
    if (!currentUser || currentUser.role !== 'admin') return res.status(403).send('Forbidden');

    // Precompute conversations for server-side rendering so admin sees users immediately
    const guests = await User.findAll({ where: { role: 'guest' }, attributes: ['id', 'first_name', 'last_name'] });
    const results = await Promise.all(guests.map(async (g) => {
      const last = await Message.findOne({
        where: {
          [Op.or]: [
            { senderId: g.id, recipientId: currentUserId },
            { senderId: currentUserId, recipientId: g.id }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      return {
        id: g.id,
        name: `${g.first_name} ${g.last_name}`.trim(),
        lastMessage: last ? last.content : null,
        lastAt: last ? last.createdAt : null
      };
    }));

    res.render('admin-messages', { activePage: 'messages', conversations: results, conversationsJson: JSON.stringify(results), user: currentUser });
  } catch (err) {
    console.error('Error rendering admin messages page:', err);
    res.status(500).send('Internal server error');
  }
};

// Get conversations (list of partners with last message)
export const getConversations = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });

    const currentUser = await User.findByPk(currentUserId);
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    if (currentUser.role === 'admin') {
      // admin: list all guests with their last message
      const guests = await User.findAll({ where: { role: 'guest' }, attributes: ['id', 'first_name', 'last_name'] });
      const results = await Promise.all(guests.map(async (g) => {
        const last = await Message.findOne({
          where: {
            [Op.or]: [
              { senderId: g.id, recipientId: currentUserId },
              { senderId: currentUserId, recipientId: g.id }
            ]
          },
          order: [['createdAt', 'DESC']]
        });
        return {
          id: g.id,
          name: `${g.first_name} ${g.last_name}`.trim(),
          lastMessage: last ? last.content : null,
          lastAt: last ? last.createdAt : null
        };
      }));
      return res.json(results);
    } else {
      // guest: return admin as only conversation partner
      const admin = await User.findOne({ where: { role: 'admin' }, attributes: ['id', 'first_name', 'last_name'] });
      if (!admin) return res.json([]);
      const last = await Message.findOne({
        where: {
          [Op.or]: [
            { senderId: admin.id, recipientId: currentUserId },
            { senderId: currentUserId, recipientId: admin.id }
          ]
        },
        order: [['createdAt', 'DESC']]
      });
      return res.json([{ id: admin.id, name: `${admin.first_name} ${admin.last_name}`.trim(), lastMessage: last ? last.content : null, lastAt: last ? last.createdAt : null }]);
    }
  } catch (err) {
    console.error('Error fetching conversations:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get messages between current user and otherId
export const getConversationWith = async (req, res) => {
  try {
    const currentUserId = req.session.userId;
    if (!currentUserId) return res.status(401).json({ message: 'Not authenticated' });
    const otherId = parseInt(req.params.userId, 10);
    if (!otherId) return res.status(400).json({ message: 'Missing user id' });

    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: currentUserId, recipientId: otherId },
          { senderId: otherId, recipientId: currentUserId }
        ]
      },
      order: [['createdAt', 'ASC']]
    });

    // mark messages as read where recipient is current user
    await Message.update({ read: true }, { where: { recipientId: currentUserId, senderId: otherId, read: false } });

    res.json(messages);
  } catch (err) {
    console.error('Error fetching conversation:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Send a message
export const sendMessage = async (req, res) => {
  try {
    const senderId = req.session.userId;
    if (!senderId) return res.status(401).json({ message: 'Not authenticated' });
    const { recipientId, content } = req.body;
    if (!recipientId || !content) return res.status(400).json({ message: 'Missing recipient or content' });

    const msg = await Message.create({ senderId, recipientId, content });
    res.status(201).json(msg);
  } catch (err) {
    console.error('Error sending message:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

// Get unread messages count for current user
export const getUnreadCount = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) return res.status(401).json({ message: 'Not authenticated' });

    const count = await Message.count({ where: { recipientId: userId, read: false } });
    res.json({ unread: count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};

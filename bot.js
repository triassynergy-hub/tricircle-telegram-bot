// TriCircle Logistics Telegram Bot
// This bot handles customer inquiries, bookings, and price calculations

const TelegramBot = require('node-telegram-bot-api');
const nodemailer = require('nodemailer');

// ========== CONFIGURATION - ALL SET! ==========
const BOT_TOKEN = '8560753777:AAFfT7_D_u5-3Vi9mhPua4jEKDKQh4z3qBU';
const OWNER_TELEGRAM_ID = '485046408';
const NOTIFICATION_EMAIL = 'triassynergry@gmail.com';

// Email configuration
const EMAIL_CONFIG = {
  service: 'gmail',
  auth: {
    user: 'triassynergry@gmail.com',
    pass: 'juwgknzqmqmorxfn' // Gmail App Password (spaces removed)
  }
};
// ==================================================

const bot = new TelegramBot(BOT_TOKEN, { polling: true });
const emailTransporter = nodemailer.createTransport(EMAIL_CONFIG);

// Store user sessions
const userSessions = {};

// Pricing data
const PRICING = {
  standard: [
    { min: 0, max: 5, price: 2.50 },
    { min: 6, max: 10, price: 3.50 },
    { min: 11, max: 15, price: 4.50 },
    { min: 16, max: 20, price: 5.50 },
    { min: 21, max: 25, price: 6.50 },
    { min: 26, max: 30, price: 7.50 },
    { min: 31, max: 35, price: 8.50 },
    { min: 36, max: 40, price: 9.50 },
    { min: 41, max: 45, price: 10.50 },
    { min: 46, max: 50, price: 11.50 }
  ],
  subscriptions: [
    { deliveries: 20, price: 40, perDelivery: 2.00 },
    { deliveries: 40, price: 70, perDelivery: 1.75 },
    { deliveries: 60, price: 90, perDelivery: 1.50 },
    { deliveries: 100, price: 120, perDelivery: 1.20 }
  ],
  addOns: 1.00
};

// Calculate price based on distance
function calculatePrice(distance) {
  const range = PRICING.standard.find(r => distance >= r.min && distance <= r.max);
  return range ? range.price : null;
}

// Send notification to owner
async function notifyOwner(bookingDetails) {
  const message = `
🔔 NEW BOOKING REQUEST

👤 Customer: ${bookingDetails.name}
📱 Phone: ${bookingDetails.phone}

📍 Pickup: ${bookingDetails.pickup}
📍 Delivery: ${bookingDetails.delivery}
📦 Item: ${bookingDetails.item}
⏰ When: ${bookingDetails.when}

${bookingDetails.addOns ? `➕ Add-ons: ${bookingDetails.addOns}` : ''}
${bookingDetails.notes ? `📝 Notes: ${bookingDetails.notes}` : ''}

💰 Estimated: $${bookingDetails.estimatedPrice || 'TBD'}
  `.trim();

  // Send Telegram notification
  try {
    await bot.sendMessage(OWNER_TELEGRAM_ID, message);
  } catch (error) {
    console.error('Telegram notification failed:', error.message);
  }

  // Send email notification
  try {
    await emailTransporter.sendMail({
      from: EMAIL_CONFIG.auth.user,
      to: NOTIFICATION_EMAIL,
      subject: `New Booking: ${bookingDetails.name}`,
      text: message,
      html: message.replace(/\n/g, '<br>')
    });
  } catch (error) {
    console.error('Email notification failed:', error.message);
  }
}

// Main menu keyboard
function getMainMenu() {
  return {
    reply_markup: {
      keyboard: [
        ['📦 Book a Delivery', '💰 Check Prices'],
        ['ℹ️ Our Services', '📋 Subscriptions'],
        ['📞 Contact Us', '❓ Help']
      ],
      resize_keyboard: true
    }
  };
}

// Service descriptions
const SERVICES = {
  'Express Delivery': '🏍️ Same-Day Delivery\nBeat the Harare traffic! Our motorcycles navigate through congestion to deliver your packages the same day.',
  'Food Delivery': '🍔 Hot meals delivered fast! We pick up from your favorite restaurant and deliver while it\'s still fresh and warm.',
  'Grocery Delivery': '🛒 Need groceries in a hurry? We\'ll pick up from your preferred store and bring everything to your door.',
  'Documents & Parcels': '📦 Perfect for contracts, legal documents, and small packages. Safe, secure delivery with confirmation.',
  'E-commerce & Business': '🛍️ Selling online? Get priority service, regular deliveries, and discounted rates with a business account.'
};

// Start command
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;
  const welcomeMessage = `
🚚 Welcome to *TriCircle Logistics*!

Your trusted delivery partner in Harare and surrounding areas.

We're here 24/7 to take your bookings!
📍 Operating hours: 7 AM - 7 PM daily

What would you like to do today?
  `;
  
  bot.sendMessage(chatId, welcomeMessage, { 
    parse_mode: 'Markdown',
    ...getMainMenu()
  });
});

// Handle "Book a Delivery"
bot.onText(/📦 Book a Delivery/, (msg) => {
  const chatId = msg.chat.id;
  userSessions[chatId] = { step: 'name' };
  
  bot.sendMessage(chatId, '📝 Let\'s book your delivery!\n\nFirst, what\'s your name?', {
    reply_markup: { remove_keyboard: true }
  });
});

// Handle "Check Prices"
bot.onText(/💰 Check Prices/, (msg) => {
  const chatId = msg.chat.id;
  
  let priceMessage = '💰 *Standard Delivery Rates* (Per Trip)\n\n';
  PRICING.standard.forEach(range => {
    priceMessage += `${range.min}–${range.max} km: *$${range.price.toFixed(2)}*\n`;
  });
  
  priceMessage += '\n➕ *Add-ons* (+$1.00 each):\n';
  priceMessage += '• Return trip\n• Wait time (per 15 min)\n• After hours (6pm–6am)\n';
  priceMessage += '• Weekend/Public holiday\n• Express (within 1 hour)\n';
  priceMessage += '• Bulk (5+ items)\n• Fragile item\n• Oversized item';
  
  bot.sendMessage(chatId, priceMessage, { 
    parse_mode: 'Markdown',
    ...getMainMenu()
  });
});

// Handle "Our Services"
bot.onText(/ℹ️ Our Services/, (msg) => {
  const chatId = msg.chat.id;
  
  let servicesMessage = '🚚 *Our Services*\n\n';
  Object.entries(SERVICES).forEach(([name, desc]) => {
    servicesMessage += `*${name}*\n${desc}\n\n`;
  });
  
  bot.sendMessage(chatId, servicesMessage, { 
    parse_mode: 'Markdown',
    ...getMainMenu()
  });
});

// Handle "Subscriptions"
bot.onText(/📋 Subscriptions/, (msg) => {
  const chatId = msg.chat.id;
  
  let subMessage = '📋 *Monthly Subscription Packages*\n\n';
  PRICING.subscriptions.forEach(pkg => {
    subMessage += `*${pkg.deliveries} deliveries/month*\n`;
    subMessage += `Price: $${pkg.price} ($${pkg.perDelivery.toFixed(2)}/delivery)\n\n`;
  });
  
  subMessage += '💼 Save more with subscriptions!\nPerfect for businesses and regular users.';
  
  bot.sendMessage(chatId, subMessage, { 
    parse_mode: 'Markdown',
    ...getMainMenu()
  });
});

// Handle "Contact Us"
bot.onText(/📞 Contact Us/, (msg) => {
  const chatId = msg.chat.id;
  
  const contactMessage = `
📞 *Contact Information*

📱 Phone: +263 780871414
📧 Email: triassynergry@gmail.com
💬 Telegram: [Message us here]

🕐 *Business Hours:*
7:00 AM - 7:00 PM (Daily)

📍 *Coverage Area:*
Harare and surrounding areas

⏰ *Bookings:* 24/7 accepted!
We respond during business hours.
  `;
  
  bot.sendMessage(chatId, contactMessage, { 
    parse_mode: 'Markdown',
    ...getMainMenu()
  });
});

// Handle "Help"
bot.onText(/❓ Help/, (msg) => {
  const chatId = msg.chat.id;
  
  const helpMessage = `
❓ *How to Use This Bot*

📦 *Book a Delivery:* Get instant quotes and schedule pickups
💰 *Check Prices:* View our pricing structure
ℹ️ *Our Services:* Learn about what we offer
📋 *Subscriptions:* Save with monthly packages
📞 *Contact Us:* Get our contact information

💡 *Quick Tips:*
• Bookings are accepted 24/7
• We operate 7 AM - 7 PM daily
• Payment methods: Cash, EcoCash USD, Bank Transfer
• You'll receive delivery confirmation via WhatsApp

Need immediate assistance? Call +263 780871414
  `;
  
  bot.sendMessage(chatId, helpMessage, { 
    parse_mode: 'Markdown',
    ...getMainMenu()
  });
});

// Handle booking flow
bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const text = msg.text;
  const session = userSessions[chatId];
  
  if (!session || !session.step) return;
  
  switch (session.step) {
    case 'name':
      session.name = text;
      session.step = 'phone';
      bot.sendMessage(chatId, '📱 Great! What\'s your phone number?');
      break;
      
    case 'phone':
      session.phone = text;
      session.step = 'pickup';
      bot.sendMessage(chatId, '📍 Where should we pick up from?\n(Please provide full address)');
      break;
      
    case 'pickup':
      session.pickup = text;
      session.step = 'delivery';
      bot.sendMessage(chatId, '📍 Where should we deliver to?\n(Please provide full address)');
      break;
      
    case 'delivery':
      session.delivery = text;
      session.step = 'item';
      bot.sendMessage(chatId, '📦 What are you sending?\n(e.g., documents, food, groceries, parcel)');
      break;
      
    case 'item':
      session.item = text;
      session.step = 'when';
      bot.sendMessage(chatId, '⏰ When do you need it delivered?\n(e.g., ASAP, Today 3pm, Tomorrow morning)');
      break;
      
    case 'when':
      session.when = text;
      session.step = 'distance';
      bot.sendMessage(chatId, '📏 Approximately how far is the delivery? (in km)\n\nIf you\'re not sure, just type "not sure" and we\'ll calculate it.');
      break;
      
    case 'distance':
      if (text.toLowerCase().includes('not sure')) {
        session.estimatedPrice = 'TBD';
      } else {
        const distance = parseFloat(text);
        if (!isNaN(distance)) {
          session.estimatedPrice = calculatePrice(distance);
        }
      }
      session.step = 'addons';
      
      const addOnsKeyboard = {
        reply_markup: {
          keyboard: [
            ['Return trip', 'Wait time'],
            ['After hours', 'Express'],
            ['Fragile item', 'Bulk items'],
            ['No add-ons needed']
          ],
          resize_keyboard: true
        }
      };
      
      bot.sendMessage(chatId, '➕ Any add-ons needed? (+$1.00 each)\nSelect all that apply, or "No add-ons needed"', addOnsKeyboard);
      break;
      
    case 'addons':
      if (!text.includes('No add-ons')) {
        session.addOns = session.addOns ? `${session.addOns}, ${text}` : text;
        bot.sendMessage(chatId, `Added: ${text}\n\nSelect more add-ons or type "done" to continue.`);
      } else {
        session.step = 'notes';
        bot.sendMessage(chatId, '📝 Any special instructions or notes?\n(Or type "none")', {
          reply_markup: { remove_keyboard: true }
        });
      }
      
      if (text.toLowerCase() === 'done') {
        session.step = 'notes';
        bot.sendMessage(chatId, '📝 Any special instructions or notes?\n(Or type "none")', {
          reply_markup: { remove_keyboard: true }
        });
      }
      break;
      
    case 'notes':
      session.notes = text.toLowerCase() === 'none' ? '' : text;
      
      // Send confirmation to customer
      const confirmMessage = `
✅ *Booking Confirmed!*

We've received your delivery request:

👤 ${session.name}
📱 ${session.phone}
📍 From: ${session.pickup}
📍 To: ${session.delivery}
📦 Item: ${session.item}
⏰ When: ${session.when}
${session.addOns ? `➕ Add-ons: ${session.addOns}` : ''}
${session.notes ? `📝 Notes: ${session.notes}` : ''}

💰 Estimated cost: ${session.estimatedPrice ? `$${session.estimatedPrice}` : 'We\'ll confirm pricing shortly'}

We'll contact you shortly to confirm!
📞 +263 780871414

Thank you for choosing TriCircle Logistics! 🚚
      `;
      
      bot.sendMessage(chatId, confirmMessage, { 
        parse_mode: 'Markdown',
        ...getMainMenu()
      });
      
      // Notify owner
      await notifyOwner(session);
      
      // Clear session
      delete userSessions[chatId];
      break;
  }
});

console.log('TriCircle Logistics bot is running...');

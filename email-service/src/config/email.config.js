require('dotenv').config({ path: '.env.local' });

module.exports = {
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    queue: process.env.RABBITMQ_QUEUE_EMAIL || 'email_notifications',
  },
  smtp: {
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  },
  emailFrom: {
    name: process.env.EMAIL_FROM_NAME || 'RAKC Bookstore',
    address: process.env.EMAIL_FROM_ADDRESS || 'noreply@rakcbookstore.com',
  },
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/Bookstore',
  },
  scheduler: {
    paymentReminderCron: process.env.PAYMENT_REMINDER_CRON || '0 9 * * MON',
  },
  app: {
    port: parseInt(process.env.PORT || '3002'),
    nodeEnv: process.env.NODE_ENV || 'development',
  },
};

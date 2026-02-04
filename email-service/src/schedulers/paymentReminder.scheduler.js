const cron = require('node-cron');
const mongoose = require('mongoose');
const config = require('../config/email.config');
const emailService = require('../services/email.service');

class PaymentReminderScheduler {
  constructor() {
    this.task = null;
  }

  start() {
    console.log(`📅 Starting payment reminder scheduler: ${config.scheduler.paymentReminderCron}`);

    this.task = cron.schedule(config.scheduler.paymentReminderCron, async () => {
      console.log('⏰ Running weekly payment reminder job...');
      await this.sendPaymentReminders();
    });

    console.log('✅ Payment reminder scheduler started');
  }

  async sendPaymentReminders() {
    try {
      // Get all pending payments from your database
      // This is a placeholder - adjust based on your actual schema
      const Payment = mongoose.model('Payment');
      
      const pendingPayments = await Payment.find({
        status: 'Pending',
        amountPending: { $gt: 0 },
      })
        .populate('customerId', 'name email')
        .populate('orderId', '_id createdAt');

      console.log(`📧 Found ${pendingPayments.length} pending payments`);

      for (const payment of pendingPayments) {
        // Calculate due date (e.g., 30 days from order date)
        const orderDate = new Date(payment.orderId.createdAt);
        const dueDate = new Date(orderDate);
        dueDate.setDate(dueDate.getDate() + 30);

        await emailService.sendPaymentReminder({
          customerEmail: payment.customerId.email,
          customerName: payment.customerId.name,
          orderId: payment.orderId._id.toString(),
          orderDate: orderDate.toLocaleDateString('en-GB'),
          amountDue: payment.amountPending.toFixed(2),
          dueDate: dueDate.toLocaleDateString('en-GB'),
          paymentLink: `https://yourbookstore.com/payments/${payment._id}`,
        });

        // Optional: Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      console.log('✅ Payment reminders sent successfully');
    } catch (error) {
      console.error('❌ Error sending payment reminders:', error.message);
    }
  }

  stop() {
    if (this.task) {
      this.task.stop();
      console.log('🛑 Payment reminder scheduler stopped');
    }
  }
}

module.exports = new PaymentReminderScheduler();

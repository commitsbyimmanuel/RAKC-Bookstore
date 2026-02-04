const cron = require('node-cron');
const mongoose = require('mongoose');
const config = require('../config/email.config');
const emailService = require('../services/email.service');

// Define Sale schema for email service (mirrors backend schema)
const saleSchema = new mongoose.Schema({
  id: String,
  customerName: String,
  customerEmail: String,
  totalAmount: Number,
  paymentMethod: String,
  paymentStatus: String,
  amountPaid: Number,
  purchaseDate: String,
}, { collection: 'sales' });

// Only define model if not already defined
const Sale = mongoose.models.Sale || mongoose.model('Sale', saleSchema);

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
      // Get all pending sales with Bank Transfer payment method
      const pendingSales = await Sale.find({
        paymentStatus: 'Pending',
        paymentMethod: 'Bank Transfer',
        customerEmail: { $ne: '', $exists: true }
      });

      console.log(`📧 Found ${pendingSales.length} pending sales to remind`);

      for (const sale of pendingSales) {
        const amountDue = sale.totalAmount - (sale.amountPaid || 0);
        
        // Skip if already fully paid
        if (amountDue <= 0) continue;

        await emailService.sendPaymentReminder({
          customerEmail: sale.customerEmail,
          customerName: sale.customerName,
          orderId: sale.id,
          orderDate: sale.purchaseDate,
          amountDue: amountDue.toFixed(2),
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

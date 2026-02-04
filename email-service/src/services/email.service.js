const nodemailer = require('nodemailer');
const config = require('../config/email.config');
const templateService = require('./template.service');
const EmailLog = require('../models/EmailLog');

class EmailService {
  constructor() {
    this.transporter = null;
    this.initializeTransporter();
  }

  initializeTransporter() {
    this.transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.secure,
      auth: config.smtp.auth,
    });

    // Verify connection
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ SMTP connection failed:', error.message);
      } else {
        console.log('✅ SMTP server is ready to send emails');
      }
    });
  }

  /**
   * Send an email using a template
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email
   * @param {string} options.subject - Email subject
   * @param {string} options.template - Template name
   * @param {Object} options.data - Data to populate template
   * @param {string} options.type - Email type (for logging)
   */
  async sendEmail({ to, subject, template, data, type = 'general' }) {
    try {
      // Render the HTML template
      const html = await templateService.getRenderedTemplate(template, data);

      // Send email
      const info = await this.transporter.sendMail({
        from: `"${config.emailFrom.name}" <${config.emailFrom.address}>`,
        to,
        subject,
        html,
      });

      console.log(`✉️  Email sent to ${to}: ${info.messageId}`);

      // Log to database
      await this.logEmail({
        to,
        subject,
        template,
        type,
        status: 'sent',
        messageId: info.messageId,
      });

      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error(`❌ Failed to send email to ${to}:`, error.message);

      // Log failure to database
      await this.logEmail({
        to,
        subject,
        template,
        type,
        status: 'failed',
        error: error.message,
      });

      return { success: false, error: error.message };
    }
  }

  /**
   * Send payment reminder email
   * @param {Object} paymentData - Payment details
   */
  async sendPaymentReminder(paymentData) {
    return this.sendEmail({
      to: paymentData.customerEmail,
      subject: 'Payment Reminder - RAKC Bookstore',
      template: 'payment-reminder',
      data: {
        customerName: paymentData.customerName,
        orderId: paymentData.orderId,
        orderDate: paymentData.orderDate,
        amountDue: paymentData.amountDue,
        dueDate: paymentData.dueDate,
        paymentLink: paymentData.paymentLink || '#',
      },
      type: 'payment_reminder',
    });
  }

  /**
   * Send order confirmation email
   * @param {Object} orderData - Order details
   */
  async sendOrderConfirmation(orderData) {
    return this.sendEmail({
      to: orderData.customerEmail,
      subject: 'Order Confirmation - RAKC Bookstore',
      template: 'order-confirmation',
      data: {
        customerName: orderData.customerName,
        orderId: orderData.orderId,
        orderDate: orderData.orderDate,
        paymentMethod: orderData.paymentMethod,
        orderItems: orderData.orderItems,
        totalAmount: orderData.totalAmount,
      },
      type: 'order_confirmation',
    });
  }

  /**
   * Log email to database
   * @param {Object} logData - Email log data
   */
  async logEmail(logData) {
    try {
      await EmailLog.create({
        ...logData,
        sentAt: new Date(),
      });
    } catch (error) {
      console.error('Failed to log email:', error.message);
    }
  }
}

module.exports = new EmailService();

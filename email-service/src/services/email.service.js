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
   * Format order items as HTML for email template
   * @param {Array} items - Array of order items
   * @returns {string} HTML string of formatted items
   */
  formatOrderItems(items) {
    if (!items || items.length === 0) {
      return '<p style="color: rgba(255, 255, 255, 0.5); text-align: center;">No items</p>';
    }

    return items.map(item => {
      const coverUrl = item.coverUrl || 'https://via.placeholder.com/60x80?text=No+Cover';
      const itemTotal = (item.quantity * item.unitPrice).toFixed(2);
      
      return `
        <div class="item">
          <img src="${coverUrl}" alt="${item.title}" class="item-cover" />
          <div class="item-details">
            <div class="item-title">${item.title}</div>
            <div class="item-meta">${item.quantity} × ${item.unitPrice} AED</div>
          </div>
          <div class="item-price">${itemTotal} AED</div>
        </div>
      `;
    }).join('');
  }

  /**
   * Generate bank transfer information HTML
   * @param {string} paymentMethod - Payment method used
   * @param {number} totalAmount - Total amount to be paid
   * @returns {string} HTML string for bank transfer info or empty string
   */
  getBankTransferInfo(paymentMethod, totalAmount) {
    if (paymentMethod !== 'Bank Transfer') {
      return '';
    }

    return `
      <div class="bank-transfer-section">
        <div class="bank-transfer-header">
          <div class="bank-icon">🏦</div>
          <div class="bank-transfer-title">Bank Transfer Instructions</div>
        </div>
        <div class="bank-info">
          <div class="bank-detail">
            <div class="bank-detail-label">Bank Name</div>
            <div class="bank-detail-value">Emirates NBD</div>
          </div>
          <div class="bank-detail">
            <div class="bank-detail-label">Account Name</div>
            <div class="bank-detail-value">RAKC Bookstore</div>
          </div>
          <div class="bank-detail">
            <div class="bank-detail-label">Account Number</div>
            <div class="bank-detail-value">1234567890</div>
          </div>
          <div class="bank-detail">
            <div class="bank-detail-label">IBAN</div>
            <div class="bank-detail-value">AE12 0340 1234 5678 9012 345</div>
          </div>
          <div class="bank-detail">
            <div class="bank-detail-label">Amount to Transfer</div>
            <div class="bank-detail-value">AED ${totalAmount}</div>
          </div>
        </div>
        <p class="notice-text">
          📌 Please use your Order ID <strong>${'{{orderId}}'}</strong> as the payment reference.
          After making the transfer, please send the payment confirmation to our support email.
        </p>
      </div>
    `;
  }

  /**
   * Send order confirmation email
   * @param {Object} orderData - Order details
   */
  async sendOrderConfirmation(orderData) {
    // Format order items with book covers
    const formattedItems = this.formatOrderItems(orderData.orderItems);
    
    // Generate bank transfer info if needed
    const bankTransferInfo = this.getBankTransferInfo(
      orderData.paymentMethod, 
      orderData.totalAmount
    );

    return this.sendEmail({
      to: orderData.customerEmail,
      subject: 'Receipt - RAKC Bookstore',
      template: 'order-confirmation',
      data: {
        customerName: orderData.customerName,
        orderId: orderData.orderId,
        orderDate: orderData.orderDate,
        paymentMethod: orderData.paymentMethod,
        orderItems: formattedItems,
        totalAmount: orderData.totalAmount,
        bankTransferInfo: bankTransferInfo,
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

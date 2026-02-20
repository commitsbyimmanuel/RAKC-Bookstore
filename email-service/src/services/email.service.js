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
      return '<p style="color: #888888; text-align: center;">No items</p>';
    }

    return items.map(item => {
      const coverUrl = item.coverUrl || 'https://via.placeholder.com/60x80?text=No+Cover';
      const itemTotal = (item.quantity * item.unitPrice).toFixed(2);
      
      return `
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #1e1e1e; border: 1px solid #333333; border-radius: 8px; margin-bottom: 12px;">
          <tr>
            <td style="padding: 16px;">
              <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td width="70" valign="top">
                    <img src="${coverUrl}" alt="${item.title}" width="60" height="80" style="display: block; border-radius: 6px; border: 1px solid #3a3a3a;" />
                  </td>
                  <td valign="middle" style="padding-left: 16px;">
                    <p style="margin: 0 0 4px 0; font-size: 15px; font-weight: 600; color: #eeeeee;">${item.title}</p>
                    <p style="margin: 0; font-size: 13px; color: #888888;">${item.quantity} × ${item.unitPrice} AED</p>
                  </td>
                  <td width="100" align="right" valign="middle">
                    <p style="margin: 0; font-size: 14px; font-weight: 700; color: #cccccc;">${itemTotal} AED</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      `;
    }).join('');
  }

  /**
   * Generate bank transfer information HTML
   * @param {string} paymentMethod - Payment method used
   * @param {number} totalAmount - Total amount to be paid
   * @returns {string} HTML string for bank transfer info or empty string
   */
  getBankTransferInfo(paymentMethod, orderId, totalAmount) {
    if (paymentMethod !== 'Bank Transfer') {
      return '';
    }

    return `
      <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #3d3000; border: 1px solid #665500; border-radius: 12px; margin-top: 24px;">
        <tr>
          <td style="padding: 24px;">
            
            <!-- Header -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom: 20px;">
              <tr>
                <td width="50" style="font-size: 32px;">🏦</td>
                <td style="font-size: 16px; font-weight: 700; color: #FFC107; text-transform: uppercase; letter-spacing: 1px;">Bank Transfer Instructions</td>
              </tr>
            </table>
            
            <!-- Bank Details -->
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="background-color: #2a2a2a; border: 1px solid #3a3a3a; border-radius: 8px;">
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #3a3a3a;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Bank Name</p>
                  <p style="margin: 0; font-size: 14px; color: #eeeeee; font-weight: 600; font-family: 'Courier New', monospace;">RAK Bank</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #3a3a3a;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Account Name</p>
                  <p style="margin: 0; font-size: 14px; color: #eeeeee; font-weight: 600; font-family: 'Courier New', monospace;">The United Christian Church</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 16px; border-bottom: 1px solid #3a3a3a;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">IBAN</p>
                  <p style="margin: 0; font-size: 14px; color: #eeeeee; font-weight: 600; font-family: 'Courier New', monospace;">AE960400000052090013001</p>
                </td>
              </tr>
              <tr>
                <td style="padding: 12px 16px;">
                  <p style="margin: 0 0 4px 0; font-size: 12px; color: #777777; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">Amount to Transfer</p>
                  <p style="margin: 0; font-size: 14px; color: #eeeeee; font-weight: 600; font-family: 'Courier New', monospace;">AED ${totalAmount}</p>
                </td>
              </tr>
            </table>
            
            <!-- Notice -->
            <p style="margin: 16px 0 0 0; font-size: 13px; color: #d4a800; line-height: 1.5;">
              📌 After making the transfer, please send the payment confirmation by replying to this email or via WhatsApp.
            </p>
            
          </td>
        </tr>
      </table>
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
      orderData.orderId,
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

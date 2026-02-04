const amqp = require('amqplib');
const config = require('../config/email.config');
const emailService = require('../services/email.service');

class RabbitMQConsumer {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      console.log('🐰 Connecting to RabbitMQ...');
      this.connection = await amqp.connect(config.rabbitmq.url);
      this.channel = await this.connection.createChannel();

      // Assert queue exists
      await this.channel.assertQueue(config.rabbitmq.queue, {
        durable: true,
      });

      console.log(`✅ Connected to RabbitMQ, listening on queue: ${config.rabbitmq.queue}`);

      // Handle connection errors
      this.connection.on('error', (err) => {
        console.error('❌ RabbitMQ connection error:', err.message);
        setTimeout(() => this.connect(), 5000); // Reconnect after 5 seconds
      });

      this.connection.on('close', () => {
        console.log('⚠️  RabbitMQ connection closed, reconnecting...');
        setTimeout(() => this.connect(), 5000);
      });

      // Start consuming messages
      this.consume();
    } catch (error) {
      console.error('❌ Failed to connect to RabbitMQ:', error.message);
      setTimeout(() => this.connect(), 5000); // Retry connection
    }
  }

  async consume() {
    try {
      this.channel.consume(
        config.rabbitmq.queue,
        async (msg) => {
          if (msg !== null) {
            try {
              const message = JSON.parse(msg.content.toString());
              console.log('📬 Received message:', message.type);

              await this.handleMessage(message);

              // Acknowledge message
              this.channel.ack(msg);
            } catch (error) {
              console.error('❌ Error processing message:', error.message);
              // Reject and requeue message on error
              this.channel.nack(msg, false, true);
            }
          }
        },
        {
          noAck: false, // Manual acknowledgment
        }
      );
    } catch (error) {
      console.error('❌ Error setting up consumer:', error.message);
    }
  }

  async handleMessage(message) {
    switch (message.type) {
      case 'order_confirmation':
        await emailService.sendOrderConfirmation(message.data);
        break;

      case 'payment_reminder':
        await emailService.sendPaymentReminder(message.data);
        break;

      default:
        console.warn(`⚠️  Unknown message type: ${message.type}`);
    }
  }

  async close() {
    try {
      await this.channel.close();
      await this.connection.close();
      console.log('🐰 RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error.message);
    }
  }
}

module.exports = new RabbitMQConsumer();

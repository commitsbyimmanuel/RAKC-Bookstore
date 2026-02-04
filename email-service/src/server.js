const mongoose = require('mongoose');
const config = require('./config/email.config');
const rabbitMqConsumer = require('./consumers/rabbitMq.consumer');
const paymentReminderScheduler = require('./schedulers/paymentReminder.scheduler');

class EmailServiceApp {
  async start() {
    console.log('🚀 Starting Email Service...');

    try {
      // Connect to MongoDB
      await this.connectDatabase();

      // Start RabbitMQ consumer
      await rabbitMqConsumer.connect();

      // Start payment reminder scheduler
      paymentReminderScheduler.start();

      console.log('✅ Email Service is running');
      console.log(`📧 Environment: ${config.app.nodeEnv}`);
      console.log(`🐰 RabbitMQ Queue: ${config.rabbitmq.queue}`);
      console.log(`📅 Payment Reminder Schedule: ${config.scheduler.paymentReminderCron}`);

      // Handle graceful shutdown
      this.setupGracefulShutdown();
    } catch (error) {
      console.error('❌ Failed to start Email Service:', error.message);
      process.exit(1);
    }
  }

  async connectDatabase() {
    try {
      console.log('🔌 Connecting to MongoDB...');
      await mongoose.connect(config.mongodb.uri);
      console.log('✅ MongoDB connected');
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      throw error;
    }
  }

  setupGracefulShutdown() {
    const shutdown = async (signal) => {
      console.log(`\n${signal} received, shutting down gracefully...`);

      try {
        // Stop scheduler
        paymentReminderScheduler.stop();

        // Close RabbitMQ connection
        await rabbitMqConsumer.close();

        // Close MongoDB connection
        await mongoose.connection.close();

        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      } catch (error) {
        console.error('❌ Error during shutdown:', error.message);
        process.exit(1);
      }
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));
  }
}

// Start the application
const app = new EmailServiceApp();
app.start();

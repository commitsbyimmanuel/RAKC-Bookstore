import amqp from 'amqplib';

let connection = null;
let channel = null;

/**
 * Connect to RabbitMQ
 * Only attempts connection if RABBITMQ_URL is configured
 */
async function connect() {
  const RABBITMQ_URL = process.env.RABBITMQ_URL;
  
  if (!RABBITMQ_URL) {
    console.log('⚠️  RabbitMQ URL not configured - email notifications disabled');
    return null;
  }

  try {
    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();
    
    console.log('✅ Connected to RabbitMQ');
    
    // Handle connection errors
    connection.on('error', (err) => {
      console.error('❌ RabbitMQ connection error:', err.message);
      connection = null;
      channel = null;
    });
    
    connection.on('close', () => {
      console.log('⚠️  RabbitMQ connection closed');
      connection = null;
      channel = null;
    });
    
    return channel;
  } catch (error) {
    console.error('❌ Failed to connect to RabbitMQ:', error.message);
    return null;
  }
}

/**
 * Publish a message to a RabbitMQ queue
 * @param {string} queueName - Name of the queue
 * @param {object} message - Message object to publish
 */
export async function publishToQueue(queueName, message) {
  const RABBITMQ_URL = process.env.RABBITMQ_URL;
  
  // Skip if RabbitMQ is not configured
  if (!RABBITMQ_URL) {
    return;
  }

  try {
    // Ensure we have a channel
    if (!channel) {
      channel = await connect();
    }
    
    // If still no channel, skip publishing
    if (!channel) {
      console.log('⚠️  Skipping RabbitMQ publish - no connection');
      return;
    }

    // Assert queue exists
    await channel.assertQueue(queueName, { durable: true });
    
    // Publish message
    const messageBuffer = Buffer.from(JSON.stringify(message));
    channel.sendToQueue(queueName, messageBuffer, { persistent: true });
    
    console.log(`📧 Published message to queue: ${queueName}`);
  } catch (error) {
    console.error(`❌ Failed to publish to queue ${queueName}:`, error.message);
    // Reset channel on error
    channel = null;
  }
}

/**
 * Close RabbitMQ connection
 */
export async function closeConnection() {
  try {
    if (channel) await channel.close();
    if (connection) await connection.close();
    console.log('🐰 RabbitMQ connection closed');
  } catch (error) {
    console.error('Error closing RabbitMQ connection:', error.message);
  }
}

// Export connect function
export { connect };


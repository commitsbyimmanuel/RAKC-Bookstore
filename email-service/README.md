# RAKC Email Service

A microservice for handling email notifications in the RAKC Bookstore application.

## Features

- **Event-Driven Emails**: Listens to RabbitMQ messages and sends emails (order confirmations, etc.)
- **Scheduled Emails**: Sends payment reminders weekly using cron jobs
- **HTML Templates**: Beautiful, responsive email templates
- **Email Logging**: Tracks all sent emails in MongoDB
- **Auto-Reconnect**: Automatically reconnects to RabbitMQ on connection loss
- **Graceful Shutdown**: Properly closes connections on termination

## Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌──────────┐
│  Backend    │─────▶│   RabbitMQ       │◀─────│  Email   │
│  Service    │      │   (Queue)        │      │  Service │
└─────────────┘      └──────────────────┘      └──────────┘
                                                     │
                                                     │
                                    ┌────────────────┴─────────────┐
                                    │                              │
                              ┌─────▼──────┐              ┌────────▼────────┐
                              │  Consumer  │              │   Scheduler     │
                              │  (Events)  │              │  (Weekly Cron)  │
                              └────────────┘              └─────────────────┘
                                    │                              │
                                    └──────────┬───────────────────┘
                                               │
                                         ┌─────▼──────┐
                                         │   SMTP     │
                                         │  (Gmail)   │
                                         └────────────┘
```

## Setup

### 1. Environment Configuration

Copy `.env.example` to `.env.local` and fill in your SMTP credentials:

```bash
cp .env.example .env.local
```

**Gmail SMTP Setup:**
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password: [Google App Passwords](https://myaccount.google.com/apppasswords)
3. Use the app password in `SMTP_PASS`

### 2. Install Dependencies

```bash
npm install
```

### 3. Run Locally (Development)

```bash
npm run dev
```

### 4. Run with Docker

Add to your `docker-compose.yaml`:

```yaml
email-service:
  build: ./email-service
  container_name: rakc-email-service
  env_file:
    - ./email-service/.env.local
  depends_on:
    - mongodb
    - rabbitmq
  restart: unless-stopped
```

Then run:

```bash
docker-compose up -d email-service
```

## RabbitMQ Message Format

Send messages to the `email_notifications` queue with this format:

### Order Confirmation

```json
{
  "type": "order_confirmation",
  "data": {
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "orderId": "ORD123",
    "orderDate": "03/02/2026",
    "paymentMethod": "Bank Transfer",
    "orderItems": "<ul><li>Book 1 - AED 50</li></ul>",
    "totalAmount": "50.00"
  }
}
```

### Payment Reminder

```json
{
  "type": "payment_reminder",
  "data": {
    "customerEmail": "customer@example.com",
    "customerName": "John Doe",
    "orderId": "ORD123",
    "orderDate": "03/01/2026",
    "amountDue": "150.00",
    "dueDate": "03/02/2026",
    "paymentLink": "https://yourbookstore.com/payments/123"
  }
}
```

## Email Templates

Templates are located in `src/templates/` and support variable substitution using `{{variableName}}`.

Available templates:
- `payment-reminder.html` - Weekly payment reminders
- `order-confirmation.html` - Order confirmation emails

## Scheduler Configuration

Edit the cron expression in `.env.local`:

```
PAYMENT_REMINDER_CRON=0 9 * * MON
```

Format: `minute hour day month weekday`

Examples:
- `0 9 * * MON` - Every Monday at 9:00 AM
- `0 14 * * FRI` - Every Friday at 2:00 PM
- `0 9 * * 1-5` - Weekdays at 9:00 AM

## Logs

Email send attempts are logged to MongoDB in the `emaillogs` collection with:
- Recipient
- Subject
- Status (sent/failed)
- Timestamp
- Error messages (if failed)

## Troubleshooting

**SMTP Connection Failed:**
- Verify Gmail credentials
- Ensure App Password is used (not regular password)
- Check firewall/network settings

**RabbitMQ Connection Failed:**
- Ensure RabbitMQ container is running: `docker-compose up -d rabbitmq`
- Check RabbitMQ URL in `.env.local`

**MongoDB Connection Failed:**
- Ensure MongoDB container is running
- Verify MongoDB URI is correct

## License

ISC

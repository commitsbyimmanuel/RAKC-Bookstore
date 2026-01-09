# RAKC Bookstore Backend

MongoDB-based Express backend for the RAKC Bookstore application.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas account)

## Setup Instructions

### 1. Install Dependencies

```bash
cd backend
npm install
```

### 2. Configure MongoDB Connection

Copy the example environment file and configure your MongoDB connection:

```bash
# The .env.example file is provided as a template
# Create a .env.local file with your actual MongoDB URI
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017/Bookstore
PORT=3001
```

**For local MongoDB:**
```
MONGODB_URI=mongodb://localhost:27017/Bookstore
```

**For MongoDB Atlas:**
```
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/Bookstore
```

### 3. Seed the Database

Load the initial test data into MongoDB:

```bash
npm run seed
```

This will:
- Connect to your MongoDB database
- Clear existing collections
- Import all data from `../frontend/db.json`
- Display a summary of imported records

### 4. Start the Server

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will start on `http://localhost:3001`

## API Endpoints

All endpoints support standard RESTful operations:

### Books (`/books`)
- `GET /books` - List all books
- `GET /books/:id` - Get single book
- `POST /books` - Create new book
- `PUT /books/:id` - Full update
- `PATCH /books/:id` - Partial update
- `DELETE /books/:id` - Delete book

### Payments (`/payments`)
- `GET /payments` - List all payments
- `GET /payments/:id` - Get single payment
- `POST /payments` - Create new payment
- `PUT /payments/:id` - Full update
- `PATCH /payments/:id` - Partial update (e.g., update amount_payed)
- `DELETE /payments/:id` - Delete payment

### Book Requests (`/bookRequests`)
- `GET /bookRequests` - List all book requests
- `GET /bookRequests/:id` - Get single book request
- `POST /bookRequests` - Create new book request
- `PUT /bookRequests/:id` - Full update
- `PATCH /bookRequests/:id` - Partial update (e.g., mark as fulfilled)
- `DELETE /bookRequests/:id` - Delete book request

### Sales (`/sales`)
- `GET /sales` - List all sales
- `GET /sales/:id` - Get single sale
- `POST /sales` - Create new sale
- `PUT /sales/:id` - Full update
- `PATCH /sales/:id` - Partial update
- `DELETE /sales/:id` - Delete sale

## Query Filtering

All GET endpoints support query parameters for filtering, just like json-server:

```bash
# Get books by author
GET /books?authors=Timothy Keller

# Get pending payments
GET /payments?status=Pending

# Get fulfilled book requests
GET /bookRequests?fulfilled=true
```

## Project Structure

```
backend/
├── models/           # Mongoose schemas
│   ├── Book.js
│   ├── Payment.js
│   ├── BookRequest.js
│   └── Sale.js
├── routes/           # Express route handlers
│   ├── books.js
│   ├── payments.js
│   ├── bookRequests.js
│   └── sales.js
├── .env.example      # Environment template
├── .env.local        # Your local config (gitignored)
├── server.js         # Main application
├── seed.js           # Database seeding script
└── package.json      # Dependencies and scripts
```

## Notes

- The backend uses the same port (3001) as the previous json-server setup for seamless integration
- All IDs are auto-generated 4-character strings using nanoid for compatibility
- CORS is enabled for frontend communication
- The API maintains full compatibility with json-server behavior

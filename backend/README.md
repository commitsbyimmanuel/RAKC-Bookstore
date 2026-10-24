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
BOOKSTORE_DB_URI=mongodb://localhost:27017/rakc-platform
PORT=3001
```

**For local MongoDB:**
```
BOOKSTORE_DB_URI=mongodb://localhost:27017/rakc-platform
```

**For MongoDB Atlas:**
```
BOOKSTORE_DB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/rakc-platform
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
- `POST /books/:id/adjust-stock` - Set the exact nonnegative integer stock count. Body: `{ "stock": 3, "comment": "Corrected after physical count" }`. Comments require at least 10 characters and 3 words after normalizing whitespace. A database transaction updates stock, appends the book's `stockAdjustments` history, and inserts an `auditLogs` event. Returns 409 if stock changes during the update. An audit failure aborts the transaction.
- `DELETE /books/:id` - Delete book

### Stock adjustment audit trail

New adjustments write to `rakc-platform.auditLogs` with `domain: "bookstore"`, `type: "stock-adjustment"`, ISBN, book ID/title, verified user ID/name/email, server timestamp, old/new quantities, and comment. The embedded history includes the corresponding audit log ID. The request cannot override the user, domain, timestamp, or previous quantity.

This requires a database supporting multi-document transactions (the shared Firestore MongoDB-compatible database, or a MongoDB replica set for local development). Before rollout, run `npm run indexes:bookstore-audit -- --apply` in the Admin Console repository to provision the collection and its filter/cursor indexes. The command without `--apply` is a dry run. Audit events are append-only; the Admin Console exposes only `GET /api/books/audit-logs` with Books read permission and the `/books/audit-logs` page. Earlier embedded history is retained and is not backfilled into the new collection.

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
- Browser API requests use the frontend's same-origin `/api` proxy.

## Bookstore POS authentication

The Admin Console at `https://admin.rakchurch.com` is the BetterAuth authority.
This backend forwards sign-in and password-change requests to that authority and
keeps the signed session credential in an HttpOnly, host-only cookie. Session
credentials are never returned to browser JavaScript or stored in localStorage.
Every books, sales, requests, and directory request validates the live session and
the current `bookstorePos` permission through
`GET /api/bookstore/access`. An unavailable authority returns 503 and blocks data
access. There is no offline access mode or cached authorization grant.

In Admin Console > Access Management > Groups, set **Bookstore POS access** to
**Grant** for an intended group and save. Assign the intended users to that group.
The system Admin group has full access to every module and the Bookstore POS,
including the owner account. Other groups default to **Deny**. For non-admin
users, group grants combine: Deny contributes no POS permission; any assigned
granting group allows access. Removing the last grant or the user's membership
blocks their next API request unless they are still an admin. Admin Console
Books reporting permission remains independent for non-admin users.

The local Ubuntu workstation uses the hosts-file entry `127.0.0.1 bookstore.local`
and opens `http://bookstore.local`. Compose binds the frontend to `127.0.0.1:80`
and publishes no backend port. Plain HTTP is supported for this local alias and
loopback only; other production origins must use HTTPS. HTTPS origins use a
Secure `__Host-` cookie. POST/PUT/PATCH/DELETE requests require the configured
Origin and the frontend's custom request header. The workstation needs outbound
HTTPS access to the Admin Console for login and each protected request.

### Ubuntu rollout

The release images are backend `v1.10` and frontend `v1.3`. Use the updated
root `docker-compose.yaml`, keeping the workstation's existing `.env` values,
database, RabbitMQ, email service, and history. The Compose defaults are:

```dotenv
BOOKSTORE_AUTH_URL=https://admin.rakchurch.com
BOOKSTORE_PUBLIC_URL=http://bookstore.local
BOOKSTORE_BIND_ADDRESS=127.0.0.1
BOOKSTORE_PORT=80
```

Deploy the Admin Console changes before updating the workstation. From the
bookstore checkout on the Ubuntu PC, after pulling the integration commit:

```sh
docker compose config --quiet
docker compose pull backend frontend
docker compose up -d --no-deps backend frontend
docker compose ps backend frontend
curl -i http://bookstore.local/api/auth/session
curl -i http://bookstore.local/api/books
```

Both anonymous API requests must return 401. Open `http://bookstore.local` and
verify sign-in for an explicitly granted account, denial for an ungranted account,
temporary-password change if applicable, sign-out, and revocation while already
signed in. No schema migration, password reset, or data deletion is required.
The new optional sale and stock-adjustment actor fields apply to future writes.

If prebuilt image pulls are unavailable, build from the updated checkout with
`docker compose build backend frontend` and then run the same `up` command.
If verification fails, stop `frontend` and `backend` while correcting the rollout;
the previous images did not enforce authentication.

For development, run the backend with its `.env.local` settings from
`.env.example`; Vite proxies `/api` to `http://localhost:3001` by default. Override
`BOOKSTORE_API_UPSTREAM` in the frontend environment for another backend.

### Verification

`npm test` exercises the actual Express application without a database, including
direct anonymous routes, explicit grant revocation, expired sessions, temporary
passwords, cross-site requests, outages, sign-out, and login throttling. The Admin
Console tests separately exercise the real BetterAuth signed-bearer contract and
the explicit-grant policy. Local tests do not validate the Ubuntu workstation's
network, database credentials, printer, or live granted-user workflow.
- The API maintains full compatibility with json-server behavior

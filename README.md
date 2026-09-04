# Appixo Backend API

A Node.js Express API for managing guest users and their inquiries.

## Project Structure

```
appixo_backend/
├── controllers/          # Business logic for routes
│   └── guestUserController.js
├── routes/              # API route definitions
│   └── guestUser.js
├── server.js            # Main server entry point
├── package.json         # Project dependencies
├── .env                 # Environment variables
├── .gitignore          # Git ignore rules
└── README.md           # Documentation
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file with your configuration (already created with defaults)

### PostgreSQL setup

The API uses PostgreSQL for guest users, admins, and admin sessions. Create a database named `appixo_db`, then update these values in `.env` to match your PostgreSQL installation:

```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=appixo_db
DB_USER=postgres
DB_PASSWORD=your_postgres_password
```

You can use a single connection URL instead:

```env
DATABASE_URL=postgresql://username:password@host:5432/appixo_db
```

When `DATABASE_URL` is set, it takes precedence over the individual `DB_*` values.

The required tables and default admin account are created automatically when the server starts. The default admin credentials are `admin` / `admin123`.

## Running the Server

### Development mode (with auto-reload):
```bash
npm run dev
```

### Production mode:
```bash
npm start
```

The server will run on `http://localhost:3000` by default.

## API Endpoints

### Guest User Routes

#### 1. Register Guest User
- **Method**: POST
- **URL**: `/api/guest/register`
- **Body**:
```json
{
  "email": "john@example.com",
  "fullName": "John Doe",
  "phone": "+1 234 567 8900",
  "company": "Company name",
  "location": "Country/Region",
  "inquiryType": "Support",
  "projectContext": "What are you building..."
}
```
- **Response**: Guest user created with `guestId`

#### 2. Get Guest Profile
- **Method**: GET
- **URL**: `/api/guest/profile/:guestId`
- **Response**: Guest user details

#### 3. Update Guest Profile
- **Method**: PUT
- **URL**: `/api/guest/profile/:guestId`
- **Body**: Any fields to update (same as register)

#### 4. Delete Guest User
- **Method**: DELETE
- **URL**: `/api/guest/profile/:guestId`

#### 5. Get All Guest Users
- **Method**: GET
- **URL**: `/api/guest/all`
- **Response**: List of all guest users

### Admin Routes

#### 1. Admin Login
- **Method**: POST
- **URL**: `/api/admin/login`
- **Body**:
```json
{
  "username": "admin",
  "password": "admin123"
}
```
- **Response**: Returns a JWT `token` for authenticated requests
- **Default Credentials**: username: `admin`, password: `admin123`

#### 2. Admin Logout
- **Method**: POST
- **URL**: `/api/admin/logout`
- **Headers**: `Authorization: Bearer <your-token>`
- **Body**:
```json
{
  "token": "<your-token>"
}
```

#### 3. Get Admin Profile
- **Method**: GET
- **URL**: `/api/admin/profile`
- **Headers**: `Authorization: Bearer <your-token>`
- **Response**: Admin details (requires valid session)

#### 4. Get All Enquiries List
- **Method**: GET
- **URL**: `/api/admin/enquiries`
- **Headers**: `Authorization: Bearer <your-token>`
- **Response**: List of all guest enquiries with details
- **Requires**: Valid admin session

#### 5. Get Single Enquiry Details
- **Method**: GET
- **URL**: `/api/admin/enquiries/:enquiryId`
- **Headers**: `Authorization: Bearer <your-token>`
- **Response**: Complete enquiry details
- **Requires**: Valid admin session

#### 6. Update Enquiry Status
- **Method**: PUT
- **URL**: `/api/admin/enquiries/:enquiryId/status`
- **Headers**: `Authorization: Bearer <your-token>`
- **Body**:
```json
{
  "status": "in-progress"
}
```
- **Valid Statuses**: `pending`, `in-progress`, `resolved`, `closed`
- **Requires**: Valid admin session

### Health Check
- **Method**: GET
- **URL**: `/health`
- **Response**: Server status

## Testing the API

Use tools like Postman, cURL, or VS Code REST Client:

### Guest User API Tests
```bash
# Register a guest user
curl -X POST http://localhost:3000/api/guest/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "fullName": "Jane Doe",
    "phone": "+1 234 567 8900",
    "company": "Tech Corp",
    "location": "USA",
    "inquiryType": "Support",
    "projectContext": "Building a web application"
  }'

# Get all guest users
curl http://localhost:3000/api/guest/all

# Get specific guest profile
curl http://localhost:3000/api/guest/profile/1
```

### Admin API Tests
```bash
# Step 1: Admin Login
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin",
    "password": "admin123"
  }'
# Save the token from the response

# Step 2: View all enquiries (using token from login)
curl -X GET http://localhost:3000/api/admin/enquiries \
  -H "Authorization: Bearer <your-token>"

# Step 3: Get specific enquiry details
curl -X GET http://localhost:3000/api/admin/enquiries/1 \
  -H "Authorization: Bearer <your-token>"

# Step 4: Update enquiry status
curl -X PUT http://localhost:3000/api/admin/enquiries/1/status \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{
    "status": "in-progress"
  }'

# Step 5: Get admin profile
curl -X GET http://localhost:3000/api/admin/profile \
  -H "Authorization: Bearer <your-token>"

# Step 6: Admin logout
curl -X POST http://localhost:3000/api/admin/logout \
  -H "Content-Type: application/json" \
  -d '{
    "token": "<your-token>"
  }'
```

## Future Enhancements

- Replace in-memory storage with database integration (MongoDB/PostgreSQL)
- Implement proper password hashing (bcrypt) for admin credentials
- Add JWT tokens for more secure session management
- Add request validation middleware with input sanitization
- Add comprehensive logging (Winston/Morgan)
- Add unit and integration tests (Jest, Supertest)
- Add API documentation (Swagger/OpenAPI)
- Add rate limiting to prevent brute force attacks
- Add email notifications for new enquiries
- Add role-based access control (RBAC) for multiple admin levels
- Add enquiry assignment to specific admins
- Add enquiry notes/comments feature
- Add audit logging for admin actions
- Add data export functionality (CSV/PDF)
- Add pagination and filtering for enquiries list

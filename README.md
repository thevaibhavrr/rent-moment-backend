# Clothing Rental Backend API

A comprehensive Node.js and Express backend for a clothing rental application with MongoDB database and Cloudinary image storage.

## Features

- **User Authentication & Authorization**
  - JWT-based authentication
  - Role-based access control (User/Admin)
  - Password hashing with bcrypt
  - User registration and login

- **Category Management**
  - CRUD operations for clothing categories
  - Image upload to Cloudinary
  - Admin-only create/update/delete operations

- **Product Management**
  - CRUD operations for clothing products
  - Multiple image uploads
  - Advanced filtering and search
  - Rental-specific fields (duration, condition, etc.)

- **Order Management**
  - Create rental orders
  - Order status tracking
  - User and admin order views
  - Order statistics and analytics

- **User Management**
  - Admin user management
  - User statistics
  - Account activation/deactivation

## Tech Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT (JSON Web Tokens)
- **Image Storage**: Cloudinary
- **Validation**: Express-validator
- **Security**: Helmet, CORS, Rate limiting

## Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account
- Cloudinary account

## Installation

1. **Clone the repository**
   ```bash
   cd cloths-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   # MongoDB Configuration
   MONGODB_URI=mongodb+srv://vaibhavrathoremaaa:jVftYxEo3GEUmRTq@cloth.v6bacze.mongodb.net/clothing_rental

   # JWT Configuration
   JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
   JWT_EXPIRE=7d

   # Cloudinary Configuration
   CLOUDINARY_CLOUD_NAME=djrdmqjir
   CLOUDINARY_API_KEY=your_cloudinary_api_key
   CLOUDINARY_API_SECRET=your_cloudinary_api_secret
   CLOUDINARY_UPLOAD_PRESET=cloths

   # Server Configuration
   PORT=5000
   NODE_ENV=development

   # CORS Configuration
   CORS_ORIGIN=http://localhost:3000
   ```

4. **Start the server**
   ```bash
   # Development mode
   npm run dev

   # Production mode
   npm start
   ```

## API Endpoints

### Authentication

#### Register User
```
POST /api/auth/register
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "phone": "+1234567890",
  "address": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  }
}
```

#### Login User
```
POST /api/auth/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

#### Get Current User Profile
```
GET /api/auth/me
Authorization: Bearer <token>
```

#### Update Profile
```
PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "John Smith",
  "phone": "+1234567890"
}
```

### Categories

#### Get All Categories
```
GET /api/categories?page=1&limit=10&sort=name&order=asc
```

#### Get Category by ID
```
GET /api/categories/:id
```

#### Create Category (Admin Only)
```
POST /api/categories
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Traditional Dresses",
  "description": "Beautiful traditional Indian dresses",
  "image": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ...",
  "sortOrder": 1
}
```

#### Update Category (Admin Only)
```
PUT /api/categories/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Category Name",
  "description": "Updated description"
}
```

#### Delete Category (Admin Only)
```
DELETE /api/categories/:id
Authorization: Bearer <admin_token>
```

### Products

#### Get All Products
```
GET /api/products?page=1&limit=12&category=categoryId&search=dress&minPrice=50&maxPrice=200&size=M&color=red&featured=true
```

#### Get Product by ID
```
GET /api/products/:id
```

#### Create Product (Admin Only)
```
POST /api/products
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Beautiful Lehenga",
  "description": "Stunning traditional lehenga for special occasions",
  "category": "categoryId",
  "images": ["data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQ..."],
  "price": 150,
  "originalPrice": 500,
  "size": "M",
  "color": "Red",
  "rentalDuration": 7,
  "brand": "Designer Brand",
  "material": "Silk",
  "condition": "Excellent",
  "tags": ["traditional", "wedding", "party"],
  "careInstructions": "Dry clean only"
}
```

#### Update Product (Admin Only)
```
PUT /api/products/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price": 175,
  "isAvailable": true
}
```

#### Delete Product (Admin Only)
```
DELETE /api/products/:id
Authorization: Bearer <admin_token>
```

### Orders

#### Create Order
```
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "product": "productId",
      "quantity": 1,
      "rentalDuration": 7
    }
  ],
  "shippingAddress": {
    "name": "John Doe",
    "phone": "+1234567890",
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA"
  },
  "paymentMethod": "Credit Card",
  "rentalStartDate": "2024-01-15",
  "rentalEndDate": "2024-01-22",
  "notes": "Please deliver in the morning"
}
```

#### Get User Orders
```
GET /api/orders?page=1&limit=10&status=Pending
Authorization: Bearer <token>
```

#### Get Order by ID
```
GET /api/orders/:id
Authorization: Bearer <token>
```

#### Update Order Status (Admin Only)
```
PUT /api/orders/:id/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "orderStatus": "Confirmed",
  "paymentStatus": "Paid",
  "adminNotes": "Order confirmed and payment received"
}
```

#### Cancel Order
```
PUT /api/orders/:id/cancel
Authorization: Bearer <token>
```

### Users (Admin Only)

#### Get All Users
```
GET /api/users?page=1&limit=10&search=john&role=user&isActive=true
Authorization: Bearer <admin_token>
```

#### Get User by ID
```
GET /api/users/:id
Authorization: Bearer <admin_token>
```

#### Update User
```
PUT /api/users/:id
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Updated Name",
  "role": "admin",
  "isActive": true
}
```

#### Delete User
```
DELETE /api/users/:id
Authorization: Bearer <admin_token>
```

#### Toggle User Status
```
PUT /api/users/:id/toggle-status
Authorization: Bearer <admin_token>
```

## Database Models

### User
- name, email, password (hashed)
- role (user/admin), phone, address
- isActive, emailVerified, avatar
- timestamps

### Category
- name, description, image
- slug (auto-generated), isActive, sortOrder
- timestamps

### Product
- name, description, category (ref)
- images (array), price, originalPrice
- size, color, brand, material, condition
- rentalDuration, isAvailable, isFeatured
- tags, specifications, careInstructions
- slug, views, rating, numReviews
- timestamps

### Order
- user (ref), items (array with product refs)
- shippingAddress, paymentMethod
- paymentStatus, orderStatus
- subtotal, shippingCost, tax, totalAmount
- orderNumber (auto-generated)
- rentalStartDate, rentalEndDate
- notes, adminNotes, isActive
- timestamps

## Error Handling

The API returns consistent error responses:

```json
{
  "success": false,
  "message": "Error description",
  "errors": [
    {
      "field": "email",
      "message": "Please provide a valid email"
    }
  ]
}
```

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Input Validation**: Express-validator for request validation
- **CORS Protection**: Configurable CORS settings
- **Rate Limiting**: Prevents abuse with request limiting
- **Helmet**: Security headers for Express
- **Role-based Access**: Admin and user role separation

## Cloudinary Integration

The backend integrates with Cloudinary for image storage:

- Automatic image upload for categories and products
- Image optimization and transformation
- Secure image deletion when records are removed
- Support for multiple image formats

## Development

### Running in Development Mode
```bash
npm run dev
```

### Running Tests
```bash
npm test
```

### Environment Variables
Make sure to set up all required environment variables in your `.env` file before running the application.

## Deployment

1. Set up environment variables for production
2. Use a process manager like PM2
3. Set up MongoDB Atlas for production database
4. Configure Cloudinary for production
5. Set up proper CORS origins for your frontend domain

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the ISC License. 
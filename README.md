# Item & Purchase Management System

A simple Node.js + Express.js + MySQL web application implementing the Kartika Consultancy assignment.

## Features
- Item type management
- Item CRUD with Active/Inactive status
- Item list uses SQL JOIN with item_types
- Multi-item purchase under one Order ID
- Backend validation for item, quantity and stock
- MySQL transaction for purchase creation/update
- Stock deduction and quantity-difference adjustment on purchase update
- Purchase history and details
- No purchase deletion endpoint
- Basic responsive CSS

## Requirements
- Node.js 18+
- MySQL 8+
- A browser

## Database setup
1. Start MySQL on XAMPP.

2. Create the database
Open phpMyAdmin:
http://localhost/phpmyadmin
Go to SQL.
Open this file from the project: db/schema.sql
Copy its contents into phpMyAdmin's SQL box and click Go.

3. This creates database `item_purchase_db` and sample item types.

## Backend setup
```bash
cd backend
npm install
```
Copy `.env.example` to `.env` and set your MySQL password.

Start:
```bash
npm start
```
Backend: `http://localhost:5000`

## Frontend
Open `frontend/index.html` in a browser after the backend is running. If browser security blocks local file requests, serve the frontend with any simple static server.

## Main APIs
- GET/POST `/api/item-types`
- PUT/DELETE `/api/item-types/:id`
- GET/POST `/api/items`
- GET/PUT/DELETE `/api/items/:id`
- GET/POST `/api/purchases`
- GET/PUT `/api/purchases/:id`

There is deliberately no DELETE purchase route because purchases are historical records.

## Test flow
1. Create item types.
2. Create Laptop with stock 10 and Active status.
3. Create Mouse with stock 20 and Active status.
4. Create a purchase with Laptop=2 and Mouse=5.
5. Verify stock becomes 8 and 15.
6. Try buying 10 Laptops; backend should reject it because only 8 are available.
7. Mark an item inactive and verify it cannot be selected for a new purchase.
8. Try deleting an item used in purchase history; backend should reject deletion.

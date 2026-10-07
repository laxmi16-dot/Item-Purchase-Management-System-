# Item & Purchase Management System API Documentation

## 1. Overview

This API is an Express.js REST API for managing:

-   Item types
-   Inventory items
-   Purchase orders
-   Purchase order line items
-   Inventory stock quantities

The API uses JSON request/response bodies and MySQL for persistence.
CORS is enabled globally, and the server parses JSON request bodies.

### Base URL

``` text
http://localhost:5000
```

The port can be changed using the `PORT` environment variable.

### Content Type

For endpoints with a request body:

``` http
Content-Type: application/json
```

### Common Error Format

Errors are returned as JSON:

``` json
{
  "error": "Error message"
}
```

The API enables CORS and JSON parsing globally. Database connection
settings are loaded from environment variables.

------------------------------------------------------------------------

# 2. Environment Configuration

The application expects the following environment variables:

  Variable        Description
  --------------- --------------------------------------
  `DB_HOST`       MySQL database host
  `DB_USER`       MySQL username
  `DB_PASSWORD`   MySQL password
  `DB_NAME`       MySQL database name
  `PORT`          HTTP server port; defaults to `5000`

The MySQL connection pool uses a connection limit of 10 and waits for
connections when the pool is busy.

------------------------------------------------------------------------

# 3. API Endpoints

## 3.1 Health Check

### `GET /api/health`

Checks whether the API is running.

### Response

**Status: `200 OK`**

``` json
{
  "message": "API is running"
}
```

------------------------------------------------------------------------

# 4. Item Types

Item types represent categories/types assigned to inventory items.

## 4.1 Get All Item Types

### `GET /api/item-types`

Returns all item types ordered alphabetically by `type_name`.

### Response

**Status: `200 OK`**

``` json
[
  {
    "id": 1,
    "type_name": "Electronics"
  },
  {
    "id": 2,
    "type_name": "Furniture"
  }
]
```

### Error

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to load item types"
}
```

------------------------------------------------------------------------

## 4.2 Create Item Type

### `POST /api/item-types`

Creates a new item type.

### Request Body

``` json
{
  "type_name": "Electronics"
}
```

### Validation

-   `type_name` is required.
-   Whitespace-only values are rejected.
-   The value is trimmed before insertion.
-   Duplicate item types return a conflict response.

### Success Response

**Status: `201 Created`**

``` json
{
  "id": 1,
  "message": "Item type created"
}
```

### Errors

**Status: `400 Bad Request`**

``` json
{
  "error": "Item type is required"
}
```

**Status: `409 Conflict`**

``` json
{
  "error": "Item type already exists"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to create item type"
}
```

------------------------------------------------------------------------

## 4.3 Update Item Type

### `PUT /api/item-types/:id`

Updates an existing item type.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- --------------
  `id`        Integer          Yes Item type ID

### Request Body

``` json
{
  "type_name": "Consumer Electronics"
}
```

### Validation

-   `type_name` is required.
-   Whitespace-only values are rejected.
-   The value is trimmed before updating.

### Success Response

**Status: `200 OK`**

``` json
{
  "message": "Item type updated"
}
```

### Errors

**Status: `400 Bad Request`**

``` json
{
  "error": "Item type is required"
}
```

**Status: `404 Not Found`**

``` json
{
  "error": "Item type not found"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to update item type"
}
```

------------------------------------------------------------------------

## 4.4 Delete Item Type

### `DELETE /api/item-types/:id`

Deletes an item type.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- --------------
  `id`        Integer          Yes Item type ID

### Success Response

**Status: `200 OK`**

``` json
{
  "message": "Item type deleted"
}
```

### Errors

**Status: `404 Not Found`**

``` json
{
  "error": "Item type not found"
}
```

**Status: `409 Conflict`**

``` json
{
  "error": "Cannot delete an item type that is in use"
}
```

The API prevents deletion when the item type is referenced by existing
data.

------------------------------------------------------------------------

# 5. Items

Items represent inventory records.

## 5.1 Get All Items

### `GET /api/items`

Returns all inventory items.

The response includes:

-   Item ID
-   Item name
-   Item type name
-   Item type ID
-   Purchase date
-   Available stock
-   Active status
-   Calculated availability

Results are ordered by item ID descending.

### Response

**Status: `200 OK`**

``` json
[
  {
    "id": 10,
    "name": "Laptop",
    "type_name": "Electronics",
    "item_type_id": 1,
    "purchase_date": "2026-10-01",
    "stock_available": 15,
    "active": 1,
    "availability": "In Stock"
  },
  {
    "id": 9,
    "name": "Office Chair",
    "type_name": "Furniture",
    "item_type_id": 2,
    "purchase_date": "2026-09-28",
    "stock_available": 0,
    "active": 1,
    "availability": "Out of Stock"
  }
]
```

`availability` is calculated as:

-   `In Stock` when `stock_available > 0`
-   `Out of Stock` when `stock_available <= 0`

### Error

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to load items"
}
```

------------------------------------------------------------------------

## 5.2 Get Item by ID

### `GET /api/items/:id`

Returns a single inventory item.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- -------------
  `id`        Integer          Yes Item ID

### Response

**Status: `200 OK`**

``` json
{
  "id": 10,
  "name": "Laptop",
  "item_type_id": 1,
  "purchase_date": "2026-10-01",
  "stock_available": 15,
  "active": 1,
  "type_name": "Electronics"
}
```

### Errors

**Status: `404 Not Found`**

``` json
{
  "error": "Item not found"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to load item"
}
```

------------------------------------------------------------------------

## 5.3 Create Item

### `POST /api/items`

Creates a new inventory item.

### Request Body

``` json
{
  "name": "Laptop",
  "item_type_id": 1,
  "purchase_date": "2026-10-01",
  "stock_available": 15,
  "active": true
}
```

### Request Fields

  ---------------------------------------------------------------------------
  Field               Type                          Required Description
  ------------------- ---------------- --------------------- ----------------
  `name`              String                             Yes Item name

  `item_type_id`      Integer                            Yes Existing item
                                                             type ID

  `purchase_date`     String                             Yes Purchase date
                      (`YYYY-MM-DD`)                         

  `stock_available`   Integer                            Yes Initial stock;
                                                             cannot be
                                                             negative

  `active`            Boolean                             No Whether the item
                                                             can be purchased
  ---------------------------------------------------------------------------

### Validation

-   `name` is required and cannot contain only whitespace.
-   `item_type_id` is required.
-   `purchase_date` must be a valid date in `YYYY-MM-DD` format.
-   `stock_available` must be an integer greater than or equal to `0`.
-   `item_type_id` must reference an existing item type.
-   `active` is stored as `1` when truthy and `0` otherwise.

### Success Response

**Status: `201 Created`**

``` json
{
  "id": 10,
  "message": "Item created"
}
```

### Errors

**Status: `400 Bad Request`**

``` json
{
  "error": "Item name is required"
}
```

Possible validation messages include:

``` text
Item name is required
Item type is required
Valid purchase date is required
Stock cannot be negative
Invalid item type
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to create item"
}
```

------------------------------------------------------------------------

## 5.4 Update Item

### `PUT /api/items/:id`

Updates an existing inventory item.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- -------------
  `id`        Integer          Yes Item ID

### Request Body

``` json
{
  "name": "Laptop Pro",
  "item_type_id": 1,
  "purchase_date": "2026-10-05",
  "stock_available": 20,
  "active": true
}
```

The same validation rules used when creating an item apply here.

### Success Response

**Status: `200 OK`**

``` json
{
  "message": "Item updated"
}
```

### Errors

**Status: `400 Bad Request`**

Validation errors use the same messages as the create-item endpoint.

**Status: `404 Not Found`**

``` json
{
  "error": "Item not found"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to update item"
}
```

------------------------------------------------------------------------

## 5.5 Delete Item

### `DELETE /api/items/:id`

Deletes an inventory item.

Before deletion, the API checks whether the item appears in purchase
history.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- -------------
  `id`        Integer          Yes Item ID

### Success Response

**Status: `200 OK`**

``` json
{
  "message": "Item deleted"
}
```

### Errors

**Status: `404 Not Found`**

``` json
{
  "error": "Item not found"
}
```

**Status: `409 Conflict`**

``` json
{
  "error": "Item is used in purchase history. Mark it inactive instead."
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to delete item"
}
```

------------------------------------------------------------------------

# 6. Purchases

Purchases represent orders containing one or more inventory items.

## 6.1 Create Purchase

### `POST /api/purchases`

Creates a purchase order and decreases inventory stock for each
purchased item.

### Request Body

``` json
{
  "order_id": "PO-1001",
  "purchase_date": "2026-10-07",
  "items": [
    {
      "item_id": 10,
      "quantity": 2
    },
    {
      "item_id": 12,
      "quantity": 1
    }
  ]
}
```

### Request Fields

  Field             Type                      Required Description
  ----------------- ----------------------- ---------- ----------------------------
  `order_id`        String                          No Client-provided order ID
  `purchase_date`   String (`YYYY-MM-DD`)          Yes Purchase date
  `items`           Array                          Yes At least one purchase line

### Item Line Fields

  ------------------------------------------------------------------------
  Field            Type                          Required Description
  ---------------- ---------------- --------------------- ----------------
  `item_id`        Integer                            Yes Existing item ID

  `quantity`       Integer                            Yes Quantity to
                                                          purchase; must
                                                          be greater than
                                                          zero
  ------------------------------------------------------------------------

### Order ID Behavior

If `order_id` is omitted or empty, the API generates an ID in the
following format:

``` text
PO-<timestamp>
```

Example:

``` text
PO-1780812345678
```

### Validation

The request is rejected when:

-   `purchase_date` is missing or invalid.
-   `items` is not an array.
-   `items` is empty.
-   An item ID is invalid.
-   A quantity is not an integer greater than zero.
-   The same item appears more than once in the same order.
-   The specified item does not exist.
-   The item is inactive.
-   Requested quantity exceeds available stock.
-   The supplied `order_id` already exists.

### Success Response

**Status: `201 Created`**

``` json
{
  "id": 25,
  "order_id": "PO-1001",
  "message": "Purchase created successfully"
}
```

### Errors

**Status: `400 Bad Request`**

Examples:

``` json
{
  "error": "Valid purchase date is required"
}
```

``` json
{
  "error": "Purchase must contain at least one item"
}
```

``` json
{
  "error": "Quantity must be greater than zero"
}
```

``` json
{
  "error": "Duplicate items are not allowed in one order"
}
```

**Status: `404 Not Found`**

``` json
{
  "error": "Item not found"
}
```

**Status: `409 Conflict`**

Duplicate order ID:

``` json
{
  "error": "Order ID already exists"
}
```

Inactive item:

``` json
{
  "error": "Item is inactive and cannot be purchased"
}
```

Insufficient stock:

``` json
{
  "error": "Insufficient stock. Available quantity: 3"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Purchase failed; transaction rolled back"
}
```

### Transaction Behavior

Purchase creation is transactional:

1.  A database transaction starts.
2.  The order ID is checked.
3.  Each item is locked for update.
4.  Item existence, active status, and stock are checked.
5.  The purchase record is inserted.
6.  Purchase line items are inserted.
7.  Inventory quantities are decreased.
8.  The transaction is committed.

If any step fails, the transaction is rolled back, preventing a
partially-created purchase.

------------------------------------------------------------------------

# 7. Purchase Listing

## 7.1 Get All Purchases

### `GET /api/purchases`

Returns purchase order summaries.

### Response

**Status: `200 OK`**

``` json
[
  {
    "id": 25,
    "order_id": "PO-1001",
    "purchase_date": "2026-10-07",
    "item_count": 2,
    "total_quantity": 3
  }
]
```

### Response Fields

  Field              Description
  ------------------ ------------------------------------------
  `id`               Purchase database ID
  `order_id`         Purchase order identifier
  `purchase_date`    Purchase date
  `item_count`       Number of purchase line records
  `total_quantity`   Total quantity across all purchase lines

Purchases are ordered by purchase ID descending.

### Error

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to load purchases"
}
```

------------------------------------------------------------------------

# 8. Purchase Details

## 8.1 Get Purchase by ID

### `GET /api/purchases/:id`

Returns a purchase order together with its item details.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- -------------
  `id`        Integer          Yes Purchase ID

### Response

**Status: `200 OK`**

``` json
{
  "order_id": "PO-1001",
  "purchase_date": "2026-10-07",
  "items": [
    {
      "order_id": "PO-1001",
      "purchase_date": "2026-10-07",
      "item_id": 10,
      "item_name": "Laptop",
      "type_name": "Electronics",
      "quantity": 2,
      "stock_available": 13
    }
  ]
}
```

### Errors

**Status: `404 Not Found`**

``` json
{
  "error": "Purchase not found"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Failed to load purchase details"
}
```

------------------------------------------------------------------------

# 9. Update Purchase

## 9.1 Update Purchase

### `PUT /api/purchases/:id`

Updates the purchase date and purchase line items.

The API calculates the difference between the old and new quantities and
adjusts inventory accordingly.

### Path Parameter

  Parameter   Type        Required Description
  ----------- --------- ---------- -------------
  `id`        Integer          Yes Purchase ID

### Request Body

``` json
{
  "purchase_date": "2026-10-08",
  "items": [
    {
      "item_id": 10,
      "quantity": 3
    },
    {
      "item_id": 12,
      "quantity": 1
    }
  ]
}
```

### Validation

The same purchase validation rules apply:

-   Valid purchase date is required.
-   At least one item is required.
-   Item IDs must be positive integers.
-   Quantities must be positive integers.
-   Duplicate item IDs are not allowed.

### Inventory Adjustment

For each affected item:

``` text
difference = new quantity - old quantity
```

The stock is adjusted using that difference.

For example:

``` text
Old purchase quantity: 2
New purchase quantity: 5
Difference: +3
```

The API decreases available inventory by 3.

If:

``` text
Old purchase quantity: 5
New purchase quantity: 2
Difference: -3
```

The API increases available inventory by 3.

### Success Response

**Status: `200 OK`**

``` json
{
  "message": "Purchase updated successfully"
}
```

### Errors

**Status: `400 Bad Request`**

Validation errors use the purchase validation messages.

**Status: `404 Not Found`**

``` json
{
  "error": "Purchase not found"
}
```

**Status: `404 Not Found`**

If an item referenced during the update does not exist:

``` json
{
  "error": "Item not found"
}
```

**Status: `409 Conflict`**

Insufficient stock:

``` json
{
  "error": "Insufficient stock for item 10"
}
```

Inactive item:

``` json
{
  "error": "Item 10 is inactive and cannot be used"
}
```

**Status: `500 Internal Server Error`**

``` json
{
  "error": "Purchase update failed; transaction rolled back"
}
```

### Transaction Behavior

Purchase updates are performed inside a database transaction.

The update:

1.  Loads the existing purchase lines and locks them.
2.  Builds old and new quantity maps.
3.  Locks every affected inventory item.
4.  Calculates quantity differences.
5.  Validates stock and active status.
6.  Updates inventory quantities.
7.  Updates the purchase date.
8.  Deletes existing purchase lines.
9.  Inserts the replacement purchase lines.
10. Commits the transaction.

If an error occurs, all changes are rolled back.

------------------------------------------------------------------------

# 10. HTTP Status Code Summary

  ------------------------------------------------------------------------
                        Status Meaning               Typical Usage
  ---------------------------- --------------------- ---------------------
                         `200` OK                    Successful GET, PUT,
                                                     or DELETE

                         `201` Created               Successful POST

                         `400` Bad Request           Invalid or missing
                                                     request data

                         `404` Not Found             Requested item, type,
                                                     or purchase does not
                                                     exist

                         `409` Conflict              Duplicate records,
                                                     inactive items,
                                                     insufficient stock,
                                                     or protected deletion

                         `500` Internal Server Error Database or
                                                     unexpected server
                                                     error
  ------------------------------------------------------------------------

------------------------------------------------------------------------

# 11. Endpoint Summary

  Method     Endpoint                Purpose
  ---------- ----------------------- ----------------------
  `GET`      `/api/health`           Health check
  `GET`      `/api/item-types`       List item types
  `POST`     `/api/item-types`       Create item type
  `PUT`      `/api/item-types/:id`   Update item type
  `DELETE`   `/api/item-types/:id`   Delete item type
  `GET`      `/api/items`            List inventory items
  `GET`      `/api/items/:id`        Get one item
  `POST`     `/api/items`            Create item
  `PUT`      `/api/items/:id`        Update item
  `DELETE`   `/api/items/:id`        Delete item
  `POST`     `/api/purchases`        Create purchase
  `GET`      `/api/purchases`        List purchases
  `GET`      `/api/purchases/:id`    Get purchase details
  `PUT`      `/api/purchases/:id`    Update purchase

------------------------------------------------------------------------

# 12. Data Relationships

The API code indicates the following relationships between the database
entities:

``` text
item_types
    |
    | 1-to-many
    v
items
    |
    | 1-to-many
    v
purchase_items
    ^
    |
    | many-to-one
purchases
```

An `item` belongs to an `item_type`.

A `purchase` contains one or more `purchase_items`.

Each `purchase_item` references an `item`.

Purchase creation and updates modify the `items.stock_available` value.

------------------------------------------------------------------------

# 13. Business Rules

## Item Types

-   Item type names cannot be empty.
-   Duplicate item types are rejected.
-   Item types in use cannot be deleted.

## Items

-   Item names cannot be empty.
-   Items must reference an existing item type.
-   Purchase dates must use `YYYY-MM-DD`.
-   Stock cannot be negative.
-   Items used in purchase history cannot be deleted.
-   Such items should instead be marked inactive.

## Purchases

-   Every purchase must contain at least one item.
-   Each item can occur only once per purchase.
-   Quantity must be a positive integer.
-   Inactive items cannot be purchased.
-   A purchase cannot consume more stock than is available.
-   Duplicate order IDs are rejected.
-   Purchase creation and modification are transactional.

------------------------------------------------------------------------

# 14. Example End-to-End Flow

### Step 1 --- Create an item type

``` http
POST /api/item-types
```

``` json
{
  "type_name": "Electronics"
}
```

### Step 2 --- Create an item

``` http
POST /api/items
```

``` json
{
  "name": "Laptop",
  "item_type_id": 1,
  "purchase_date": "2026-10-01",
  "stock_available": 10,
  "active": true
}
```

### Step 3 --- Create a purchase

``` http
POST /api/purchases
```

``` json
{
  "order_id": "PO-1001",
  "purchase_date": "2026-10-07",
  "items": [
    {
      "item_id": 1,
      "quantity": 2
    }
  ]
}
```

After successful creation, the item's available stock decreases from:

``` text
10
```

to:

``` text
8
```

### Step 4 --- View purchases

``` http
GET /api/purchases
```

### Step 5 --- View purchase details

``` http
GET /api/purchases/1
```

### Step 6 --- Update a purchase

``` http
PUT /api/purchases/1
```

``` json
{
  "purchase_date": "2026-10-08",
  "items": [
    {
      "item_id": 1,
      "quantity": 3
    }
  ]
}
```

The inventory adjustment is based on the difference between the old and
new purchase quantities.

------------------------------------------------------------------------

# 15. Implementation Notes

This documentation reflects the behavior implemented in the supplied
Express.js source code. Authentication, authorization, pagination,
filtering, rate limiting, API versioning, and OpenAPI/Swagger generation
are not implemented in the supplied code and therefore are not
documented as supported API features.

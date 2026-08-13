# Specification: Restaurant Schema

## Requirements
1. The system MUST support two types of users: Admin and Waiter.
2. The system MUST categorize products.
3. The system MUST store product details including name, price (in EUR), image, active status, and allergens.
4. The system MUST allow soft-deleting products (is_active) to preserve historical order integrity.
5. The system MUST record orders associated with a waiter and a table.
6. The system MUST lock the unit price of a product at the moment of the order (in order items).

## Scenarios
- **Given** an admin, **When** they deactivate a product, **Then** it stops appearing in the menu but past orders are unaffected.
- **Given** a waiter, **When** they create an order, **Then** the unit prices of the items are copied from the current product prices.

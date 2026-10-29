# Security Specification & Threat Model

## 1. System Invariants & RBAC Architecture
- **Admin**: Has full access to manage users, roles, inventory, sales, vendors, and deletion. Bootstrapped admin is `ecomtanger1@gmail.com`.
- **Manager**: Can create, read, and update inventory, orders, vendors, and import CSV sales. Cannot alter user roles.
- **Staff**: Can read inventory, create and update sales orders (for point-of-sale recording and tracking fulfillment), and update inventory stock counts.
- **Viewer**: Read-only access to inventory and sales.
- **Unauthenticated / Anonymous**: Completely denied access (`default deny`).
- **Data Integrity**:
  - `createdAt` is immutable.
  - String fields must satisfy length bounds to prevent DoS attacks.
  - Numerical fields (costPrice, sellingPrice, stock, quantity) must be valid numbers.
  - Document IDs must match regex `^[a-zA-Z0-9_\-]+$`.

## 2. The "Dirty Dozen" Threat Payloads (Must Return PERMISSION_DENIED)
1. **Unauthenticated Read on Inventory**: Anonymous client attempting to read `/inventory/item123`.
2. **Self-Escalation to Admin**: Non-admin user attempting to write `"role": "admin"` to `/users/{userId}` or `/admins/{userId}`.
3. **Ghost / Shadow Field Injection**: Writing an inventory document with an unauthorized arbitrary attribute `hack_override: true`.
4. **Huge String Attack (Wallet Exhaustion)**: Writing an inventory title containing 50,000 characters.
5. **Negative Quantity Order Exploitation**: An order submitted with `quantity: -100` to artificially manipulate stock and profits.
6. **Non-Owner Profile Overwrite**: User A attempting to update User B's `/users/userB` record without admin privileges.
7. **Admins Collection Write Bypass**: Non-admin attempting to create a record in `/admins/attackerUid`.
8. **Invalid Path Variable / ID Poisoning**: Accessing doc with ID `item..//evil??/$$$` failing regex validation.
9. **Tampering Immutable Creation Timestamp**: Updating an inventory document with an altered `createdAt` value.
10. **Viewer Unauthorized Mutation**: User with 'viewer' role trying to `create` an order or `delete` inventory.
11. **Blanket Query Scraping**: Malicious client running an unconstrained query without authentication.
12. **Vendor Data Destruction by Staff**: Staff role attempting to delete an established vendor record.

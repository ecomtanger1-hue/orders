export type UserRole = 'admin' | 'manager' | 'staff' | 'viewer';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
  createdAt?: string;
  updatedAt?: string;
}

export type ItemCondition = 'new' | 'like_new' | 'good' | 'fair';
export type ItemStatus = 'active' | 'sold' | 'draft' | 'out_of_stock' | 'reserved' | 'archived';
export type ItemFulfillment = 'local' | 'shipping' | 'both';

export interface BundleItemRef {
  itemId: string;
  itemTitle: string;
  quantity: number;
  unitCost?: number;
  unitPrice?: number;
}

export interface StockBatch {
  id: string;
  batchNumber: number;
  receivedDate: string; // YYYY-MM-DD
  initialQty: number;
  remainingQty: number;
  costPrice: number;
  sellingPrice: number;
  supplier?: string;
  notes?: string;
  createdAt: string;
}

export interface InventoryItem {
  id: string;
  title: string;
  sku?: string;
  category: string;
  condition: ItemCondition;
  costPrice: number;
  sellingPrice: number;
  stock: number;
  lowStockThreshold: number;
  vendorId?: string;
  vendorName?: string;
  listingUrl?: string;
  status: ItemStatus;
  fulfillmentType: ItemFulfillment;
  notes?: string;
  isBundle?: boolean;
  bundleItems?: BundleItemRef[];
  batches?: StockBatch[];
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
}

export type OrderStatus = 'new' | 'confirmed' | 'delivered' | 'cancelled' | 'completed' | 'pending_pickup' | 'shipped';
export type PaymentMethod = 'fb_pay' | 'cash' | 'venmo' | 'zelle' | 'paypal' | 'other';
export type OrderFulfillment = 'local_pickup' | 'shipping';

export interface Order {
  id: string;
  itemId?: string;
  itemTitle: string;
  quantity: number;
  unitCost: number;
  salePrice: number;
  shippingCharged: number;
  shippingCost: number;
  platformFee: number;
  totalRevenue: number;
  totalCost: number;
  netProfit: number;
  profitMargin: number; // in percentage e.g. 35.5
  buyerName: string;
  customerPhone?: string;
  customerAddress?: string;
  googleMapsUrl?: string;
  paymentMethod: PaymentMethod;
  fulfillmentType: OrderFulfillment;
  carrier?: string;
  trackingNumber?: string;
  status: OrderStatus;
  date: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface Vendor {
  id: string;
  name: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  website?: string;
  leadTimeDays?: number;
  rating?: number;
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface MonthlyRevenueData {
  month: string;
  revenue: number;
  cost: number;
  profit: number;
  ordersCount: number;
  marginPercent: number;
}

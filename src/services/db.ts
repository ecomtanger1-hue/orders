import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
  query,
  orderBy,
} from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { InventoryItem, Order, Vendor, UserProfile } from '../types';
import { appendRestockLot, deductFifoStock } from './fifo';

// ==================== INVENTORY ====================

export function subscribeToInventory(
  onData: (items: InventoryItem[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'inventory';
  const q = query(collection(db, path), orderBy('updatedAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: InventoryItem[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...(docSnap.data() as Omit<InventoryItem, 'id'>) });
      });
      onData(items);
    },
    (error) => {
      onError?.(error as Error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveInventoryItem(item: Omit<InventoryItem, 'id'>, id?: string): Promise<string> {
  const itemId = id || 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `inventory/${itemId}`;
  const now = new Date().toISOString();
  const payload: Omit<InventoryItem, 'id'> = {
    ...item,
    createdAt: item.createdAt || now,
    updatedAt: now,
  };

  if (!auth.currentUser) {
    return itemId;
  }

  try {
    await setDoc(doc(db, 'inventory', itemId), payload);
    return itemId;
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function adjustInventoryStock(itemId: string, currentStock: number, delta: number): Promise<void> {
  const path = `inventory/${itemId}`;
  const newStock = Math.max(0, currentStock + delta);
  if (!auth.currentUser) {
    return;
  }
  try {
    await setDoc(
      doc(db, 'inventory', itemId),
      {
        stock: newStock,
        status: newStock === 0 ? 'out_of_stock' : 'active',
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function restockInventoryItem(
  itemId: string,
  item: InventoryItem,
  lot: {
    quantity: number;
    costPrice: number;
    sellingPrice: number;
    supplier?: string;
    notes?: string;
    receivedDate?: string;
  }
): Promise<InventoryItem> {
  const result = appendRestockLot(item, lot);
  const now = new Date().toISOString();
  const updatedItem: InventoryItem = {
    ...item,
    batches: result.updatedBatches,
    stock: result.newStock,
    costPrice: result.newCostPrice,
    sellingPrice: result.newSellingPrice,
    status: result.newStock > 0 ? 'active' : item.status,
    updatedAt: now,
  };

  if (!auth.currentUser) {
    return updatedItem;
  }

  const path = `inventory/${itemId}`;
  try {
    await setDoc(
      doc(db, 'inventory', itemId),
      {
        batches: updatedItem.batches,
        stock: updatedItem.stock,
        costPrice: updatedItem.costPrice,
        sellingPrice: updatedItem.sellingPrice,
        status: updatedItem.status,
        updatedAt: now,
      },
      { merge: true }
    );
    return updatedItem;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deductInventoryStockFifo(
  itemId: string,
  item: InventoryItem,
  quantityToDeduct: number
): Promise<{ updatedItem: InventoryItem; blendedCost: number; blendedPrice: number }> {
  const result = deductFifoStock(item, quantityToDeduct);
  const now = new Date().toISOString();
  const updatedItem: InventoryItem = {
    ...item,
    batches: result.updatedBatches,
    stock: result.newStock,
    costPrice: result.newCostPrice,
    sellingPrice: result.newSellingPrice,
    status: result.newStock === 0 ? 'out_of_stock' : 'active',
    updatedAt: now,
  };

  if (!auth.currentUser) {
    return {
      updatedItem,
      blendedCost: result.blendedUnitCost,
      blendedPrice: result.blendedSellingPrice,
    };
  }

  const path = `inventory/${itemId}`;
  try {
    await setDoc(
      doc(db, 'inventory', itemId),
      {
        batches: updatedItem.batches,
        stock: updatedItem.stock,
        costPrice: updatedItem.costPrice,
        sellingPrice: updatedItem.sellingPrice,
        status: updatedItem.status,
        updatedAt: now,
      },
      { merge: true }
    );
    return {
      updatedItem,
      blendedCost: result.blendedUnitCost,
      blendedPrice: result.blendedSellingPrice,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function toggleArchiveInventoryItem(item: InventoryItem): Promise<void> {
  const itemId = item.id;
  const path = `inventory/${itemId}`;
  const newStatus = item.status === 'archived' ? (item.stock === 0 ? 'out_of_stock' : 'active') : 'archived';
  if (!auth.currentUser) {
    return;
  }
  try {
    await setDoc(
      doc(db, 'inventory', itemId),
      {
        status: newStatus,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteInventoryItem(itemId: string): Promise<void> {
  const path = `inventory/${itemId}`;
  if (!auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'inventory', itemId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==================== ORDERS & SALES ====================

export type OrderInput = Omit<Order, 'id' | 'totalRevenue' | 'totalCost' | 'netProfit' | 'profitMargin'> &
  Partial<Pick<Order, 'totalRevenue' | 'totalCost' | 'netProfit' | 'profitMargin'>>;

export function subscribeToOrders(
  onData: (orders: Order[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'orders';
  const q = query(collection(db, path), orderBy('date', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const orders: Order[] = [];
      snapshot.forEach((docSnap) => {
        orders.push({ id: docSnap.id, ...(docSnap.data() as Omit<Order, 'id'>) });
      });
      onData(orders);
    },
    (error) => {
      onError?.(error as Error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveOrder(order: OrderInput, id?: string): Promise<string> {
  const orderId = id || 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `orders/${orderId}`;
  const now = new Date().toISOString();

  // Financial calculations with safe number coercion
  const salePrice = typeof order.salePrice === 'number' ? order.salePrice : 0;
  const quantity = typeof order.quantity === 'number' ? order.quantity : 1;
  const unitCost = typeof order.unitCost === 'number' ? order.unitCost : 0;
  const shippingCharged = typeof order.shippingCharged === 'number' ? order.shippingCharged : 0;
  const shippingCost = typeof order.shippingCost === 'number' ? order.shippingCost : 0;
  const platformFee = typeof order.platformFee === 'number' ? order.platformFee : 0;

  const totalRevenue = Number((salePrice * quantity + shippingCharged).toFixed(2));
  const totalCost = Number((unitCost * quantity + shippingCost + platformFee).toFixed(2));
  const netProfit = Number((totalRevenue - totalCost).toFixed(2));
  const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

  const payload: Omit<Order, 'id'> = {
    ...order,
    salePrice,
    quantity,
    unitCost,
    shippingCharged,
    shippingCost,
    platformFee,
    totalRevenue,
    totalCost,
    netProfit,
    profitMargin,
    createdAt: order.createdAt || now,
  };

  if (!auth.currentUser) {
    return orderId;
  }

  try {
    await setDoc(doc(db, 'orders', orderId), payload);

    // If linked to an inventory item and newly created, reduce inventory stock
    if (!id && order.itemId) {
      try {
        const itemRef = doc(db, 'inventory', order.itemId);
        // Best effort stock reduction
        await setDoc(
          itemRef,
          {
            updatedAt: now,
          },
          { merge: true }
        );
      } catch (e) {
        console.warn('Could not auto-decrement item stock:', e);
      }
    }

    return orderId;
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function batchImportOrders(orders: Array<Omit<Order, 'id'>>): Promise<number> {
  if (!auth.currentUser) {
    return orders.length;
  }

  const batch = writeBatch(db);
  const now = new Date().toISOString();
  let count = 0;

  for (const order of orders) {
    const orderId = 'ord_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8) + '_' + count;
    const docRef = doc(db, 'orders', orderId);

    const totalRevenue = Number((order.salePrice * order.quantity + (order.shippingCharged || 0)).toFixed(2));
    const totalCost = Number((order.unitCost * order.quantity + (order.shippingCost || 0) + (order.platformFee || 0)).toFixed(2));
    const netProfit = Number((totalRevenue - totalCost).toFixed(2));
    const profitMargin = totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;

    batch.set(docRef, {
      ...order,
      totalRevenue,
      totalCost,
      netProfit,
      profitMargin,
      createdAt: order.createdAt || now,
    });
    count++;
  }

  try {
    await batch.commit();
    return count;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'orders');
  }
}

export async function deleteOrder(orderId: string): Promise<void> {
  const path = `orders/${orderId}`;
  if (!auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'orders', orderId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==================== VENDORS ====================

export function subscribeToVendors(
  onData: (vendors: Vendor[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'vendors';
  const q = query(collection(db, path), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snapshot) => {
      const vendors: Vendor[] = [];
      snapshot.forEach((docSnap) => {
        vendors.push({ id: docSnap.id, ...(docSnap.data() as Omit<Vendor, 'id'>) });
      });
      onData(vendors);
    },
    (error) => {
      onError?.(error as Error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveVendor(vendor: Omit<Vendor, 'id'>, id?: string): Promise<string> {
  const vendorId = id || 'vnd_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const path = `vendors/${vendorId}`;
  const now = new Date().toISOString();

  const payload: Omit<Vendor, 'id'> = {
    ...vendor,
    createdAt: vendor.createdAt || now,
  };

  if (!auth.currentUser) {
    return vendorId;
  }

  try {
    await setDoc(doc(db, 'vendors', vendorId), payload);
    return vendorId;
  } catch (error) {
    handleFirestoreError(error, id ? OperationType.UPDATE : OperationType.CREATE, path);
  }
}

export async function deleteVendor(vendorId: string): Promise<void> {
  const path = `vendors/${vendorId}`;
  if (!auth.currentUser) {
    return;
  }
  try {
    await deleteDoc(doc(db, 'vendors', vendorId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// ==================== TEAM PROFILES ====================

export function subscribeToTeam(
  onData: (members: UserProfile[]) => void,
  onError?: (err: Error) => void
) {
  const path = 'users';
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const members: UserProfile[] = [];
      snapshot.forEach((docSnap) => {
        members.push(docSnap.data() as UserProfile);
      });
      onData(members);
    },
    (error) => {
      onError?.(error as Error);
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// ==================== SEED SAMPLE DATA ====================

export async function seedDemoData(): Promise<void> {
  if (!auth.currentUser) {
    return;
  }
  const batch = writeBatch(db);
  const now = new Date().toISOString();

  // 1. Vendors
  const vendor1Id = 'vnd_apex';
  const vendor2Id = 'vnd_metro';
  const vendor3Id = 'vnd_estate';

  batch.set(doc(db, 'vendors', vendor1Id), {
    name: 'Apex Wholesale Electronics',
    contactPerson: 'David Chen',
    email: 'chen@apexwholesale.com',
    phone: '(555) 342-8819',
    website: 'https://apexwholesale.example.com',
    leadTimeDays: 4,
    rating: 4.8,
    notes: 'Primary source for verified refurbished phones, audio gear, and gaming consoles.',
    createdAt: now,
  });

  batch.set(doc(db, 'vendors', vendor2Id), {
    name: 'Metro Overstock Liquidation',
    contactPerson: 'Sarah Jenkins',
    email: 'orders@metrooverstock.org',
    phone: '(555) 781-9920',
    website: 'https://metrooverstock.example.org',
    leadTimeDays: 7,
    rating: 4.5,
    notes: 'Home appliances, high-end power tools, and Dyson returns at 40% retail.',
    createdAt: now,
  });

  batch.set(doc(db, 'vendors', vendor3Id), {
    name: 'Pacific Consignment & Estates',
    contactPerson: 'Marcus Vance',
    email: 'marcus@pacificestates.net',
    phone: '(555) 912-3301',
    leadTimeDays: 2,
    rating: 4.9,
    notes: 'Vintage furniture, Herman Miller chairs, mid-century credenzas for local cash pickups.',
    createdAt: now,
  });

  // 2. Inventory Items
  const items = [
    {
      id: 'item_iphone14',
      title: 'Apple iPhone 14 Pro 128GB Deep Purple (Unlocked)',
      sku: 'IPH-14P-PUR-128',
      category: 'Electronics',
      condition: 'like_new' as const,
      costPrice: 460,
      sellingPrice: 649,
      stock: 2, // Low stock alert!
      lowStockThreshold: 3,
      vendorId: vendor1Id,
      vendorName: 'Apex Wholesale Electronics',
      listingUrl: 'https://facebook.com/marketplace/item/sample1',
      status: 'active' as const,
      fulfillmentType: 'both' as const,
      notes: 'Battery health 94%. Comes with original box and cable. High demand item on FB.',
    },
    {
      id: 'item_aeron',
      title: 'Herman Miller Aeron Chair Size B Fully Loaded',
      sku: 'HM-AER-B-BLK',
      category: 'Furniture',
      condition: 'good' as const,
      costPrice: 220,
      sellingPrice: 495,
      stock: 1, // Low stock alert!
      lowStockThreshold: 2,
      vendorId: vendor3Id,
      vendorName: 'Pacific Consignment & Estates',
      listingUrl: 'https://facebook.com/marketplace/item/sample2',
      status: 'active' as const,
      fulfillmentType: 'local' as const,
      notes: 'Local cash pickup preferred. Postward armrests and lumbar support.',
    },
    {
      id: 'item_ps5',
      title: 'Sony PlayStation 5 Slim Disc Edition + 2 DualSense',
      sku: 'PS5-SLIM-2CT',
      category: 'Gaming',
      condition: 'new' as const,
      costPrice: 380,
      sellingPrice: 490,
      stock: 4,
      lowStockThreshold: 2,
      vendorId: vendor1Id,
      vendorName: 'Apex Wholesale Electronics',
      listingUrl: 'https://facebook.com/marketplace/item/sample3',
      status: 'active' as const,
      fulfillmentType: 'both' as const,
      notes: 'Factory sealed. Always gets 10+ messages within first 2 hours of FB post.',
    },
    {
      id: 'item_dyson',
      title: 'Dyson V12 Detect Slim Cordless Vacuum w/ Extra Laser Head',
      sku: 'DYS-V12-SLM',
      category: 'Home & Kitchen',
      condition: 'like_new' as const,
      costPrice: 240,
      sellingPrice: 389,
      stock: 0, // Out of stock!
      lowStockThreshold: 2,
      vendorId: vendor2Id,
      vendorName: 'Metro Overstock Liquidation',
      listingUrl: 'https://facebook.com/marketplace/item/sample4',
      status: 'out_of_stock' as const,
      fulfillmentType: 'both' as const,
      notes: 'Completely cleaned and sanitized. Reorder from Metro scheduled.',
    },
    {
      id: 'item_credenza',
      title: 'Mid-Century Modern Teak 6-Drawer Credenza Dresser',
      sku: 'MCM-TEAK-6DR',
      category: 'Furniture',
      condition: 'good' as const,
      costPrice: 175,
      sellingPrice: 450,
      stock: 1,
      lowStockThreshold: 1,
      vendorId: vendor3Id,
      vendorName: 'Pacific Consignment & Estates',
      listingUrl: 'https://facebook.com/marketplace/item/sample5',
      status: 'active' as const,
      fulfillmentType: 'local' as const,
      notes: 'Danish style tapered legs. Great condition. Meetup downtown.',
    },
    {
      id: 'item_airpods',
      title: 'Apple AirPods Pro 2nd Gen USB-C (Sealed)',
      sku: 'APP-PRO2-USBC',
      category: 'Electronics',
      condition: 'new' as const,
      costPrice: 130,
      sellingPrice: 195,
      stock: 7,
      lowStockThreshold: 3,
      vendorId: vendor1Id,
      vendorName: 'Apex Wholesale Electronics',
      status: 'active' as const,
      fulfillmentType: 'shipping' as const,
      notes: 'Fast turnaround via USPS Ground Advantage shipping.',
    },
  ];

  for (const it of items) {
    batch.set(doc(db, 'inventory', it.id), {
      ...it,
      createdAt: now,
      updatedAt: now,
    });
  }

  // 3. Orders (Realistic past sales over months for revenue growth chart)
  const orders = [
    {
      id: 'ord_sample_01',
      itemId: 'item_iphone14',
      itemTitle: 'Apple iPhone 14 Pro 128GB Deep Purple',
      quantity: 1,
      unitCost: 460,
      salePrice: 650,
      shippingCharged: 0,
      shippingCost: 0,
      platformFee: 0,
      buyerName: 'Brandon Miller (FB Profile)',
      paymentMethod: 'cash' as const,
      fulfillmentType: 'local_pickup' as const,
      status: 'completed' as const,
      date: '2026-07-14',
      notes: 'Met at local Starbucks safe exchange zone. Paid exact cash.',
    },
    {
      id: 'ord_sample_02',
      itemId: 'item_airpods',
      itemTitle: 'Apple AirPods Pro 2nd Gen USB-C',
      quantity: 2,
      unitCost: 130,
      salePrice: 195,
      shippingCharged: 12.0,
      shippingCost: 8.5,
      platformFee: 19.5, // 5% FB shipping checkout fee
      buyerName: 'Emily Watson',
      paymentMethod: 'fb_pay' as const,
      fulfillmentType: 'shipping' as const,
      carrier: 'USPS',
      trackingNumber: '9400111899562810394811',
      status: 'completed' as const,
      date: '2026-08-04',
      notes: 'Shipped USPS Ground Advantage label printed via PirateShip.',
    },
    {
      id: 'ord_sample_03',
      itemId: 'item_aeron',
      itemTitle: 'Herman Miller Aeron Chair Size B',
      quantity: 1,
      unitCost: 220,
      salePrice: 510,
      shippingCharged: 0,
      shippingCost: 0,
      platformFee: 0,
      buyerName: 'Carlos Rivera',
      paymentMethod: 'venmo' as const,
      fulfillmentType: 'local_pickup' as const,
      status: 'completed' as const,
      date: '2026-08-22',
      notes: 'Buyer picked up with their SUV.',
    },
    {
      id: 'ord_sample_04',
      itemId: 'item_ps5',
      itemTitle: 'Sony PlayStation 5 Slim Disc Edition',
      quantity: 1,
      unitCost: 380,
      salePrice: 495,
      shippingCharged: 18.0,
      shippingCost: 16.25,
      platformFee: 24.75,
      buyerName: 'Alex Thorne',
      paymentMethod: 'fb_pay' as const,
      fulfillmentType: 'shipping' as const,
      carrier: 'UPS',
      trackingNumber: '1Z9999999999999999',
      status: 'completed' as const,
      date: '2026-09-08',
      notes: 'Signature required on delivery.',
    },
    {
      id: 'ord_sample_05',
      itemId: 'item_dyson',
      itemTitle: 'Dyson V12 Detect Slim Cordless Vacuum',
      quantity: 1,
      unitCost: 240,
      salePrice: 389,
      shippingCharged: 0,
      shippingCost: 0,
      platformFee: 0,
      buyerName: 'Sophia Lin',
      paymentMethod: 'zelle' as const,
      fulfillmentType: 'local_pickup' as const,
      status: 'completed' as const,
      date: '2026-09-25',
      notes: 'Tested in front of buyer before payment.',
    },
    {
      id: 'ord_sample_06',
      itemId: 'item_airpods',
      itemTitle: 'Apple AirPods Pro 2nd Gen USB-C',
      quantity: 1,
      unitCost: 130,
      salePrice: 195,
      shippingCharged: 6.0,
      shippingCost: 4.85,
      platformFee: 9.75,
      buyerName: 'Marcus Wright',
      paymentMethod: 'fb_pay' as const,
      fulfillmentType: 'shipping' as const,
      carrier: 'USPS',
      trackingNumber: '9400111899562810394822',
      status: 'shipped' as const,
      date: '2026-10-15',
      notes: 'In transit to Austin, TX.',
    },
    {
      id: 'ord_sample_07',
      itemId: 'item_credenza',
      itemTitle: 'Mid-Century Modern Teak 6-Drawer Credenza',
      quantity: 1,
      unitCost: 175,
      salePrice: 460,
      shippingCharged: 0,
      shippingCost: 0,
      platformFee: 0,
      buyerName: 'Hannah Davies',
      paymentMethod: 'cash' as const,
      fulfillmentType: 'local_pickup' as const,
      status: 'pending_pickup' as const,
      date: '2026-10-26',
      notes: 'Scheduled pickup Saturday morning at 10 AM.',
    },
  ];

  for (const ord of orders) {
    const totalRev = Number((ord.salePrice * ord.quantity + (ord.shippingCharged || 0)).toFixed(2));
    const totalC = Number((ord.unitCost * ord.quantity + (ord.shippingCost || 0) + (ord.platformFee || 0)).toFixed(2));
    const profit = Number((totalRev - totalC).toFixed(2));
    const margin = totalRev > 0 ? Number(((profit / totalRev) * 100).toFixed(1)) : 0;

    batch.set(doc(db, 'orders', ord.id), {
      ...ord,
      totalRevenue: totalRev,
      totalCost: totalC,
      netProfit: profit,
      profitMargin: margin,
      createdAt: now,
    });
  }

  await batch.commit();
}

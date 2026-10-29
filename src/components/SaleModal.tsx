import React, { useState, useEffect, useMemo } from 'react';
import { X, ShoppingBag, Check, AlertCircle, MapPin, Banknote, Phone, User, Package } from 'lucide-react';
import { Order, InventoryItem, OrderStatus } from '../types';
import { saveOrder, deductInventoryStockFifo } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface SaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  inventory: InventoryItem[];
  editingOrder?: Order | null;
  initialItem?: InventoryItem | null;
  onOrderSaved?: (savedOrder: Order) => void;
  onItemUpdated?: (updatedItem: InventoryItem) => void;
}

export const SaleModal: React.FC<SaleModalProps> = ({
  isOpen,
  onClose,
  inventory,
  editingOrder,
  initialItem,
  onOrderSaved,
  onItemUpdated,
}) => {
  const { user, profile, canViewFinancials } = useAuth();

  const [selectedItemId, setSelectedItemId] = useState<string>('');
  const [isCustomItem, setIsCustomItem] = useState(false);
  const [itemTitle, setItemTitle] = useState('');
  const [quantity, setQuantity] = useState<number>(1);
  const [salePrice, setSalePrice] = useState<number>(0);
  const [unitCost, setUnitCost] = useState<number>(0);
  const [platformFee, setPlatformFee] = useState<number>(0);
  const [buyerName, setBuyerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [googleMapsUrl, setGoogleMapsUrl] = useState('');
  const [status, setStatus] = useState<OrderStatus>('new');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync state on open
  useEffect(() => {
    if (editingOrder) {
      if (editingOrder.itemId && inventory.some((i) => i.id === editingOrder.itemId)) {
        setSelectedItemId(editingOrder.itemId);
        setIsCustomItem(false);
      } else {
        setSelectedItemId('custom');
        setIsCustomItem(true);
      }
      setItemTitle(editingOrder.itemTitle);
      setQuantity(editingOrder.quantity);
      setSalePrice(editingOrder.salePrice);
      setUnitCost(editingOrder.unitCost);
      setPlatformFee(editingOrder.platformFee || 0);
      setBuyerName(editingOrder.buyerName || '');
      setCustomerPhone(editingOrder.customerPhone || '');
      setCustomerAddress(editingOrder.customerAddress || '');
      setGoogleMapsUrl(editingOrder.googleMapsUrl || '');
      setStatus(editingOrder.status || 'new');
      setNotes(editingOrder.notes || '');
    } else if (initialItem) {
      setSelectedItemId(initialItem.id);
      setIsCustomItem(false);
      setItemTitle(initialItem.title);
      setQuantity(1);
      setSalePrice(initialItem.sellingPrice);
      setUnitCost(initialItem.costPrice);
      setPlatformFee(0);
      setBuyerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setGoogleMapsUrl('');
      setStatus('new');
      setNotes('');
    } else {
      if (inventory.length > 0) {
        const first = inventory[0];
        setSelectedItemId(first.id);
        setIsCustomItem(false);
        setItemTitle(first.title);
        setSalePrice(first.sellingPrice);
        setUnitCost(first.costPrice);
      } else {
        setSelectedItemId('custom');
        setIsCustomItem(true);
        setItemTitle('');
        setSalePrice(0);
        setUnitCost(0);
      }
      setQuantity(1);
      setPlatformFee(0);
      setBuyerName('');
      setCustomerPhone('');
      setCustomerAddress('');
      setGoogleMapsUrl('');
      setStatus('new');
      setNotes('');
    }
  }, [editingOrder, initialItem, isOpen, inventory]);

  // When selecting an item from the inventory dropdown
  const handleItemSelect = (id: string) => {
    setSelectedItemId(id);
    if (id === 'custom') {
      setIsCustomItem(true);
      setItemTitle('');
      setSalePrice(0);
      setUnitCost(0);
    } else {
      setIsCustomItem(false);
      const item = inventory.find((i) => i.id === id);
      if (item) {
        setItemTitle(item.title);
        setSalePrice(item.sellingPrice);
        setUnitCost(item.costPrice);
      }
    }
  };

  // Real-time calculated figures
  const totalRevenue = useMemo(() => {
    return Number((salePrice * quantity).toFixed(2));
  }, [salePrice, quantity]);

  const totalCost = useMemo(() => {
    return Number((unitCost * quantity + (platformFee || 0)).toFixed(2));
  }, [unitCost, quantity, platformFee]);

  const netProfit = useMemo(() => {
    return Number((totalRevenue - totalCost).toFixed(2));
  }, [totalRevenue, totalCost]);

  const profitMargin = useMemo(() => {
    return totalRevenue > 0 ? Number(((netProfit / totalRevenue) * 100).toFixed(1)) : 0;
  }, [totalRevenue, netProfit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemTitle.trim()) {
      setErrorMsg('Please select or specify an item title.');
      return;
    }
    if (quantity <= 0) {
      setErrorMsg('Quantity must be at least 1.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    // Automatic date: keep existing order date if editing, or use current date for new order
    const autoDate = editingOrder?.date || new Date().toISOString().slice(0, 10);
    const itemIdToSave = isCustomItem || !selectedItemId || selectedItemId === 'custom' ? undefined : selectedItemId;

    try {
      const savedId = await saveOrder(
        {
          itemId: itemIdToSave,
          itemTitle,
          quantity,
          unitCost,
          salePrice,
          shippingCharged: 0,
          shippingCost: 0,
          platformFee,
          totalRevenue,
          totalCost,
          netProfit,
          profitMargin,
          buyerName: buyerName.trim() || 'Facebook Customer',
          customerPhone: customerPhone.trim() || undefined,
          customerAddress: customerAddress.trim() || undefined,
          googleMapsUrl: googleMapsUrl.trim() || undefined,
          paymentMethod: 'cash', // Cash on delivery for now
          fulfillmentType: 'local_pickup',
          status,
          date: autoDate,
          notes: notes.trim() || undefined,
          createdAt: editingOrder?.createdAt || new Date().toISOString(),
          createdBy: user?.uid || profile?.uid,
        },
        editingOrder?.id
      );

      // Invoke local state updater callback
      onOrderSaved?.({
        id: savedId,
        itemId: itemIdToSave,
        itemTitle,
        quantity,
        unitCost,
        salePrice,
        shippingCharged: 0,
        shippingCost: 0,
        platformFee,
        totalRevenue,
        totalCost,
        netProfit,
        profitMargin,
        buyerName: buyerName.trim() || 'Facebook Customer',
        customerPhone: customerPhone.trim() || undefined,
        customerAddress: customerAddress.trim() || undefined,
        googleMapsUrl: googleMapsUrl.trim() || undefined,
        paymentMethod: 'cash',
        fulfillmentType: 'local_pickup',
        status,
        date: autoDate,
        notes: notes.trim() || undefined,
        createdAt: editingOrder?.createdAt || new Date().toISOString(),
        createdBy: user?.uid || profile?.uid,
      });

      // If creating a new order linked to an inventory item, auto-decrement stock using FIFO
      if (!editingOrder && itemIdToSave) {
        const matchedItem = inventory.find((i) => i.id === itemIdToSave);
        if (matchedItem) {
          const res = await deductInventoryStockFifo(itemIdToSave, matchedItem, quantity);
          if (res?.updatedItem) {
            onItemUpdated?.(res.updatedItem);
          }
        }
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-sm sm:text-base">
                {editingOrder ? 'Edit Order Details' : 'Record New Order'}
              </h2>
              <p className="text-xs text-slate-500">
                Cash on delivery order details & customer info
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 flex-1">
          {errorMsg && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Item Selection from Inventory + Quantity */}
          <div className="space-y-2">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <div className="sm:col-span-3">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Select Item from Inventory *
                </label>
                <div className="relative">
                  <select
                    value={selectedItemId}
                    onChange={(e) => handleItemSelect(e.target.value)}
                    className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                  >
                    {inventory.map((it) => (
                      <option key={it.id} value={it.id}>
                        {it.isBundle ? '🎁 [Bundle] ' : ''}{it.title} ({it.stock} in stock) — ${it.sellingPrice}
                      </option>
                    ))}
                    <option value="custom">-- Custom / Unlisted Item --</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Qty *</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Custom Item Title Input: ONLY shown if Custom/Unlisted is chosen */}
            {isCustomItem && (
              <div className="animate-in fade-in">
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Custom Item Name / Description *
                </label>
                <input
                  type="text"
                  required
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g. Sony Headphones or Vintage Lamp"
                  className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            )}
          </div>

          {/* Pricing Row */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Sale Price ($) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                required
                value={salePrice}
                onChange={(e) => setSalePrice(parseFloat(e.target.value) || 0)}
                className="w-full text-xs sm:text-sm p-2 bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
              />
            </div>

            {canViewFinancials && (
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Unit Cost ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(parseFloat(e.target.value) || 0)}
                  className="w-full text-xs sm:text-sm p-2 bg-white border border-slate-200 rounded-lg font-medium text-slate-700"
                />
              </div>
            )}

            <div className={canViewFinancials ? '' : 'col-span-2'}>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Fee / Misc Cost ($)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={platformFee}
                onChange={(e) => setPlatformFee(parseFloat(e.target.value) || 0)}
                placeholder="0"
                className="w-full text-xs sm:text-sm p-2 bg-white border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          {/* Payment Notice: Cash on Delivery */}
          <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-800 text-xs">
            <Banknote className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-semibold">
              Payment Method: <strong>Cash on Delivery (CoD)</strong>
            </span>
          </div>

          {/* Customer Details: Name & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Customer Name *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Phone Number
              </label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="e.g. (555) 234-5678"
                className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
          </div>

          {/* Customer Address */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Customer Address / Delivery Location
            </label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="e.g. 742 Evergreen Terrace, Springfield"
              className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden"
            />
          </div>

          {/* Google Maps Link Field */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-blue-600" />
                <span>Google Map Link (Optional)</span>
              </span>
              <span className="text-[11px] text-slate-400 font-normal">Location pin / URL</span>
            </label>
            <input
              type="url"
              value={googleMapsUrl}
              onChange={(e) => setGoogleMapsUrl(e.target.value)}
              placeholder="e.g. https://maps.app.goo.gl/... or https://maps.google.com/?q=..."
              className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          {/* Status Selection */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Initial Order Status
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as OrderStatus)}
              className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-900"
            >
              <option value="new">New (Needs Confirmation)</option>
              <option value="confirmed">Confirmed (Ready to Deliver)</option>
              <option value="delivered">Delivered (Completed)</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          {/* Notes / Meetup Details */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Delivery Details
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Deliver between 3-5 PM, call upon arrival, cash on hand."
              className="w-full text-xs sm:text-sm p-2.5 bg-slate-50 border border-slate-200 rounded-xl resize-none focus:outline-hidden"
            />
          </div>

          {/* Real-Time Live Margin Calculation Bar */}
          {canViewFinancials && (
            <div className="p-3 bg-slate-900 text-white rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Total Cash Due
                </span>
                <span className="text-sm sm:text-base font-black text-blue-300">
                  ${totalRevenue.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Cost
                </span>
                <span className="text-sm sm:text-base font-black text-rose-300">
                  ${totalCost.toFixed(2)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px] uppercase font-bold">
                  Net Profit & Margin
                </span>
                <span
                  className={`text-sm sm:text-base font-black ${
                    netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {netProfit >= 0 ? `+$${netProfit.toFixed(2)}` : `-$${Math.abs(netProfit).toFixed(2)}`}
                </span>
                <span className="text-[10px] text-slate-300 block font-semibold">
                  {profitMargin}% margin
                </span>
              </div>
            </div>
          )}

          {/* Footer Submit */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Saving...'
                  : editingOrder
                  ? 'Update Order'
                  : 'Save Order'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

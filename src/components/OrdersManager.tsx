import React, { useState, useMemo, useRef } from 'react';
import { 
  ShoppingBag, 
  Search, 
  Plus, 
  Phone, 
  MapPin, 
  Trash2, 
  Edit3, 
  Check, 
  MoreVertical, 
  TrendingUp, 
  Download, 
  Upload, 
  Copy, 
  ExternalLink,
  MessageSquareText,
  Navigation,
  ChevronDown,
  X
} from 'lucide-react';
import { Order, OrderStatus } from '../types';
import { deleteOrder, saveOrder } from '../services/db';
import { useAuth } from '../context/AuthContext';

interface OrdersManagerProps {
  orders: Order[];
  onOpenNewSale: (initialData?: Partial<Order>) => void;
  onOpenCSVImport: () => void;
  onUpdateOrderStatus?: (orderId: string, newStatus: OrderStatus) => void;
  onDeleteOrder?: (orderId: string) => void;
}

export const OrdersManager: React.FC<OrdersManagerProps> = ({
  orders,
  onOpenNewSale,
  onOpenCSVImport,
  onUpdateOrderStatus,
  onDeleteOrder,
}) => {
  const { canEditInventory, canDeleteRecords, canViewFinancials } = useAuth();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showToolsDropdown, setShowToolsDropdown] = useState(false);
  const [showFinancialsBar, setShowFinancialsBar] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Normalize statuses to standard 4: new, confirmed, delivered, cancelled
  const normalizeStatus = (status: string): 'new' | 'confirmed' | 'delivered' | 'cancelled' => {
    if (status === 'completed' || status === 'shipped') return 'delivered';
    if (status === 'pending_pickup') return 'confirmed';
    if (status === 'new' || status === 'confirmed' || status === 'delivered' || status === 'cancelled') {
      return status;
    }
    return 'new';
  };

  const statusConfig: Record<'new' | 'confirmed' | 'delivered' | 'cancelled', {
    label: string;
    bg: string;
    text: string;
    border: string;
    activeRing: string;
  }> = {
    new: {
      label: 'New',
      bg: 'bg-blue-50 text-blue-700',
      text: 'text-blue-700',
      border: 'border-blue-200',
      activeRing: 'ring-2 ring-blue-500 bg-blue-600 text-white shadow-xs',
    },
    confirmed: {
      label: 'Confirmed',
      bg: 'bg-amber-50 text-amber-700',
      text: 'text-amber-700',
      border: 'border-amber-200',
      activeRing: 'ring-2 ring-amber-500 bg-amber-600 text-white shadow-xs',
    },
    delivered: {
      label: 'Delivered',
      bg: 'bg-emerald-50 text-emerald-700',
      text: 'text-emerald-700',
      border: 'border-emerald-200',
      activeRing: 'ring-2 ring-emerald-500 bg-emerald-600 text-white shadow-xs',
    },
    cancelled: {
      label: 'Cancelled',
      bg: 'bg-rose-50 text-rose-700',
      text: 'text-rose-700',
      border: 'border-rose-200',
      activeRing: 'ring-2 ring-rose-500 bg-rose-600 text-white shadow-xs',
    },
  };

  // Status Counts
  const counts = useMemo(() => {
    const c = { all: orders.length, new: 0, confirmed: 0, delivered: 0, cancelled: 0 };
    orders.forEach((o) => {
      const s = normalizeStatus(o.status);
      c[s] = (c[s] || 0) + 1;
    });
    return c;
  }, [orders]);

  // Filtered Orders
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const currentNorm = normalizeStatus(ord.status);
      const matchesStatus = statusFilter === 'all' || currentNorm === statusFilter;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ord.buyerName.toLowerCase().includes(q) ||
        (ord.customerPhone && ord.customerPhone.toLowerCase().includes(q)) ||
        (ord.customerAddress && ord.customerAddress.toLowerCase().includes(q)) ||
        ord.itemTitle.toLowerCase().includes(q) ||
        (ord.notes && ord.notes.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [orders, searchQuery, statusFilter]);

  // Financial summary
  const summary = useMemo(() => {
    const totalRev = filteredOrders.reduce((sum, o) => sum + o.totalRevenue, 0);
    const totalProfit = filteredOrders.reduce((sum, o) => sum + o.netProfit, 0);
    const avgMargin = totalRev > 0 ? ((totalProfit / totalRev) * 100).toFixed(1) : '0';
    return { totalRev, totalProfit, avgMargin, count: filteredOrders.length };
  }, [filteredOrders]);

  const handleQuickStatusChange = async (order: Order, newStatus: OrderStatus) => {
    if (!canEditInventory) return;
    try {
      onUpdateOrderStatus?.(order.id, newStatus);
      await saveOrder({ ...order, status: newStatus }, order.id);
    } catch (err) {
      console.error('Error updating order status', err);
    }
  };

  const handleDelete = async (order: Order) => {
    if (!canDeleteRecords) return;
    if (window.confirm(`Delete order for "${order.buyerName || order.itemTitle}"?`)) {
      try {
        onDeleteOrder?.(order.id);
        await deleteOrder(order.id);
      } catch (err) {
        console.error('Error deleting order', err);
      }
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const exportToCSV = () => {
    if (filteredOrders.length === 0) return;
    const headers = [
      'Date',
      'Customer Name',
      'Phone Number',
      'Address',
      'Google Maps URL',
      'Product Name',
      'Quantity',
      'Sale Price',
      'Total Revenue',
      'Net Profit',
      'Status',
      'Payment Method',
      'Notes',
    ];

    const rows = filteredOrders.map((o) => [
      `"${o.date}"`,
      `"${(o.buyerName || '').replace(/"/g, '""')}"`,
      `"${(o.customerPhone || '').replace(/"/g, '""')}"`,
      `"${(o.customerAddress || '').replace(/"/g, '""')}"`,
      `"${(o.googleMapsUrl || '').replace(/"/g, '""')}"`,
      `"${o.itemTitle.replace(/"/g, '""')}"`,
      o.quantity,
      o.salePrice,
      o.totalRevenue,
      o.netProfit,
      normalizeStatus(o.status),
      o.paymentMethod,
      `"${(o.notes || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `marketplace_orders_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowToolsDropdown(false);
  };

  return (
    <div className="space-y-3 pb-28">
      
      {/* Top Header: Orders Count + [Search Icon] + [3-Dots Menu] in line */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2 truncate">
            <span>Orders</span>
            <span className="text-xs font-bold bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full shrink-0">
              {filteredOrders.length}
            </span>
          </h1>
        </div>

        {/* Action Icons in Line: Search Icon + 3-Dots Menu */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Shrunk Search: Icon-only toggling inline search input */}
          {isSearchOpen ? (
            <div className="flex items-center gap-1.5 bg-white border border-blue-500 rounded-xl px-2.5 py-1.5 shadow-sm text-xs animate-in fade-in duration-150">
              <Search className="w-3.5 h-3.5 text-blue-600 shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search orders..."
                className="w-28 sm:w-44 bg-transparent text-slate-800 text-xs focus:outline-hidden"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  title="Clear search"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
              <button
                onClick={() => {
                  setIsSearchOpen(false);
                  setSearchQuery('');
                }}
                className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer ml-0.5 border-l border-slate-200 pl-1"
                title="Close search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => {
                setIsSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 50);
              }}
              className={`p-2 rounded-xl border transition-colors cursor-pointer shadow-xs flex items-center justify-center ${
                searchQuery
                  ? 'bg-blue-50 border-blue-400 text-blue-600'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-600'
              }`}
              title={searchQuery ? `Searching: "${searchQuery}" (Click to view)` : "Search orders"}
              aria-label="Search orders"
            >
              <Search className="w-4 h-4" />
              {searchQuery && (
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full ml-1" />
              )}
            </button>
          )}

          {/* More Tools 3-Dots Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowToolsDropdown(!showToolsDropdown)}
              className="p-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer shadow-xs"
              title="Order tools & history export"
            >
              <MoreVertical className="w-4 h-4 text-slate-600" />
            </button>

            {showToolsDropdown && (
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-30 animate-in fade-in slide-in-from-top-1 text-xs">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Order Management
                </div>
                <button
                  onClick={() => {
                    setShowFinancialsBar(!showFinancialsBar);
                    setShowToolsDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <TrendingUp className="w-3.5 h-3.5 text-blue-600" />
                  <span>{showFinancialsBar ? 'Hide' : 'Show'} Financial Summary</span>
                </button>
                <button
                  onClick={exportToCSV}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  <span>Export Orders CSV</span>
                </button>
                <button
                  onClick={() => {
                    onOpenCSVImport();
                    setShowToolsDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 text-slate-700 hover:bg-slate-50 flex items-center gap-2 cursor-pointer font-medium"
                >
                  <Upload className="w-3.5 h-3.5 text-blue-600" />
                  <span>Import Orders CSV</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Optional Financial Summary Ribbon (Toggled from Dropdown) */}
      {showFinancialsBar && canViewFinancials && (
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex flex-wrap items-center justify-between gap-4 text-xs animate-in fade-in">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Filtered Cash Revenue</span>
            <span className="text-sm font-black text-blue-300">${summary.totalRev.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Net Profit</span>
            <span className="text-sm font-black text-emerald-400">+${summary.totalProfit.toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Margin</span>
            <span className="text-sm font-black text-emerald-300">{summary.avgMargin}%</span>
          </div>
          <button
            onClick={() => setShowFinancialsBar(false)}
            className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 4 Status Tabs: New, Confirmed, Delivered, Cancelled */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
        {[
          { id: 'all', label: 'All', count: counts.all },
          { id: 'new', label: 'New', count: counts.new },
          { id: 'confirmed', label: 'Confirmed', count: counts.confirmed },
          { id: 'delivered', label: 'Delivered', count: counts.delivered },
          { id: 'cancelled', label: 'Cancelled', count: counts.cancelled },
        ].map((tab) => {
          const isSelected = statusFilter === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer shrink-0 ${
                isSelected
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isSelected ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Active Search Query Indicator (if search closed but query entered) */}
      {searchQuery && !isSearchOpen && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 px-3 py-1.5 rounded-xl text-xs text-blue-900 animate-in fade-in">
          <span className="truncate">
            Filtering by: <span className="font-bold">"{searchQuery}"</span>
          </span>
          <button
            onClick={() => setSearchQuery('')}
            className="text-blue-600 hover:text-blue-800 font-bold ml-2 cursor-pointer shrink-0"
          >
            Clear
          </button>
        </div>
      )}

      {/* Orders Grid: Mobile-First Compact Card, Multi-Column Desktop Adaptation (NO STRETCHING) */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500 shadow-xs">
          <ShoppingBag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <h3 className="text-sm font-bold text-slate-800">No orders found</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">
            {searchQuery ? 'No orders match your search query.' : 'Tap "+ New Order" to record a new sale.'}
          </p>
          {canEditInventory && (
            <button
              onClick={() => onOpenNewSale()}
              className="mt-3 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              + Create Order
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filteredOrders.map((ord) => {
            const currentStatus = normalizeStatus(ord.status);
            const cfg = statusConfig[currentStatus];
            const mapsLink = ord.googleMapsUrl || (ord.customerAddress ? `https://maps.google.com/?q=${encodeURIComponent(ord.customerAddress)}` : null);

            return (
              <div
                key={ord.id}
                className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between gap-3"
              >
                {/* Upper Section */}
                <div className="space-y-2.5">
                  {/* Line 1: Customer Name + Phone + Price */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-slate-900 text-sm sm:text-base tracking-tight truncate">
                          {ord.buyerName || 'Facebook Customer'}
                        </span>
                        {ord.customerPhone && (
                          <a
                            href={`tel:${ord.customerPhone}`}
                            className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 px-2 py-0.5 rounded-md transition-colors"
                            title="Tap to call customer"
                          >
                            <Phone className="w-3 h-3" />
                            <span>{ord.customerPhone}</span>
                          </a>
                        )}
                      </div>
                    </div>

                    {/* Revenue */}
                    <div className="text-right shrink-0">
                      <span className="text-base font-black text-slate-900 block leading-tight">
                        ${ord.totalRevenue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Line 2: Product Name & Quantity */}
                  <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100">
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-black rounded-md shrink-0">
                      {ord.quantity}x
                    </span>
                    <span className="font-semibold text-slate-800 text-xs sm:text-sm truncate flex-1">
                      {ord.itemTitle}
                    </span>
                    {canViewFinancials && (
                      <span className="text-[11px] font-bold text-emerald-700 shrink-0">
                        +${ord.netProfit.toFixed(2)}
                      </span>
                    )}
                  </div>

                  {/* Line 3: Delivery Address & Google Maps Link */}
                  {(ord.customerAddress || ord.googleMapsUrl) && (
                    <div className="flex items-start justify-between gap-2 text-xs bg-slate-50/60 p-2 rounded-xl border border-slate-100">
                      <div className="flex items-start gap-1.5 min-w-0 flex-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="min-w-0 flex-1">
                          <span className="text-[11px] sm:text-xs text-slate-700 block leading-tight line-clamp-2">
                            {ord.customerAddress || 'Delivery Location'}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        {ord.customerAddress && (
                          <button
                            onClick={() => copyToClipboard(ord.customerAddress!, ord.id)}
                            title="Copy address"
                            className="p-1 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                          >
                            {copiedId === ord.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                        {mapsLink && (
                          <a
                            href={mapsLink}
                            target="_blank"
                            rel="noreferrer"
                            title={ord.googleMapsUrl ? "Open direct Google Map link" : "Search address on Google Maps"}
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-200 px-2 py-0.5 rounded-lg shadow-2xs hover:bg-blue-50 transition-colors"
                          >
                            <Navigation className="w-3 h-3 text-blue-600" />
                            <span>Map</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Line 4: Order Note (Inline with icon to save space) */}
                  {ord.notes && (
                    <div className="flex items-start gap-1.5 px-2.5 py-1.5 bg-amber-50/80 border border-amber-200/70 rounded-xl text-amber-900">
                      <MessageSquareText className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] font-medium leading-snug break-words flex-1">
                        {ord.notes}
                      </p>
                    </div>
                  )}
                </div>

                {/* Bottom Section: Compact Status Dropdown Menu + Date + Actions (Saves space) */}
                <div className="pt-2.5 border-t border-slate-100 mt-auto flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    {/* Status Dropdown Menu */}
                    <div className="relative inline-flex items-center">
                      <select
                        value={currentStatus}
                        onChange={(e) => handleQuickStatusChange(ord, e.target.value as OrderStatus)}
                        disabled={!canEditInventory}
                        aria-label="Order status"
                        className={`text-[11px] sm:text-xs font-bold py-1 pl-2.5 pr-6 rounded-lg border cursor-pointer appearance-none transition-colors ${cfg.bg} ${cfg.text} ${cfg.border} hover:opacity-95 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 disabled:opacity-60 disabled:cursor-not-allowed`}
                      >
                        <option value="new" className="text-slate-900 bg-white font-medium">New</option>
                        <option value="confirmed" className="text-slate-900 bg-white font-medium">Confirmed</option>
                        <option value="delivered" className="text-slate-900 bg-white font-medium">Delivered</option>
                        <option value="cancelled" className="text-slate-900 bg-white font-medium">Cancelled</option>
                      </select>
                      <ChevronDown className={`w-3.5 h-3.5 absolute right-1.5 pointer-events-none ${cfg.text}`} />
                    </div>

                    <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
                      {ord.date}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 text-slate-400 shrink-0">
                    {canEditInventory && (
                      <button
                        onClick={() => onOpenNewSale(ord)}
                        title="Edit order details"
                        className="p-1.5 hover:text-blue-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {canDeleteRecords && (
                      <button
                        onClick={() => handleDelete(ord)}
                        title="Delete order"
                        className="p-1.5 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}

      {/* Floating "New Order" Action Button: High contrast, thumb-reachable at bottom */}
      {canEditInventory && (
        <button
          onClick={() => onOpenNewSale()}
          className="fixed bottom-20 md:bottom-8 right-5 md:right-8 z-40 w-14 h-14 bg-blue-600 hover:bg-blue-700 active:scale-90 text-white rounded-full shadow-xl shadow-blue-600/40 flex items-center justify-center cursor-pointer transition-all duration-200 hover:scale-105 group focus:outline-hidden focus:ring-4 focus:ring-blue-500/30"
          title="New Order"
          aria-label="New Order"
        >
          <Plus className="w-7 h-7 transition-transform group-hover:rotate-90 duration-300 stroke-[2.5]" />
          <span className="sr-only">New Order</span>
        </button>
      )}
    </div>
  );
};

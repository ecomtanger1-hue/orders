import React, { useState } from 'react';
import { 
  Package, 
  ShoppingBag, 
  BarChart3, 
  Truck, 
  Users, 
  Building2, 
  PlusCircle, 
  Upload, 
  AlertTriangle, 
  Shield, 
  LogOut, 
  LogIn, 
  Menu, 
  X,
  Sparkles,
  ChevronDown,
  DollarSign,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  lowStockCount: number;
  onOpenNewSale: () => void;
  onOpenNewItem: () => void;
  onOpenCSVImport: () => void;
  onOpenSeedModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  lowStockCount,
  onOpenNewSale,
  onOpenNewItem,
  onOpenCSVImport,
  onOpenSeedModal,
}) => {
  const { user, profile, activeRole, isSimulatedRole, setSimulatedRole, login, logout, canManageTeam, canEditInventory, canImportCSV } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [roleDropdownOpen, setRoleDropdownOpen] = useState(false);
  const [moreDropdownOpen, setMoreDropdownOpen] = useState(false);

  const primaryNavItems = [
    { id: 'orders', label: 'Orders', icon: ShoppingBag },
    { id: 'profit', label: 'Profit', icon: DollarSign },
    { id: 'inventory', label: 'Inventory', icon: Package, badge: lowStockCount > 0 ? lowStockCount : undefined },
    { id: 'dashboard', label: 'Growth', icon: BarChart3 },
  ];

  const moreNavItems = [
    { id: 'shipping', label: 'Shipping Tracker', icon: Truck, desc: 'Shipping labels & tracking delivery costs' },
    { id: 'team', label: 'Team Management', icon: Users, desc: 'Role permissions & team members' },
    { id: 'vendors', label: 'Vendor Directory', icon: Building2, desc: 'Supplier contacts & restock lead times' },
  ];

  const isMoreActive = moreNavItems.some((m) => m.id === activeTab);

  const roleColors: Record<UserRole, { bg: string; text: string; border: string }> = {
    admin: { bg: 'bg-purple-50 text-purple-700', text: 'text-purple-700', border: 'border-purple-200' },
    manager: { bg: 'bg-blue-50 text-blue-700', text: 'text-blue-700', border: 'border-blue-200' },
    staff: { bg: 'bg-emerald-50 text-emerald-700', text: 'text-emerald-700', border: 'border-emerald-200' },
    viewer: { bg: 'bg-gray-50 text-gray-700', text: 'text-gray-700', border: 'border-gray-200' },
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Top Banner if Role Simulation is Active */}
      {isSimulatedRole && (
        <div className="bg-amber-500 text-white text-xs px-4 py-1.5 flex items-center justify-between font-medium">
          <div className="flex items-center gap-2 mx-auto">
            <Shield className="w-4 h-4" />
            <span>
              Previewing app as <strong>{activeRole.toUpperCase()}</strong> role. Permissions and navigation are filtered accordingly.
            </span>
            <button
              onClick={() => setSimulatedRole(null)}
              className="ml-3 bg-white/20 hover:bg-white/30 px-2 py-0.5 rounded text-white text-xs underline cursor-pointer"
            >
              Reset to Actual Role
            </button>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab('orders')} 
              className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-hidden"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-lg text-slate-900 tracking-tight">MarketPulse</span>
                  <span className="text-[10px] font-semibold bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">FB SELLER</span>
                </div>
                <p className="text-xs text-slate-500 hidden sm:block">Marketplace Inventory & Profit Tracker</p>
              </div>
            </button>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMoreDropdownOpen(false);
                  }}
                  className={`relative flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className="inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white bg-rose-500 rounded-full animate-pulse">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* More Dropdown Menu */}
            <div className="relative">
              <button
                onClick={() => setMoreDropdownOpen(!moreDropdownOpen)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                  isMoreActive
                    ? 'bg-blue-50 text-blue-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                <span>More</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${moreDropdownOpen ? 'rotate-180 text-blue-600' : 'text-slate-400'}`} />
              </button>

              {moreDropdownOpen && (
                <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Operations & Management</p>
                  </div>
                  {moreNavItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => {
                          setActiveTab(item.id);
                          setMoreDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 cursor-pointer ${
                          isActive ? 'bg-blue-50/80 text-blue-700 font-bold' : 'text-slate-700'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                          isActive ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'
                        }`}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-900">{item.label}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{item.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          {/* Quick Actions & Auth Profile */}
          <div className="flex items-center gap-2">
            
            {/* Quick Order button */}
            {canEditInventory && (
              <button
                onClick={onOpenNewSale}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm shadow-blue-500/25 transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Order</span>
              </button>
            )}

            {/* CSV Import */}
            {canImportCSV && (
              <button
                onClick={onOpenCSVImport}
                title="Import Sales CSV"
                className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span>Import CSV</span>
              </button>
            )}

            {/* Demo Sample Data Trigger */}
            <button
              onClick={onOpenSeedModal}
              title="Explore or Reload Demo Data"
              className="hidden lg:inline-flex items-center gap-1 px-2.5 py-2 border border-blue-200 text-blue-700 bg-blue-50/50 hover:bg-blue-50 rounded-lg text-xs font-medium cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-blue-500" />
              <span>Demo Data</span>
            </button>

            {/* Role Switcher Pill */}
            <div className="relative">
              <button
                onClick={() => setRoleDropdownOpen(!roleDropdownOpen)}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
                  roleColors[activeRole].bg
                } ${roleColors[activeRole].border}`}
                title="Active Role & Switcher"
              >
                <Shield className="w-3.5 h-3.5" />
                <span className="capitalize">{activeRole}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {roleDropdownOpen && (
                <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="px-3 py-1.5 border-b border-slate-100">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Preview Role (RBAC)</p>
                    <p className="text-xs text-slate-600 truncate">{user?.email || profile?.email}</p>
                  </div>
                  {(['admin', 'manager', 'staff', 'viewer'] as UserRole[]).map((role) => (
                    <button
                      key={role}
                      onClick={() => {
                        setSimulatedRole(role === profile?.role ? null : role);
                        setRoleDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between hover:bg-slate-50 cursor-pointer ${
                        activeRole === role ? 'font-bold text-blue-600 bg-blue-50/50' : 'text-slate-700'
                      }`}
                    >
                      <span className="capitalize">{role}</span>
                      {activeRole === role && <span className="text-[10px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">Active</span>}
                    </button>
                  ))}
                  {user && (
                    <div className="border-t border-slate-100 mt-1 pt-1">
                      <button
                        onClick={() => {
                          logout();
                          setRoleDropdownOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 flex items-center gap-2 cursor-pointer"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Google Login button if not authenticated */}
            {!user && (
              <button
                onClick={login}
                className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Google Sign-In</span>
              </button>
            )}

            {/* Mobile Hamburger toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-2 pb-4 space-y-2">
          <div className="grid grid-cols-2 gap-2 mb-3">
            {canEditInventory && (
              <button
                onClick={() => {
                  onOpenNewSale();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>New Order</span>
              </button>
            )}
            {canEditInventory && (
              <button
                onClick={() => {
                  onOpenNewItem();
                  setMobileMenuOpen(false);
                }}
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 text-white rounded-lg text-xs font-semibold cursor-pointer"
              >
                <Package className="w-4 h-4" />
                <span>+ Add Item</span>
              </button>
            )}
          </div>

          <div className="space-y-1">
            {primaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium cursor-pointer ${
                    isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="px-2 py-0.5 text-xs font-bold text-white bg-rose-500 rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="pt-2 border-t border-slate-100">
            <p className="px-3 py-1 text-[11px] font-bold text-slate-400 uppercase tracking-wider">More Tools</p>
            <div className="space-y-1">
              {moreNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium cursor-pointer ${
                      isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <button
              onClick={() => {
                onOpenSeedModal();
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-1.5 text-blue-600 font-medium py-1"
            >
              <Sparkles className="w-4 h-4" />
              <span>Load Realistic Demo Data</span>
            </button>
            {!user ? (
              <button onClick={login} className="text-slate-700 font-medium py-1">
                Google Login
              </button>
            ) : (
              <button onClick={logout} className="text-rose-600 font-medium py-1">
                Sign Out
              </button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

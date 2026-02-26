import React from 'react';
import { Employee, ViewType } from '@/types';
import { Home, QrCode, Clock, User, Users, LogOut, Menu, X, Settings, Truck, History } from 'lucide-react';

interface NavigationProps {
  employee: Employee;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
  isAndroidNative: boolean;
  isDeliveryDriver: boolean;
}

const Navigation: React.FC<NavigationProps> = ({
  employee,
  currentView,
  onNavigate,
  onLogout,
  isAndroidNative,
  isDeliveryDriver,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = React.useState(false);

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const { body } = document;
    const prevOverflow = body.style.overflow;
    if (mobileMenuOpen) {
      body.style.overflow = 'hidden';
    }
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, [mobileMenuOpen]);

  const navItems = [
    ...(!isDeliveryDriver
      ? [
          { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
          { id: 'scan' as ViewType, label: 'In / Out', icon: QrCode },
          { id: 'history' as ViewType, label: 'History', icon: Clock },
        ]
      : []),
    { id: 'profile' as ViewType, label: 'Profile', icon: User },
    ...(!isDeliveryDriver && isAndroidNative
      ? [{ id: 'settings' as ViewType, label: 'Settings', icon: Settings }]
      : []),
    ...(isDeliveryDriver
      ? [
          { id: 'delivery' as ViewType, label: 'Delivery', icon: Truck },
          { id: 'delivery_history' as ViewType, label: 'History', icon: History },
        ]
      : []),
    ...(employee.role === 'admin' ? [{ id: 'admin' as ViewType, label: 'Admin', icon: Users }] : []),
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
  };

  const handleLogoutClick = () => {
    setShowLogoutConfirm(true);
  };

  const handleConfirmLogout = () => {
    setShowLogoutConfirm(false);
    onLogout();
  };

  const handleCancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  return (
    <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-800 hidden sm:block">GeoTime QCMC</span>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => onNavigate(id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                  currentView === id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-3">
              <div className="text-right">
                <p className="text-sm font-medium text-slate-800">{employee.full_name}</p>
                <p className="text-xs text-slate-500">{employee.department}</p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(employee.full_name)}
              </div>
            </div>
            <button
              onClick={handleLogoutClick}
              className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              <span className="font-medium">Logout</span>
            </button>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 bg-white">
          <div className="h-16 px-4 sm:px-6 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-semibold">
                {getInitials(employee.full_name)}
              </div>
              <div>
                <p className="text-sm font-medium text-slate-800">{employee.full_name}</p>
                <p className="text-xs text-slate-500">{employee.department}</p>
              </div>
            </div>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
              aria-label="Close menu"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          <div className="px-4 py-6 space-y-2">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onNavigate(id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-4 rounded-xl font-medium transition-colors ${
                  currentView === id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
            <button
              onClick={() => setShowLogoutConfirm(true)}
              className="w-full flex items-center gap-3 px-4 py-4 rounded-xl font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
          {showLogoutConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-6">
              <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl p-6">
                <h3 className="text-lg font-semibold text-slate-800">Log out?</h3>
                <p className="text-sm text-slate-500 mt-2">
                  Are you sure you want to log out?
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={handleCancelLogout}
                    className="flex-1 px-4 py-2 rounded-lg border border-slate-200 text-slate-600 font-medium hover:bg-slate-50"
                  >
                    No
                  </button>
                  <button
                    onClick={() => {
                      handleConfirmLogout();
                      setMobileMenuOpen(false);
                    }}
                    className="flex-1 px-4 py-2 rounded-lg bg-red-600 text-white font-medium hover:bg-red-700"
                  >
                    Yes
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </nav>
  );
};

export default Navigation;

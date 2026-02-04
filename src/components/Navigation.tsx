import React from 'react';
import { Employee, ViewType } from '@/types';
import { Home, QrCode, Clock, User, Users, LogOut, Menu, X } from 'lucide-react';

interface NavigationProps {
  employee: Employee;
  currentView: ViewType;
  onNavigate: (view: ViewType) => void;
  onLogout: () => void;
}

const Navigation: React.FC<NavigationProps> = ({ employee, currentView, onNavigate, onLogout }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
    { id: 'scan' as ViewType, label: 'Scan', icon: QrCode },
    { id: 'history' as ViewType, label: 'History', icon: Clock },
    { id: 'profile' as ViewType, label: 'Profile', icon: User },
    ...(employee.role === 'admin' ? [{ id: 'admin' as ViewType, label: 'Admin', icon: Users }] : []),
  ];

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
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
            <span className="text-xl font-bold text-slate-800 hidden sm:block">TimeTrack Pro</span>
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
              onClick={onLogout}
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
        <div className="md:hidden border-t border-slate-200 bg-white">
          <div className="px-4 py-3 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                {getInitials(employee.full_name)}
              </div>
              <div>
                <p className="font-medium text-slate-800">{employee.full_name}</p>
                <p className="text-sm text-slate-500">{employee.department}</p>
              </div>
            </div>
          </div>
          <div className="px-2 py-2 space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => {
                  onNavigate(id);
                  setMobileMenuOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-colors ${
                  currentView === id
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
            <button
              onClick={() => {
                onLogout();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Logout
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navigation;

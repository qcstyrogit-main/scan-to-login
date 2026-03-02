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
    const prev = body.style.overflow;
    if (mobileMenuOpen) body.style.overflow = 'hidden';
    return () => { body.style.overflow = prev; };
  }, [mobileMenuOpen]);

  const navItems = [
    ...(!isDeliveryDriver ? [
      { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
      { id: 'scan'      as ViewType, label: 'In / Out',  icon: QrCode },
      { id: 'history'   as ViewType, label: 'History',   icon: Clock },
    ] : []),
    { id: 'profile' as ViewType, label: 'Profile', icon: User },
    ...(!isDeliveryDriver && isAndroidNative ? [{ id: 'settings' as ViewType, label: 'Settings', icon: Settings }] : []),
    ...(isDeliveryDriver ? [
      { id: 'delivery'         as ViewType, label: 'Delivery', icon: Truck },
      { id: 'delivery_history' as ViewType, label: 'History',  icon: History },
    ] : []),
    ...(employee.role === 'admin' ? [{ id: 'admin' as ViewType, label: 'Admin', icon: Users }] : []),
  ];

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');

        .nav {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background) / 0.85);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border-bottom: 1px solid hsl(var(--border));
          position: sticky; top: 0; z-index: 50;
        }
        .nav-inner {
          max-width: 960px; margin: 0 auto;
          padding: 0 20px;
          height: 60px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
        }
        @media (min-width: 640px)  { .nav-inner { padding: 0 28px; } }
        @media (min-width: 1024px) { .nav-inner { padding: 0 40px; } }

        /* Logo */
        .nav-logo { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }
        .nav-logo-icon {
          width: 34px; height: 34px; border-radius: 9px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
          flex-shrink: 0;
        }
        .nav-logo-name {
          font-size: 15px; font-weight: 700; color: hsl(var(--foreground));
          letter-spacing: -0.2px;
          display: none;
        }
        @media (min-width: 480px) { .nav-logo-name { display: block; } }

        /* Desktop nav items */
        .nav-items {
          display: none; align-items: center; gap: 2px;
        }
        @media (min-width: 768px) { .nav-items { display: flex; } }

        .nav-item {
          display: flex; align-items: center; gap: 7px;
          padding: 7px 13px; border-radius: 9px;
          font-size: 13px; font-weight: 500;
          color: hsl(var(--muted-foreground)); background: none; border: none;
          cursor: pointer; transition: color 0.15s, background 0.15s;
          font-family: 'Sora', sans-serif; white-space: nowrap;
        }
        .nav-item:hover { color: hsl(var(--foreground)); background: hsl(var(--foreground) / 0.05); }
        .nav-item-active {
          color: hsl(var(--primary)) !important;
          background: hsl(var(--primary) / 0.12) !important;
        }

        /* Right side */
        .nav-right { display: flex; align-items: center; gap: 10px; flex-shrink: 0; }

        .nav-user {
          display: none; align-items: center; gap: 10px;
        }
        @media (min-width: 640px) { .nav-user { display: flex; } }

        .nav-user-text { text-align: right; }
        .nav-user-name { font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); line-height: 1.3; }
        .nav-user-dept { font-size: 11px; color: hsl(var(--muted-foreground)); }

        .nav-avatar {
          width: 32px; height: 32px; border-radius: 9px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          font-size: 11px; font-weight: 700; color: white;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }

        .nav-logout-btn {
          display: none; align-items: center; gap: 6px;
          padding: 7px 13px; border-radius: 9px;
          font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground));
          background: none; border: none; cursor: pointer;
          transition: color 0.15s, background 0.15s;
          font-family: 'Sora', sans-serif;
        }
        @media (min-width: 768px) { .nav-logout-btn { display: flex; } }
        .nav-logout-btn:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.12); }

        /* Hamburger */
        .nav-hamburger {
          display: flex; align-items: center; justify-content: center;
          width: 34px; height: 34px; border-radius: 9px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground)); cursor: pointer;
          transition: background 0.15s, color 0.15s;
        }
        @media (min-width: 768px) { .nav-hamburger { display: none; } }
        .nav-hamburger:hover { background: hsl(var(--foreground) / 0.08); color: hsl(var(--foreground) / 0.8); }

        /* ── Mobile drawer ── */
        .nav-drawer {
          position: fixed; inset: 0; z-index: 60;
          background: hsl(var(--background));
          display: flex; flex-direction: column;
          animation: drawerIn 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes drawerIn { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }

        .nav-drawer-top {
          height: 60px; padding: 0 20px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid hsl(var(--border));
          flex-shrink: 0;
        }

        .nav-drawer-user { display: flex; align-items: center; gap: 10px; }
        .nav-drawer-avatar {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          font-size: 13px; font-weight: 700; color: white;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }
        .nav-drawer-name { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); }
        .nav-drawer-dept { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 1px; }

        .nav-close-btn {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.15s;
        }
        .nav-close-btn:hover { background: hsl(var(--foreground) / 0.08); color: hsl(var(--foreground) / 0.8); }

        .nav-drawer-items { padding: 16px 14px; display: flex; flex-direction: column; gap: 4px; flex: 1; overflow-y: auto; }

        .nav-drawer-item {
          width: 100%; display: flex; align-items: center; gap: 12px;
          padding: 13px 16px; border-radius: 12px;
          font-size: 14px; font-weight: 500; color: hsl(var(--muted-foreground));
          background: none; border: none; cursor: pointer;
          transition: color 0.15s, background 0.15s;
          font-family: 'Sora', sans-serif; text-align: left;
        }
        .nav-drawer-item:hover { color: hsl(var(--foreground)); background: hsl(var(--foreground) / 0.04); }
        .nav-drawer-item-active { color: hsl(var(--primary)) !important; background: hsl(var(--primary) / 0.1) !important; }

        .nav-drawer-item-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
        }
        .nav-drawer-item-active .nav-drawer-item-icon {
          background: hsl(var(--primary) / 0.15);
          border-color: hsl(var(--primary) / 0.2);
        }

        .nav-drawer-logout {
          margin: 0 14px 20px;
          width: calc(100% - 28px); display: flex; align-items: center; gap: 12px;
          padding: 13px 16px; border-radius: 12px;
          font-size: 14px; font-weight: 500; color: hsl(var(--muted-foreground));
          background: none; border: none; cursor: pointer;
          transition: color 0.15s, background 0.15s;
          font-family: 'Sora', sans-serif;
        }
        .nav-drawer-logout:hover { color: hsl(var(--destructive)); background: hsl(var(--destructive) / 0.12); }
        .nav-drawer-logout-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          background: hsl(var(--destructive) / 0.1);
          border: 1px solid hsl(var(--destructive) / 0.2);
          color: hsl(var(--destructive));
        }

        /* ── Logout confirm modal ── */
        .nav-modal-bg {
          position: fixed; inset: 0; z-index: 70;
          background: hsl(var(--background) / 0.7);
          backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
          padding: 24px;
          animation: modalFade 0.2s ease both;
        }
        @keyframes modalFade { from { opacity: 0; } to { opacity: 1; } }

        .nav-modal {
          width: 100%; max-width: 340px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 18px;
          padding: 28px 24px;
          position: relative; overflow: hidden;
          animation: modalUp 0.25s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes modalUp { from { opacity: 0; transform: translateY(16px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
        .nav-modal::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.4), transparent);
        }

        .nav-modal-title { font-size: 16px; font-weight: 700; color: hsl(var(--foreground)); margin-bottom: 8px; }
        .nav-modal-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 24px; }

        .nav-modal-btns { display: flex; gap: 10px; }
        .nav-modal-cancel {
          flex: 1; padding: 10px;
          background: hsl(var(--foreground) / 0.05);
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.15s;
          font-family: 'Sora', sans-serif;
        }
        .nav-modal-cancel:hover { background: hsl(var(--foreground) / 0.09); color: hsl(var(--foreground)); }

        .nav-modal-confirm {
          flex: 1; padding: 10px;
          background: hsl(var(--destructive) / 0.15);
          border: 1px solid hsl(var(--destructive) / 0.25);
          border-radius: 10px;
          color: hsl(var(--destructive)); font-size: 13px; font-weight: 600;
          cursor: pointer; transition: all 0.15s;
          font-family: 'Sora', sans-serif;
        }
        .nav-modal-confirm:hover { background: hsl(var(--destructive) / 0.25); }
      `}</style>

      <nav className="nav">
        <div className="nav-inner">

          {/* Logo */}
          <div className="nav-logo">
            <div className="nav-logo-icon">
              <Clock size={17} color="white" />
            </div>
            <span className="nav-logo-name">GeoTime QCMC</span>
          </div>

          {/* Desktop nav */}
          <div className="nav-items">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-item${currentView === id ? ' nav-item-active' : ''}`}
                onClick={() => onNavigate(id)}
              >
                <Icon size={15} />
                {label}
              </button>
            ))}
          </div>

          {/* Right */}
          <div className="nav-right">
            <div className="nav-user">
              <div className="nav-user-text">
                <div className="nav-user-name">{employee.full_name}</div>
                <div className="nav-user-dept">{employee.department}</div>
              </div>
              <div className="nav-avatar">{initials(employee.full_name)}</div>
            </div>
            <button className="nav-logout-btn" onClick={() => setShowLogoutConfirm(true)}>
              <LogOut size={14} />
              Logout
            </button>
            <button className="nav-hamburger" onClick={() => setMobileMenuOpen(true)}>
              <Menu size={16} />
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="nav-drawer">
          <div className="nav-drawer-top">
            <div className="nav-drawer-user">
              <div className="nav-drawer-avatar">{initials(employee.full_name)}</div>
              <div>
                <div className="nav-drawer-name">{employee.full_name}</div>
                <div className="nav-drawer-dept">{employee.department}</div>
              </div>
            </div>
            <button className="nav-close-btn" onClick={() => setMobileMenuOpen(false)}>
              <X size={16} />
            </button>
          </div>

          <div className="nav-drawer-items">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                className={`nav-drawer-item${currentView === id ? ' nav-drawer-item-active' : ''}`}
                onClick={() => { onNavigate(id); setMobileMenuOpen(false); }}
              >
                <span className="nav-drawer-item-icon">
                  <Icon size={15} />
                </span>
                {label}
              </button>
            ))}
          </div>

          <button className="nav-drawer-logout" onClick={() => setShowLogoutConfirm(true)}>
            <span className="nav-drawer-logout-icon">
              <LogOut size={15} />
            </span>
            Logout
          </button>
        </div>
      )}

      {/* Logout confirm */}
      {showLogoutConfirm && (
        <div className="nav-modal-bg" onClick={() => setShowLogoutConfirm(false)}>
          <div className="nav-modal" onClick={e => e.stopPropagation()}>
            <div className="nav-modal-title">Log out?</div>
            <div className="nav-modal-sub">Are you sure you want to sign out of your account?</div>
            <div className="nav-modal-btns">
              <button className="nav-modal-cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="nav-modal-confirm" onClick={() => { setShowLogoutConfirm(false); setMobileMenuOpen(false); onLogout(); }}>
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default Navigation;

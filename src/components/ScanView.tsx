import React, { useEffect, useRef, useState } from 'react';
import { QrCode, LogIn, LogOut, Loader2 } from 'lucide-react';
import { erpRequest, extractErrorMessage } from '@/lib/erpApi';

interface GeoStatus {
  checking: boolean;
  allowed: boolean;
  message: string;
  distanceMeters?: number;
  initialized: boolean;
}

interface ScanViewProps {
  nextCheckType: 'in' | 'out';
  checkinLoading: boolean;
  geoStatus: GeoStatus;
  showBiometricHint: boolean;
  isAccountManager: boolean;
  onCheckin: (type: 'in' | 'out', data?: { customerName?: string; activities?: string }) => void;
}

const ScanView: React.FC<ScanViewProps> = ({
  nextCheckType,
  checkinLoading,
  geoStatus,
  showBiometricHint,
  isAccountManager,
  onCheckin,
}) => {
  const [customerInput, setCustomerInput] = useState('');
  const [customerItems, setCustomerItems] = useState<Array<{ name: string; customer_name?: string }>>([]);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState<string | null>(null);
  const [customerCacheHint, setCustomerCacheHint] = useState<string | null>(null);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const [activitiesInput, setActivitiesInput] = useState('');
  const isCustomerRequired = isAccountManager && nextCheckType === 'in';
  const showActivities = nextCheckType === 'out';

  useEffect(() => {
    if (nextCheckType === 'in') {
      setActivitiesInput('');
      return;
    }
    setCustomerInput('');
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setCustomerItems([]);
    setCustomerError(null);
    setCustomerLoading(false);
  }, [nextCheckType]);

  const resolveCustomerName = () => {
    if (selectedCustomerName) return selectedCustomerName;
    const input = customerInput.trim();
    if (!input) return '';
    const match = customerItems.find(
      (item) =>
        item?.name?.toLowerCase() === input.toLowerCase() ||
        item?.customer_name?.toLowerCase() === input.toLowerCase()
    );
    return (match?.customer_name || match?.name || input).trim();
  };

  const CUSTOMER_CACHE_KEY = 'customer_cache_v1';
  const readCustomerCache = () => {
    try {
      const raw = localStorage.getItem(CUSTOMER_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  const writeCustomerCache = (items: Array<{ name: string; customer_name?: string }>) => {
    try {
      localStorage.setItem(CUSTOMER_CACHE_KEY, JSON.stringify(items));
    } catch {
      // ignore cache failures
    }
  };

  const mergeCustomerCache = (items: Array<{ name: string; customer_name?: string }>) => {
    const existing = readCustomerCache();
    const map = new Map<string, { name: string; customer_name?: string }>();
    [...existing, ...items].forEach((item) => {
      if (item?.name) map.set(item.name, item);
    });
    const merged = Array.from(map.values()).slice(0, 200);
    writeCustomerCache(merged);
    return merged;
  };

  const filterCustomerCache = (query: string) => {
    const lower = query.toLowerCase();
    return readCustomerCache().filter(
      (item) =>
        item?.name?.toLowerCase().includes(lower) ||
        item?.customer_name?.toLowerCase().includes(lower)
    );
  };

  useEffect(() => {
    const query = (customerInput ?? '').trim();
    if (query.length < 2) {
      setCustomerItems([]);
      setCustomerLoading(false);
      setCustomerError(null);
      setCustomerCacheHint(null);
      setSelectedCustomerId('');
      return;
    }
    const isOffline = typeof navigator !== 'undefined' && navigator.onLine === false;
    if (isOffline) {
      const cached = filterCustomerCache(query);
      setCustomerItems(cached);
      setCustomerLoading(false);
      setCustomerError(cached.length === 0 ? 'Offline: no cached customers found.' : null);
      setCustomerCacheHint('Offline: showing cached customers.');
      return;
    }
    let active = true;
    setCustomerLoading(true);
    setCustomerError(null);
    setCustomerCacheHint(null);
    const timer = setTimeout(async () => {
      try {
        const res = await erpRequest('/api/method/qcmc_logic.api.customers.list_customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            limit: 20,
            start: 0,
            search: query,
            include_disabled: 0,
          },
        });
        const payload = (res.data as { message?: unknown })?.message ?? res.data;
        if (!res.ok || (payload as { success?: boolean })?.success === false) {
          throw new Error(extractErrorMessage(payload, 'Unable to load customers'));
        }
        const items = Array.isArray((payload as { items?: unknown }).items)
          ? ((payload as { items: Array<{ name: string; customer_name?: string }> }).items)
          : [];
        mergeCustomerCache(items);
        if (active) {
          setCustomerItems(items);
          setCustomerLoading(false);
        }
      } catch (err) {
        if (active) {
          const cached = filterCustomerCache(query);
          setCustomerItems(cached);
          setCustomerLoading(false);
          setCustomerError(
            cached.length === 0
              ? err instanceof Error
                ? err.message
                : 'Unable to load customers'
              : null
          );
          if (cached.length > 0) setCustomerCacheHint('Showing cached customers.');
        }
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [customerInput]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .scan-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          min-height: 100vh;
          padding: 0;
          color: hsl(var(--foreground));
          position: relative;
          overflow-x: hidden;
        }

        .scan-root::before {
          content: '';
          position: fixed;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .scan-root::after {
          content: '';
          position: fixed;
          bottom: -150px;
          left: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .scan-content { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }

        .scan-card {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px hsl(var(--foreground) / 0.08);
          animation: scanFadeUp 0.5s ease forwards;
          opacity: 0;
          transform: translateY(16px);
        }

        @keyframes scanFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .scan-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid hsl(var(--border));
          position: relative;
          overflow: hidden;
        }

        .scan-header::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }

        .scan-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .scan-title { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); }
        .scan-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .scan-body { padding: 24px; }

        .scan-btn {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 28px;
          border-radius: 16px;
          color: white;
          border: 1px solid hsl(var(--border));
          transition: transform 0.15s, opacity 0.2s, border-color 0.2s;
          font-family: 'Sora', sans-serif;
        }

        .scan-btn:hover { transform: translateY(-2px); border-color: hsl(var(--primary) / 0.3); }
        .scan-btn:active { transform: translateY(0); }

        .scan-btn.in {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .scan-btn.out {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        .scan-btn.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .scan-status {
          margin-top: 14px;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .scan-hint {
          margin-top: 10px;
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        .scan-customer {
          margin-top: 18px;
        }

        .scan-customer-label {
          font-size: 12px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          margin-bottom: 6px;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .scan-customer-input {
          position: relative;
        }

        .scan-customer-input input {
          width: 100%;
          padding: 10px 12px;
          border-radius: 12px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          font-family: 'Sora', sans-serif;
        }

        .scan-customer-input input:focus {
          border-color: hsl(var(--primary) / 0.5);
          background: hsl(var(--primary) / 0.06);
        }

        .scan-customer-list {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          max-height: 220px;
          overflow-y: auto;
          box-shadow: 0 14px 28px hsl(var(--foreground) / 0.12);
          z-index: 10;
        }

        .scan-customer-item {
          padding: 10px 12px;
          cursor: pointer;
          transition: background 0.15s;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .scan-customer-item:hover {
          background: hsl(var(--foreground) / 0.04);
        }

        .scan-customer-title {
          font-size: 13px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .scan-customer-sub {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        .scan-customer-hint {
          margin-top: 6px;
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        .scan-customer-error {
          margin-top: 6px;
          font-size: 11px;
          color: hsl(var(--destructive));
        }

        .scan-activities {
          margin-top: 14px;
        }

        .scan-activities textarea {
          width: 100%;
          min-height: 96px;
          resize: vertical;
          padding: 10px 12px;
          border-radius: 12px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          font-size: 13px;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
          font-family: 'Sora', sans-serif;
        }

        .scan-activities textarea:focus {
          border-color: hsl(var(--primary) / 0.5);
          background: hsl(var(--primary) / 0.06);
        }
      `}</style>

      <div className="scan-root">
        <div className="scan-content">
          <div className="scan-card">
            <div className="scan-header">
              <div className="scan-icon">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="scan-title">Quick Check-in</div>
                <div className="scan-sub">
                  Tap to {nextCheckType === 'in' ? 'check in' : 'check out'}
                </div>
              </div>
            </div>

            <div className="scan-body">
              <button
                onClick={() =>
                  onCheckin(nextCheckType, {
                    customerName: resolveCustomerName() || undefined,
                    activities: activitiesInput.trim() || undefined,
                  })
                }
                disabled={
                  !geoStatus.allowed ||
                  checkinLoading ||
                  !geoStatus.initialized ||
                  (isCustomerRequired && !resolveCustomerName())
                }
                className={`scan-btn ${nextCheckType === 'in' ? 'in' : 'out'} ${
                  !geoStatus.allowed ||
                  checkinLoading ||
                  !geoStatus.initialized ||
                  (isCustomerRequired && !resolveCustomerName())
                    ? 'disabled'
                    : ''
                }`}
              >
                {checkinLoading ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : nextCheckType === 'in' ? (
                  <LogIn className="w-10 h-10" />
                ) : (
                  <LogOut className="w-10 h-10" />
                )}
                <span className="font-semibold text-lg">
                  {checkinLoading ? 'Processing...' : nextCheckType === 'in' ? 'Check In' : 'Check Out'}
                </span>
              </button>

              {isCustomerRequired && (
                <div className="scan-customer">
                  <div className="scan-customer-label">Customer</div>
                  <div className="scan-customer-input">
                    <input
                      ref={customerInputRef}
                      value={customerInput}
                      onChange={(e) => {
                        const nextValue = e.target.value ?? '';
                        setCustomerInput(nextValue);
                        setShowCustomerDropdown(true);
                      }}
                      onFocus={() => setShowCustomerDropdown(true)}
                      onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 150)}
                      placeholder="Type customer name or ID"
                      autoComplete="off"
                    />
                    {showCustomerDropdown && (
                      <div className="scan-customer-list">
                        {customerLoading ? (
                          <div className="scan-customer-item">
                            <span className="scan-customer-title">Searching customers…</span>
                          </div>
                        ) : customerItems.length > 0 ? (
                          customerItems.map((customer, idx) => (
                            <div
                              key={customer.name || `${customer.customer_name || 'customer'}-${idx}`}
                              className="scan-customer-item"
                              onMouseDown={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              const label = customer.customer_name || customer.name || '';
                              setCustomerInput(label);
                              setSelectedCustomerId(customer.name || '');
                              setSelectedCustomerName(customer.customer_name || customer.name || '');
                              setShowCustomerDropdown(false);
                            }}
                          >
                              <span className="scan-customer-title">
                                {customer.customer_name || customer.name}
                              </span>
                              <span className="scan-customer-sub">ID: {customer.name}</span>
                            </div>
                          ))
                        ) : (customerInput ?? '').trim().length >= 2 ? (
                          <div className="scan-customer-item">
                            <span className="scan-customer-title">No customers found</span>
                          </div>
                        ) : null}
                      </div>
                    )}
                  </div>
                <div className="scan-customer-hint">
                  Start typing (min 2 chars) to search customers.
                  {selectedCustomerId ? ` Selected: ${selectedCustomerId}` : ''}
                </div>
                {customerCacheHint && <div className="scan-customer-hint">{customerCacheHint}</div>}
                {!resolveCustomerName() && (
                  <div className="scan-customer-error">Customer is required for check in.</div>
                )}
                  {customerError && <div className="scan-customer-error">{customerError}</div>}
                </div>
              )}

              {showActivities && (
                <div className="scan-activities">
                  <div className="scan-customer-label">Activities</div>
                  <textarea
                    value={activitiesInput}
                    onChange={(e) => setActivitiesInput(e.target.value)}
                    placeholder="Add activity details..."
                    rows={4}
                  />
                </div>
              )}

              <div className="scan-status">
                <span
                  className="scan-status-dot"
                  style={{ background: geoStatus.allowed ? '#22c55e' : '#ef4444' }}
                />
                <span>
                  {!geoStatus.initialized ? 'Checking location...' : geoStatus.message}
                  {geoStatus.distanceMeters !== undefined ? ` (${geoStatus.distanceMeters.toFixed(1)}m)` : ''}
                </span>
              </div>

              {showBiometricHint && (
                <div className="scan-hint">
                  Biometric authentication is required on Android for check in/out.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScanView;

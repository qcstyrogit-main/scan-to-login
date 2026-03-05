import React, { useEffect, useMemo, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import {
  AndroidBiometryStrength,
  BiometricAuth,
  BiometryError,
  BiometryErrorType,
} from '@aparajita/capacitor-biometric-auth';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from '@/components/ui/sonner';
import type { Employee, ViewType, Checkin } from '@/types';
import LoginPage from '@/components/LoginPage';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import HistoryView from '@/components/HistoryView';
import ScanView from '@/components/ScanView';
import ProfileSection from '@/components/ProfileSection';
import SettingsPage from '@/components/SettingsPage';
import DeliveryPage from '@/components/DeliveryPage';
import DeliveryHistoryPage from '@/components/DeliveryHistoryPage';
import DeliveryCustomersPage from '@/components/DeliveryCustomersPage';
import SimpleFooter from '@/components/SimpleFooter';
import { getCurrentLocation } from '@/lib/location';
import {
  createEmployeeCheckin,
  erpLogin,
  fetchCheckins,
  validateCheckinRadius,
} from '@/lib/erpService';
import { setErpSid } from '@/lib/erpApi';

const EMPLOYEE_STORAGE_KEY = 'employee';
const BIOMETRIC_STORAGE_KEY = 'settings.biometricEnabled';
const PENDING_CHECKINS_KEY = 'pending_checkins_v1';
const GEOFENCE_CACHE_KEY = 'geofence_cache_v1';
const GEOFENCE_CACHE_TTL_MS = 30 * 60 * 1000;
const GEOFENCE_REFRESH_MS = 5 * 60 * 1000;

type PendingCheckin = {
  id: string;
  employeeId: string;
  checkType: 'in' | 'out';
  latitude: number;
  longitude: number;
  deviceId: string;
  timestamp: string;
  customCustomer?: string;
  customActivities?: string;
};

type GeofenceCache = {
  employeeId: string;
  allowed: boolean;
  message?: string;
  distanceMeters?: number;
  timestamp: number;
};

const loadPendingCheckins = (): PendingCheckin[] => {
  try {
    const raw = localStorage.getItem(PENDING_CHECKINS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as PendingCheckin[];
  } catch {
    return [];
  }
};

const savePendingCheckins = (items: PendingCheckin[]) => {
  try {
    localStorage.setItem(PENDING_CHECKINS_KEY, JSON.stringify(items));
  } catch {
    // ignore storage failures
  }
};

const loadGeofenceCache = (): GeofenceCache | null => {
  try {
    const raw = localStorage.getItem(GEOFENCE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as GeofenceCache;
  } catch {
    return null;
  }
};

const saveGeofenceCache = (cache: GeofenceCache) => {
  try {
    localStorage.setItem(GEOFENCE_CACHE_KEY, JSON.stringify(cache));
  } catch {
    // ignore storage failures
  }
};

const loadStoredEmployee = (): Employee | null => {
  try {
    const raw = localStorage.getItem(EMPLOYEE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    if (!parsed.id || !parsed.email) return null;
    return parsed as Employee;
  } catch {
    localStorage.removeItem(EMPLOYEE_STORAGE_KEY);
    return null;
  }
};

const saveStoredEmployee = (employee: Employee | null) => {
  try {
    if (employee) {
      localStorage.setItem(EMPLOYEE_STORAGE_KEY, JSON.stringify(employee));
    } else {
      localStorage.removeItem(EMPLOYEE_STORAGE_KEY);
    }
  } catch {
    // Ignore storage failures.
  }
};

const getErrorMessage = (err: unknown, fallback: string) => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return fallback;
};

// ─── Loading Screen ───────────────────────────────────────────────────────────
const LoadingScreen: React.FC = () => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;600&display=swap');
      .loading-root {
        min-height: 100vh;
        background: hsl(var(--background));
        display: flex;
        align-items: center;
        justify-content: center;
        font-family: 'Sora', sans-serif;
      }
      .loading-inner { display: flex; flex-direction: column; align-items: center; gap: 20px; }
      .loading-ring {
        width: 44px; height: 44px;
        border: 3px solid hsl(var(--primary) / 0.2);
        border-top-color: hsl(var(--primary));
        border-radius: 50%;
        animation: spin 0.8s linear infinite;
      }
      .loading-text { font-size: 14px; color: hsl(var(--muted-foreground)); letter-spacing: 0.05em; }
      @keyframes spin { to { transform: rotate(360deg); } }
    `}</style>
    <div className="loading-root">
      <div className="loading-inner">
        <div className="loading-ring" />
        <p className="loading-text">Loading…</p>
      </div>
    </div>
  </>
);

// ─── Admin Panel ──────────────────────────────────────────────────────────────
const AdminPanel: React.FC = () => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap');
      .admin-root { font-family: 'Sora', sans-serif; }
      .admin-hero {
        background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
        border: 1px solid hsl(var(--primary) / 0.2);
        border-radius: 20px;
        padding: 28px 32px;
        display: flex; align-items: center; gap: 20px;
        position: relative; overflow: hidden;
        margin-bottom: 20px;
      }
      .admin-hero::before {
        content: '';
        position: absolute; top: 0; left: 0; right: 0; height: 1px;
        background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
      }
      .admin-icon {
        width: 56px; height: 56px;
        background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
        border-radius: 14px;
        display: flex; align-items: center; justify-content: center;
        font-size: 22px; font-weight: 700; color: white;
        box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
        flex-shrink: 0;
      }
      .admin-title { font-size: 22px; font-weight: 700; color: hsl(var(--foreground)); }
      .admin-sub { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 4px; }
      .admin-body {
        background: hsl(var(--card));
        border: 1px solid hsl(var(--border));
        border-radius: 16px;
        padding: 48px 32px;
        text-align: center;
      }
      .admin-body p { color: hsl(var(--muted-foreground)); font-size: 14px; }
      .admin-body span { display: block; font-size: 12px; color: hsl(var(--muted-foreground) / 0.75); margin-top: 6px; }
    `}</style>
    <div className="admin-root">
      <div className="admin-hero">
        <div className="admin-icon">A</div>
        <div>
          <div className="admin-title">Admin Dashboard</div>
          <div className="admin-sub">Monitor all employee check-ins</div>
        </div>
      </div>
      <div className="admin-body">
        <p>Admin panel with employee monitoring</p>
        <span>View all employees and their check-in status</span>
      </div>
    </div>
  </>
);

// ─── App Shell ────────────────────────────────────────────────────────────────
const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <>
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');
      .app-shell {
        min-height: 100vh;
        background: hsl(var(--background));
        display: flex;
        flex-direction: column;
        font-family: 'Sora', sans-serif;
      }
      .app-main {
        flex: 1;
        width: 100%;
        max-width: 960px;
        margin: 0 auto;
        padding: 20px 16px 40px;
      }
      @media (min-width: 640px) { .app-main { padding: 24px 20px 48px; } }
      @media (min-width: 1024px) { .app-main { padding: 28px 32px 56px; } }
      @media (max-width: 767px) { .app-main { padding-bottom: 90px; } }

      /* Global scrollbar for dark theme */
      ::-webkit-scrollbar { width: 6px; height: 6px; }
      ::-webkit-scrollbar-track { background: hsl(var(--background)); }
      ::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 3px; }
      ::-webkit-scrollbar-thumb:hover { background: hsl(var(--muted-foreground) / 0.5); }

      .offline-banner {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        height: 36px;
        background: #ef4444;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        z-index: 200;
        letter-spacing: 0.02em;
      }
      .offline-banner.online {
        background: #16a34a;
      }
      .offline-spacer {
        height: 36px;
        width: 100%;
      }
      .sync-banner {
        position: fixed;
        left: 0;
        right: 0;
        height: 32px;
        background: #2563eb;
        color: white;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 12px;
        font-weight: 600;
        z-index: 199;
        letter-spacing: 0.02em;
      }
      .sync-banner.success {
        background: #0ea5e9;
      }
      .sync-spacer {
        height: 32px;
        width: 100%;
      }
    `}</style>
    <div className="app-shell">
      {children}
    </div>
  </>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const AppLayout: React.FC = () => {
  const queryClient = useQueryClient();
  const [employee, setEmployee] = useState<Employee | null>(() => loadStoredEmployee());
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isAndroidNative, setIsAndroidNative] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [showOnlineBanner, setShowOnlineBanner] = useState(false);
  const [syncBanner, setSyncBanner] = useState<{ message: string; type: 'info' | 'success' } | null>(null);
  const [offlineRestoreBanner, setOfflineRestoreBanner] = useState(false);
  const syncingRef = React.useRef(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loginError, setLoginError] = useState<string | undefined>(undefined);
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [checkinUiLoading, setCheckinUiLoading] = useState(false);

  useEffect(() => {
    const storedBiometric = localStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (storedBiometric !== null) setBiometricEnabled(storedBiometric === 'true');
    setIsAndroidNative(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  useEffect(() => {
    if (!employee || !isOnline) return;
    const cached = loadGeofenceCache();
    if (cached && cached.employeeId === employee.id && cached.allowed) {
      // Refresh TTL when back online using last known allowed geofence.
      saveGeofenceCache({ ...cached, timestamp: Date.now() });
    }
  }, [employee, isOnline]);

  useEffect(() => {
    if (!employee || !isOnline || !isAppVisible) return;
    let active = true;
    const refresh = async () => {
      try {
        const { latitude, longitude } = await getCurrentLocation('checkin');
        const result = await validateCheckinRadius({ latitude, longitude, allowedRadiusMeters: 50 });
        if (!active) return;
        saveGeofenceCache({
          employeeId: employee.id,
          allowed: result.allowed,
          message: result.message,
          distanceMeters: result.distanceMeters,
          timestamp: Date.now(),
        });
      } catch {
        // ignore background refresh failures
      }
    };
    refresh();
    const timer = setInterval(refresh, GEOFENCE_REFRESH_MS);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [employee, isOnline, isAppVisible]);

  useEffect(() => {
    if (!employee || isOnline) return;
    setOfflineRestoreBanner(true);
    const timer = setTimeout(() => setOfflineRestoreBanner(false), 3000);
    return () => clearTimeout(timer);
  }, [employee, isOnline]);

  const syncPendingCheckins = React.useCallback(async () => {
    if (!employee || !isOnline || syncingRef.current) return;
    syncingRef.current = true;
    try {
      const pending = loadPendingCheckins();
      if (pending.length === 0) return;
      setSyncBanner({
        message: `Syncing ${pending.length} offline check-in${pending.length === 1 ? '' : 's'}...`,
        type: 'info',
      });
      const remaining: PendingCheckin[] = [];
      const currentEmployeeItems = pending
        .filter((item) => item.employeeId === employee.id)
        .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const otherEmployeeItems = pending.filter((item) => item.employeeId !== employee.id);
      let syncedCount = 0;
      for (const item of currentEmployeeItems) {
        try {
          await createEmployeeCheckin({
            employee,
            checkType: item.checkType,
            latitude: item.latitude,
            longitude: item.longitude,
            deviceId: item.deviceId,
            customCustomer: item.customCustomer,
            customActivities: item.customActivities,
          });
          syncedCount += 1;
        } catch {
          remaining.push(item);
        }
      }
      remaining.push(...otherEmployeeItems);
      savePendingCheckins(remaining);
      if (syncedCount > 0) {
        queryClient.invalidateQueries({ queryKey: ['checkins', employee.id] });
        setSyncBanner({
          message: `Synced ${syncedCount} offline check-in${syncedCount === 1 ? '' : 's'}.`,
          type: 'success',
        });
        setTimeout(() => setSyncBanner(null), 2000);
      }
    } finally {
      syncingRef.current = false;
    }
  }, [employee, isOnline, queryClient]);

  useEffect(() => {
    void syncPendingCheckins();
  }, [syncPendingCheckins]);

  useEffect(() => {
    if (!isAndroidNative) return;
    if (!isOnline) {
      setShowOnlineBanner(false);
      return;
    }
    setShowOnlineBanner(true);
    const timer = setTimeout(() => setShowOnlineBanner(false), 2000);
    return () => clearTimeout(timer);
  }, [isOnline, isAndroidNative]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => setIsAppVisible(document.visibilityState === 'visible');
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const normalizedDesignation = employee?.designation?.trim().toLowerCase() || '';
  const isDeliveryDriver = normalizedDesignation === 'delivery driver';
  const accountManagerDesignations = new Set([
    'account manager',
    'regional sales manager - (gma terr)',
    'regional sales manager - provincial',
    'regional sales manager - (ind/insti/sup)',
  ]);
  const isAccountManager = accountManagerDesignations.has(normalizedDesignation);

  useEffect(() => {
    if (!employee) return;
    if (isDeliveryDriver) {
      const allowedDeliveryViews: ViewType[] = [
        'delivery',
        'delivery_customers',
        'delivery_history',
        'profile',
      ];
      if (!allowedDeliveryViews.includes(currentView)) setCurrentView('delivery');
      return;
    }
    if (isAccountManager) {
      const allowedAccountViews: ViewType[] = [
        'delivery_customers',
        'profile',
        'dashboard',
        'history',
        'scan',
        'settings',
      ];
      if (!allowedAccountViews.includes(currentView)) setCurrentView('delivery_customers');
      return;
    }
    if (
      !isDeliveryDriver &&
      !isAccountManager &&
      (currentView === 'delivery' ||
        currentView === 'delivery_history' ||
        currentView === 'delivery_customers')
    ) {
      setCurrentView('dashboard');
    }
  }, [employee, currentView, isDeliveryDriver, isAccountManager]);

  useEffect(() => {
    if (employee?.role !== 'admin' && currentView === 'admin') setCurrentView('dashboard');
  }, [employee?.role, currentView]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  }, [currentView]);

  const loginMutation = useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      erpLogin(email, password),
    onSuccess: (emp) => {
      setEmployee(emp);
      saveStoredEmployee(emp);
      setLoginError(undefined);
      setCurrentView('dashboard');
      queryClient.invalidateQueries({ queryKey: ['checkins', emp.id] });
    },
    onError: (err) => setLoginError(getErrorMessage(err, 'Unable to sign in')),
  });

  const checkinsQuery = useQuery({
    queryKey: ['checkins', employee?.id],
    queryFn: () => fetchCheckins(employee),
    enabled: !!employee,
    staleTime: 15000,
    retry: 1,
    onError: (err) => toast.error(getErrorMessage(err, 'Unable to load check-ins')),
  });

  const checkins = useMemo(() => checkinsQuery.data ?? [], [checkinsQuery.data]);
  const latestCheckin = checkins[0];

  const geofenceQuery = useQuery({
    queryKey: ['geofence', employee?.id],
    queryFn: async () => {
      const { latitude, longitude } = await getCurrentLocation('checkin');
      return validateCheckinRadius({ latitude, longitude, allowedRadiusMeters: 50 });
    },
    enabled: !!employee && currentView === 'scan',
    refetchInterval: isAppVisible ? 30000 : false,
    refetchOnWindowFocus: true,
    staleTime: 15000,
    retry: 1,
  });

  const geoStatus = useMemo(() => {
    if (!employee || currentView !== 'scan') {
      return { checking: false, allowed: false, message: 'Checking location...', initialized: false };
    }
    if (!isOnline) {
      const cached = loadGeofenceCache();
      const isFresh = cached && cached.employeeId === employee.id && (Date.now() - cached.timestamp) <= GEOFENCE_CACHE_TTL_MS;
      if (isFresh) {
        return {
          checking: false,
          allowed: cached.allowed,
          distanceMeters: cached.distanceMeters,
          message: cached.allowed
            ? 'Offline: last location check OK.'
            : cached.message || 'Offline: location not verified.',
          initialized: true,
        };
      }
      return {
        checking: false,
        allowed: false,
        message: 'Offline: connect to verify location.',
        initialized: true,
      };
    }
    if (geofenceQuery.isError) {
      return {
        checking: false, allowed: false,
        message: getErrorMessage(geofenceQuery.error, 'Unable to validate location'),
        initialized: true,
      };
    }
    if (!geofenceQuery.data) {
      return { checking: geofenceQuery.isFetching, allowed: false, message: 'Checking location...', initialized: false };
    }
    return {
      checking: geofenceQuery.isFetching,
      allowed: geofenceQuery.data.allowed,
      distanceMeters: geofenceQuery.data.distanceMeters,
      message: geofenceQuery.data.message,
      initialized: true,
    };
  }, [employee, currentView, isOnline, geofenceQuery.data, geofenceQuery.error, geofenceQuery.isError, geofenceQuery.isFetching]);

  const checkinMutation = useMutation({
    mutationFn: async ({
      checkType,
      latitude,
      longitude,
      customCustomer,
      customActivities,
    }: {
      checkType: 'in' | 'out';
      latitude: number;
      longitude: number;
      customCustomer?: string;
      customActivities?: string;
    }) => {
      if (!employee) throw new Error('Not authenticated');
      const platform = Capacitor.getPlatform();
      const rawUa = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      const compactUa = rawUa.replace(/\s+/g, ' ').replace(/[^\w.\- /]/g, '').slice(0, 110);
      const deviceId = `${platform.toUpperCase()}-${compactUa}`.slice(0, 140);
      return createEmployeeCheckin({
        employee,
        checkType,
        latitude,
        longitude,
        deviceId,
        customCustomer,
        customActivities,
      });
    },
    onSuccess: (_checkin, variables) => {
      toast.success(variables.checkType === 'in' ? 'Checked In successfully' : 'Checked Out successfully');
      queryClient.invalidateQueries({ queryKey: ['checkins', employee?.id] });
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Check-in failed')),
  });

  useEffect(() => {
    if (currentView !== 'history') return;
    if (selectedHistoryId) {
      const hasSelected = checkins.some(
        (c) => c.id === selectedHistoryId && Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
      );
      if (hasSelected) return;
    }
    const firstWithCoords = checkins.find(
      (c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude)
    );
    setSelectedHistoryId(firstWithCoords?.id ?? null);
  }, [currentView, checkins, selectedHistoryId]);

  const handleLogin = (email: string, password: string) => {
    setLoginError(undefined);
    loginMutation.mutate({ email, password });
  };

  const handleLogout = () => {
    setEmployee(null);
    saveStoredEmployee(null);
    void setErpSid('');
    setCurrentView('dashboard');
    setSelectedHistoryId(null);
    queryClient.removeQueries({ queryKey: ['checkins'] });
    queryClient.removeQueries({ queryKey: ['geofence'] });
  };

  const handleBiometricToggle = (enabled: boolean) => {
    setBiometricEnabled(enabled);
    localStorage.setItem(BIOMETRIC_STORAGE_KEY, enabled ? 'true' : 'false');
  };

  const handleCheckin = async (
    checkType: 'in' | 'out',
    data?: { customerName?: string; activities?: string }
  ) => {
    if (!employee) return;
    try {
      if (checkType === 'in' && isAccountManager && !data?.customerName?.trim()) {
        toast.error('Customer is required for check in.');
        return;
      }
      setCheckinUiLoading(true);
      if (biometricEnabled && isAndroidNative) {
        const info = await BiometricAuth.checkBiometry();
        if (!info.isAvailable) {
          toast.error(info.reason || 'Biometric authentication is not available on this device.');
          return;
        }
        try {
          await BiometricAuth.authenticate({
            reason: 'Authenticate to check in/out',
            cancelTitle: 'Cancel',
            allowDeviceCredential: false,
            androidTitle: 'Check-in Verification',
            androidSubtitle: 'Use face or fingerprint to continue',
            androidConfirmationRequired: false,
            androidBiometryStrength: AndroidBiometryStrength.weak,
          });
        } catch (error) {
          if (error instanceof BiometryError) {
            if (error.code !== BiometryErrorType.userCancel) {
              toast.error(error.message || 'Biometric authentication failed.');
            }
          } else {
            toast.error('Biometric authentication failed.');
          }
          return;
        }
      }
      const { latitude, longitude } = await getCurrentLocation('checkin');

      if (!isOnline) {
        const cached = loadGeofenceCache();
        const isFresh = cached && cached.employeeId === employee.id && (Date.now() - cached.timestamp) <= GEOFENCE_CACHE_TTL_MS;
        if (!isFresh || !cached?.allowed) {
          toast.error(cached?.message || 'Unable to verify location offline. Please connect to the internet.');
          return;
        }

        const platform = Capacitor.getPlatform();
        const rawUa = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
        const compactUa = rawUa.replace(/\s+/g, ' ').replace(/[^\w.\- /]/g, '').slice(0, 110);
        const deviceId = `${platform.toUpperCase()}-${compactUa}`.slice(0, 140);
        const pendingItem: PendingCheckin = {
          id: `PENDING-${Date.now()}`,
          employeeId: employee.id,
          checkType,
          latitude,
          longitude,
          deviceId,
          timestamp: new Date().toISOString(),
          customCustomer: checkType === 'in' ? data?.customerName?.trim() : undefined,
          customActivities: checkType === 'out' ? data?.activities?.trim() : undefined,
        };
        const pending = loadPendingCheckins();
        savePendingCheckins([pendingItem, ...pending]);

        const optimistic = {
          id: pendingItem.id,
          employee_id: employee.employee_id || employee.id,
          check_type: checkType,
          timestamp: pendingItem.timestamp,
          latitude,
          longitude,
          location: 'Offline (pending sync)',
        };
        queryClient.setQueryData<Checkin[]>(['checkins', employee.id], (prev = []) => [optimistic, ...prev]);
        toast.success(checkType === 'in' ? 'Checked in offline. Will sync when online.' : 'Checked out offline. Will sync when online.');
        return;
      }

      const geofenceResult = await validateCheckinRadius({ latitude, longitude, allowedRadiusMeters: 50 });
      queryClient.setQueryData(['geofence', employee.id], geofenceResult);
      saveGeofenceCache({
        employeeId: employee.id,
        allowed: geofenceResult.allowed,
        message: geofenceResult.message,
        distanceMeters: geofenceResult.distanceMeters,
        timestamp: Date.now(),
      });
      if (!geofenceResult.allowed) {
        toast.error(geofenceResult.message || 'Check in/out is allowed only inside your branch radius');
        return;
      }
      await checkinMutation.mutateAsync({
        checkType,
        latitude,
        longitude,
        customCustomer: checkType === 'in' ? data?.customerName?.trim() : undefined,
        customActivities: checkType === 'out' ? data?.activities?.trim() : undefined,
      });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Check-in failed'));
    } finally {
      setCheckinUiLoading(false);
    }
  };

  const isCheckedIn = latestCheckin?.check_type === 'in' || latestCheckin?.check_type === 'break_end';
  const nextCheckType: 'in' | 'out' = isCheckedIn ? 'out' : 'in';

  // ── Render states ──
  if (isInitializing) return <LoadingScreen />;

  if (!employee) {
    const offlineMessage = !isOnline
      ? 'Offline mode: cannot sign in without internet. If you have an active session, keep the app open.'
      : undefined;
    return (
      <LoginPage
        onLogin={handleLogin}
        isLoading={loginMutation.isPending}
        error={loginError}
        offlineMessage={offlineMessage}
      />
    );
  }

  return (
    <AppShell>
      {isAndroidNative && !isOnline && (
        <>
          <div className="offline-banner">No internet connection</div>
          <div className="offline-spacer" />
        </>
      )}
      {isAndroidNative && isOnline && showOnlineBanner && (
        <>
          <div className="offline-banner online">Back online</div>
          <div className="offline-spacer" />
        </>
      )}
      {syncBanner && (
        <>
          <div
            className={`sync-banner${syncBanner.type === 'success' ? ' success' : ''}`}
            style={{ top: isAndroidNative && (!isOnline || showOnlineBanner) ? 36 : 0 }}
          >
            {syncBanner.message}
          </div>
          <div className="sync-spacer" />
        </>
      )}
      {offlineRestoreBanner && (
        <>
          <div className="sync-banner" style={{ top: isAndroidNative && (!isOnline || showOnlineBanner) ? 36 : 0 }}>
            Offline session restored
          </div>
          <div className="sync-spacer" />
        </>
      )}
      <Navigation
        employee={employee}
        currentView={currentView}
        onNavigate={setCurrentView}
        isAndroidNative={isAndroidNative}
        isDeliveryDriver={isDeliveryDriver}
        isAccountManager={isAccountManager}
      />

      <main className="app-main">
        {currentView === 'dashboard' && (
          <Dashboard
            employee={employee}
            latestCheckin={latestCheckin}
            recentCheckins={checkins}
            onNavigate={(view) => setCurrentView(view)}
          />
        )}
        {currentView === 'scan' && (
          <ScanView
            nextCheckType={nextCheckType}
            checkinLoading={checkinUiLoading || checkinMutation.isPending}
            geoStatus={geoStatus}
            showBiometricHint={biometricEnabled && isAndroidNative}
            isAccountManager={isAccountManager}
            onCheckin={handleCheckin}
          />
        )}
        {currentView === 'history' && (
          <HistoryView
            checkins={checkins}
            selectedId={selectedHistoryId}
            onSelect={setSelectedHistoryId}
            currentEmployee={employee}
          />
        )}
        {currentView === 'delivery' && isDeliveryDriver && (
          <DeliveryPage
            fullName={employee.full_name}
            department={employee.department}
            designation={employee.designation}
            company={employee.company}
            customLocation={employee.custom_location}
            employeeId={employee.employee_id || employee.id}
          />
        )}
        {currentView === 'delivery_history' && isDeliveryDriver && (
          <DeliveryHistoryPage
            employeeId={employee.employee_id || employee.id}
            driverId={employee.id}
          />
        )}
        {currentView === 'delivery_customers' && (isDeliveryDriver || isAccountManager) && (
          <DeliveryCustomersPage />
        )}
        {currentView === 'profile' && (
          <ProfileSection
            employee={employee}
            onLogout={handleLogout}
          />
        )}
        {currentView === 'settings' && (
          <SettingsPage
            biometricEnabled={biometricEnabled}
            onBiometricToggle={handleBiometricToggle}
          />
        )}
        {currentView === 'admin' && employee.role === 'admin' && <AdminPanel />}
      </main>

      {currentView === 'settings' && <SimpleFooter />}
    </AppShell>
  );
};

export default AppLayout;

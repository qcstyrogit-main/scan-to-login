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
import type { Employee, ViewType } from '@/types';
import LoginPage from '@/components/LoginPage';
import Navigation from '@/components/Navigation';
import Dashboard from '@/components/Dashboard';
import HistoryView from '@/components/HistoryView';
import ScanView from '@/components/ScanView';
import ProfileSection from '@/components/ProfileSection';
import SettingsPage from '@/components/SettingsPage';
import DeliveryPage from '@/components/DeliveryPage';
import DeliveryHistoryPage from '@/components/DeliveryHistoryPage';
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

const AppLayout: React.FC = () => {
  const queryClient = useQueryClient();
  const [employee, setEmployee] = useState<Employee | null>(() => loadStoredEmployee());
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [isAndroidNative, setIsAndroidNative] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [loginError, setLoginError] = useState<string | undefined>(undefined);
  const [isAppVisible, setIsAppVisible] = useState(true);
  const [checkinUiLoading, setCheckinUiLoading] = useState(false);

  useEffect(() => {
    const storedBiometric = localStorage.getItem(BIOMETRIC_STORAGE_KEY);
    if (storedBiometric !== null) {
      setBiometricEnabled(storedBiometric === 'true');
    }
    setIsAndroidNative(Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android');
    setIsInitializing(false);
  }, []);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const handleVisibility = () => setIsAppVisible(document.visibilityState === 'visible');
    handleVisibility();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  const normalizedDesignation = employee?.designation?.trim().toLowerCase() || '';
  const isDeliveryDriver = normalizedDesignation === 'delivery driver';

  useEffect(() => {
    if (!employee) return;
    if (isDeliveryDriver) {
      const allowedDeliveryViews: ViewType[] = ['delivery', 'delivery_history', 'profile'];
      if (!allowedDeliveryViews.includes(currentView)) {
        setCurrentView('delivery');
      }
      return;
    }
    if (!isDeliveryDriver && (currentView === 'delivery' || currentView === 'delivery_history')) {
      setCurrentView('dashboard');
    }
  }, [employee, currentView, isDeliveryDriver]);

  useEffect(() => {
    if (!isAndroidNative && currentView === 'settings') {
      setCurrentView('dashboard');
    }
  }, [isAndroidNative, currentView]);

  useEffect(() => {
    if (employee?.role !== 'admin' && currentView === 'admin') {
      setCurrentView('dashboard');
    }
  }, [employee?.role, currentView]);

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
    onError: (err) => {
      setLoginError(getErrorMessage(err, 'Unable to sign in'));
    },
  });

  const checkinsQuery = useQuery({
    queryKey: ['checkins', employee?.id],
    queryFn: () => fetchCheckins(employee),
    enabled: !!employee,
    staleTime: 15000,
    retry: 1,
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Unable to load check-ins'));
    },
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
      return {
        checking: false,
        allowed: false,
        message: 'Checking location...',
        initialized: false,
      };
    }

    if (geofenceQuery.isError) {
      return {
        checking: false,
        allowed: false,
        message: getErrorMessage(geofenceQuery.error, 'Unable to validate location'),
        initialized: true,
      };
    }

    if (!geofenceQuery.data) {
      return {
        checking: geofenceQuery.isFetching,
        allowed: false,
        message: 'Checking location...',
        initialized: false,
      };
    }

    return {
      checking: geofenceQuery.isFetching,
      allowed: geofenceQuery.data.allowed,
      distanceMeters: geofenceQuery.data.distanceMeters,
      message: geofenceQuery.data.message,
      initialized: true,
    };
  }, [employee, currentView, geofenceQuery.data, geofenceQuery.error, geofenceQuery.isError, geofenceQuery.isFetching]);

  const checkinMutation = useMutation({
    mutationFn: async ({
      checkType,
      latitude,
      longitude,
    }: {
      checkType: 'in' | 'out';
      latitude: number;
      longitude: number;
    }) => {
      if (!employee) {
        throw new Error('Not authenticated');
      }
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
      });
    },
    onSuccess: (_checkin, variables) => {
      toast.success(variables.checkType === 'in' ? 'Checked In successfully' : 'Checked Out successfully');
      queryClient.invalidateQueries({ queryKey: ['checkins', employee?.id] });
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Check-in failed'));
    },
  });

  useEffect(() => {
    if (currentView !== 'history') return;
    if (selectedHistoryId) {
      const hasSelected = checkins.some(
        (checkin) =>
          checkin.id === selectedHistoryId &&
          Number.isFinite(checkin.latitude) &&
          Number.isFinite(checkin.longitude)
      );
      if (hasSelected) return;
    }
    const firstWithCoords = checkins.find(
      (checkin) => Number.isFinite(checkin.latitude) && Number.isFinite(checkin.longitude)
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

  const handleCheckin = async (checkType: 'in' | 'out') => {
    if (!employee) return;

    try {
      setCheckinUiLoading(true);
      const requireBiometric = biometricEnabled && isAndroidNative;
      if (requireBiometric) {
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
      const geofenceResult = await validateCheckinRadius({
        latitude,
        longitude,
        allowedRadiusMeters: 50,
      });
      queryClient.setQueryData(['geofence', employee.id], geofenceResult);
      if (!geofenceResult.allowed) {
        toast.error(geofenceResult.message || 'Check in/out is allowed only inside your branch radius');
        return;
      }

      await checkinMutation.mutateAsync({ checkType, latitude, longitude });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Check-in failed'));
    } finally {
      setCheckinUiLoading(false);
    }
  };

  const isCheckedIn = latestCheckin?.check_type === 'in' || latestCheckin?.check_type === 'break_end';
  const nextCheckType: 'in' | 'out' = isCheckedIn ? 'out' : 'in';

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  if (!employee) {
    return (
      <LoginPage
        onLogin={handleLogin}
        isLoading={loginMutation.isPending}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <Navigation
        employee={employee}
        currentView={currentView}
        onNavigate={setCurrentView}
        onLogout={handleLogout}
        isAndroidNative={isAndroidNative}
        isDeliveryDriver={isDeliveryDriver}
      />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
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
            onCheckin={handleCheckin}
          />
        )}

        {currentView === 'history' && (
          <HistoryView
            checkins={checkins}
            selectedId={selectedHistoryId}
            onSelect={setSelectedHistoryId}
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

        {currentView === 'profile' && <ProfileSection employee={employee} />}

        {currentView === 'settings' && (
          <SettingsPage
            biometricEnabled={biometricEnabled}
            onBiometricToggle={handleBiometricToggle}
          />
        )}

        {currentView === 'admin' && employee.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold">A</span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Admin Dashboard</h2>
                  <p className="text-slate-300">Monitor all employee check-ins</p>
                </div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
              <p className="text-slate-500">Admin panel with employee monitoring</p>
              <p className="text-sm text-slate-400 mt-1">View all employees and their check-in status</p>
            </div>
          </div>
        )}
      </main>

      <SimpleFooter />
    </div>
  );
};

export default AppLayout;

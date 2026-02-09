import React, { useState, useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Clock, LogIn, LogOut, Coffee, Play, Camera, QrCode, Check, X, Loader2, Home, User, Users, Menu, MapPin, Calendar, Timer, ArrowRight, Filter, Download, Search, RefreshCw, Building2, Mail, Phone, Shield, Eye, EyeOff, Zap } from 'lucide-react';
import { erpRequest, extractErrorMessage, setErpSid } from '@/lib/erpApi';
import { toast } from '@/components/ui/sonner';
import { getCurrentLocation } from '@/lib/location';
import type { Checkin } from '@/types';
import HistoryMap from '@/components/HistoryMap';

interface Employee {
  id: string;
  email: string;
  full_name: string;
  department: string;
  company?: string;
  custom_location?: string;
  designation?: string;
  role: 'employee' | 'admin';
  avatar_url?: string;
  phone?: string;
  latestCheckin?: Checkin;
}

type ViewType = 'dashboard' | 'scan' | 'history' | 'profile' | 'admin';

const AppLayout: React.FC = () => {
  const GEOFENCE_CHECK_INTERVAL_MS = 5000;
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [latestCheckin, setLatestCheckin] = useState<Checkin | undefined>(undefined);
  const [checkins, setCheckins] = useState<Checkin[]>([]);
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [loading, setLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [geoStatus, setGeoStatus] = useState<{
    checking: boolean;
    allowed: boolean;
    message: string;
    distanceMeters?: number;
    initialized: boolean;
  }>({
    checking: false,
    allowed: false,
    message: 'Checking location...',
    initialized: false,
  });

  const buildEmployeeFromErp = (user: any, loginEmail: string, context: any = {}): Employee => {
    const userObj = typeof user === 'object' && user ? user : {};
    const source = { ...context, ...userObj };
    const fallbackId = typeof user === 'string' ? user : undefined;
    const fallbackEmail = typeof user === 'string' && user.includes('@') ? user : undefined;
    const userId = source?.name || source?.user || source?.email || fallbackId || loginEmail;
    const userEmail = source?.email || fallbackEmail || loginEmail;
    const baseName = typeof user === 'string' ? user.split('@')[0] : undefined;
    const fullName = source?.full_name || source?.fullName || baseName || loginEmail.split('@')[0] || 'Employee';
    const department = source?.department || source?.dept || 'General';
    const company = source?.company || '-';
    const customLocation = source?.custom_location || '-';
    const designation = source?.designation || '-';
    const isAdmin = userId === 'Administrator' || source?.user_type === 'System User';
    return {
      id: userId,
      email: userEmail,
      full_name: fullName,
      department,
      company,
      custom_location: customLocation,
      designation,
      role: isAdmin ? 'admin' : 'employee',
    };
  };

  const erpLogin = async (loginEmail: string, loginPassword: string): Promise<Employee> => {
    const loginRes = await erpRequest('/api/method/qcmc_logic.api.login_scan.login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: { username: loginEmail, password: loginPassword }
    });

    const loginData = loginRes.data;
    const payload = loginData?.message ?? loginData;
    if (!loginRes.ok) {
      throw new Error(extractErrorMessage(payload, `Login failed (HTTP ${loginRes.status})`));
    }
    if (!payload?.success) {
      throw new Error(extractErrorMessage(payload, 'Invalid credentials or empty ERP response'));
    }
    setErpSid(payload?.sid || loginData?.sid || '');

    const userSource = payload?.user || loginData?.user || loginEmail;
    const emp = buildEmployeeFromErp(userSource, loginEmail, { ...loginData, ...payload });
    const fullName = loginData?.full_name || payload?.full_name;
    if (fullName) {
      emp.full_name = fullName;
    }
    return emp;
  };

  useEffect(() => {
    const storedEmployee = localStorage.getItem('employee');
    if (storedEmployee) {
      const emp = JSON.parse(storedEmployee);
      setEmployee(emp);
      fetchCheckins();
    }
    setLoading(false);
  }, []);

  const mapErpCheckType = (value: any): Checkin['check_type'] => {
    const text = String(value || '').toLowerCase();
    if (text === 'in' || text === 'check in') return 'in';
    if (text === 'out' || text === 'check out') return 'out';
    return 'out';
  };

  const toNumber = (value: any) => {
    const num = Number(value);
    return Number.isFinite(num) ? num : undefined;
  };

  const fetchCheckins = async () => {
    try {
      const res = await erpRequest('/api/method/qcmc_logic.api.login_scan.get_checkin_history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {}
      });

      const raw = res.data?.message ?? res.data;
      const list = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.data)
          ? raw.data
          : Array.isArray(raw?.checkins)
            ? raw.checkins
            : [];

      const normalized: Checkin[] = list.map((item: any, idx: number) => ({
        id: item?.name || item?.id || `CHK-HIST-${idx}`,
        employee_id: item?.employee || item?.employee_id || employee?.id || '',
        check_type: mapErpCheckType(item?.log_type || item?.check_type || item?.type),
        timestamp: item?.time || item?.timestamp || item?.creation || new Date().toISOString(),
        location:
          item?.custom_location_name ||
          item?.location_name ||
          item?.custom_location ||
          item?.location ||
          item?.branch ||
          undefined,
        scan_code: item?.scan_code || item?.name || undefined,
        latitude: toNumber(item?.latitude ?? item?.lat),
        longitude: toNumber(item?.longitude ?? item?.lng)
      }));

      const sorted = normalized.sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      setCheckins(sorted);
      setLatestCheckin(sorted[0]);
    } catch (err) {
      console.error('Error fetching checkins:', err);
      setCheckins([]);
      setLatestCheckin(undefined);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoginLoading(true);
    try {
      const emp = await erpLogin(email, password);
      setEmployee(emp);
      setLatestCheckin(undefined);
      localStorage.setItem('employee', JSON.stringify(emp));
      fetchCheckins();
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Connection error';
      setError(String(msg));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setEmployee(null);
    setLatestCheckin(undefined);
    setCheckins([]);
    setCurrentView('dashboard');
    localStorage.removeItem('employee');
    setErpSid('');
  };

  const refreshGeofenceStatus = async () => {
    if (!employee) return;
    setGeoStatus((prev) => ({ ...prev, checking: true }));
    try {
      const { latitude, longitude } = await getCurrentLocation('checkin');
      const res = await erpRequest('/api/method/qcmc_logic.api.login_scan.validate_checkin_radius', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          latitude,
          longitude,
          allowed_radius_meters: 50
        }
      });
      const data = res.data?.message ?? res.data;
      const rawAllowed = data?.allowed;
      const allowed =
        rawAllowed === true ||
        rawAllowed === 'true' ||
        rawAllowed === 1 ||
        rawAllowed === '1';
      const distance = Number(data?.distance_meters);
      setGeoStatus({
        checking: false,
        allowed,
        distanceMeters: Number.isFinite(distance) ? distance : undefined,
        initialized: true,
        message: allowed
          ? 'Inside allowed area'
          : (extractErrorMessage(data, 'Outside allowed area')),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to validate location';
      setGeoStatus((prev) => ({
        checking: false,
        allowed: prev.initialized ? prev.allowed : false,
        initialized: prev.initialized,
        distanceMeters: prev.distanceMeters,
        message: msg,
      }));
    }
  };

  useEffect(() => {
    if (!employee || currentView !== 'scan') return;
    refreshGeofenceStatus();
    const interval = setInterval(refreshGeofenceStatus, GEOFENCE_CHECK_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [employee, currentView]);

  const handleCheckin = async (checkType: 'in' | 'out' | 'break_start' | 'break_end') => {
    if (!employee) return;
    setCheckinLoading(true);
    try {
      if (!geoStatus.allowed) {
        throw new Error(geoStatus.message || 'Check in/out is allowed only inside your branch radius');
      }
      const { latitude, longitude } = await getCurrentLocation('checkin');
      const platform = Capacitor.getPlatform();
      const rawUa = typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown';
      const compactUa = rawUa.replace(/\s+/g, ' ').replace(/[^\w.\- /]/g, '').slice(0, 110);
      const deviceId = `${platform.toUpperCase()}-${compactUa}`.slice(0, 140);

      const logType = checkType === 'out' || checkType === 'break_start' ? 'OUT' : 'IN';
      const res = await erpRequest('/api/method/qcmc_logic.api.login_scan.create_employee_checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          log_type: logType,
          latitude,
          longitude,
          device_id: deviceId
        }
      });

      const data = res.data;
      const payload = data?.message ?? data;
      if (!res.ok) {
        throw new Error(extractErrorMessage(payload, `Check-in failed (HTTP ${res.status})`));
      }
      if (!payload?.success) {
        throw new Error(extractErrorMessage(payload, 'Check-in failed or empty ERP response'));
      }

      const checkin: Checkin = {
        id: payload?.checkin || `CHK-${Date.now()}`,
        employee_id: payload?.employee || employee.id,
        check_type: checkType,
        timestamp: payload?.time || new Date().toISOString(),
        location:
          payload?.custom_location_name ||
          payload?.location_name ||
          payload?.custom_location ||
          payload?.location ||
          payload?.branch ||
          undefined,
        scan_code: `SCAN-${Date.now()}`,
        latitude,
        longitude
      };

      setLatestCheckin(checkin);
      setCheckins(prev => [checkin, ...prev]);
      toast.success(checkType === 'in' ? 'Checked In successfully' : 'Checked Out successfully');
      await fetchCheckins();
    } catch (err) {
      console.error('Checkin error:', err);
      const msg = err instanceof Error ? err.message : 'Check-in failed';
      setError(msg);
      window.alert(msg);
    } finally {
      setCheckinLoading(false);
    }
  };

  const formatTime = (timestamp: string) => new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (timestamp: string) => new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase();

  const getStatus = () => {
    if (!latestCheckin) return { status: 'Not Checked In', color: 'bg-slate-100 text-slate-600', icon: Clock };
    const map: Record<string, { status: string; color: string; icon: any }> = {
      in: { status: 'Checked In', color: 'bg-green-100 text-green-700', icon: LogIn },
      out: { status: 'Checked Out', color: 'bg-red-100 text-red-700', icon: LogOut },
      break_start: { status: 'On Break', color: 'bg-amber-100 text-amber-700', icon: Coffee },
      break_end: { status: 'Working', color: 'bg-blue-100 text-blue-700', icon: Clock },
    };
    return map[latestCheckin.check_type] || map.out;
  };

  const isCheckedIn =
    latestCheckin?.check_type === 'in' || latestCheckin?.check_type === 'break_end';
  const nextCheckType: 'in' | 'out' = isCheckedIn ? 'out' : 'in';

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
      (checkin) =>
        Number.isFinite(checkin.latitude) && Number.isFinite(checkin.longitude)
    );
    setSelectedHistoryId(firstWithCoords?.id ?? null);
  }, [currentView, checkins, selectedHistoryId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-slate-600 font-medium">Loading...</p>
        </div>
      </div>
    );
  }

  // LOGIN PAGE
  if (!employee) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
          <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl"></div>
          <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-7 h-7 text-white" />
              </div>
              <span className="text-2xl font-bold text-white">GeoTime QCMC</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
              Streamline Your<br />
              <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">Employee Check-ins</span>
            </h1>
            <p className="text-lg text-slate-300 mb-12 max-w-md">Fast, secure, and effortless time tracking with a single click.</p>
            <div className="grid grid-cols-2 gap-6">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <Zap className="w-8 h-8 text-yellow-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">Instant Login</h3>
                <p className="text-slate-400 text-sm">Check in within seconds</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
                <Shield className="w-8 h-8 text-green-400 mb-3" />
                <h3 className="text-white font-semibold mb-1">Secure</h3>
                <p className="text-slate-400 text-sm">Enterprise-grade security</p>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-white">GeoTime QCMC</span>
            </div>
            <div className="bg-white rounded-2xl shadow-2xl p-8">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
                <p className="text-slate-500 mt-2">Sign in to your account</p>
              </div>
              <form onSubmit={handleLogin} className="space-y-5">
                {error && <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">{error}</div>}
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Email Address</label>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none" placeholder="you@company.com" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">Password</label>
                  <div className="relative">
                    <input type={showPassword ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none pr-12" placeholder="Enter your password" required />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <button type="submit" disabled={loginLoading} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loginLoading ? <><Loader2 className="w-5 h-5 animate-spin" />Signing in...</> : 'Sign In'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const status = getStatus();
  const StatusIcon = status.icon;
  const navItems = [
    { id: 'dashboard' as ViewType, label: 'Dashboard', icon: Home },
    { id: 'scan' as ViewType, label: 'In / Out', icon: LogIn },
    { id: 'history' as ViewType, label: 'History', icon: Clock },
    { id: 'profile' as ViewType, label: 'Profile', icon: User },
    ...(employee.role === 'admin' ? [{ id: 'admin' as ViewType, label: 'Admin', icon: Users }] : []),
  ];

  // MAIN APP
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      {/* Navigation */}
      <nav className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800 hidden sm:block">GeoTime QCMC</span>
            </div>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setCurrentView(id)} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${currentView === id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                  <Icon className="w-5 h-5" />{label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="text-right">
                  <p className="text-sm font-medium text-slate-800">{employee.full_name}</p>
                  <p className="text-xs text-slate-500">{employee.department}</p>
                </div>
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white font-semibold">{getInitials(employee.full_name)}</div>
              </div>
              <button onClick={handleLogout} className="hidden md:flex items-center gap-2 px-4 py-2 text-slate-600 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors">
                <LogOut className="w-5 h-5" /><span className="font-medium">Logout</span>
              </button>
              <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg">
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-2 py-2 space-y-1">
            {navItems.map(({ id, label, icon: Icon }) => (
              <button key={id} onClick={() => { setCurrentView(id); setMobileMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium ${currentView === id ? 'bg-blue-50 text-blue-600' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="w-5 h-5" />{label}
              </button>
            ))}
            <button onClick={() => { handleLogout(); setMobileMenuOpen(false); }} className="w-full flex items-center gap-3 px-4 py-3 rounded-lg font-medium text-red-600 hover:bg-red-50">
              <LogOut className="w-5 h-5" />Logout
            </button>
          </div>
        )}
      </nav>

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        {/* Dashboard View */}
        {currentView === 'dashboard' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl p-6 text-white">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-blue-100 mb-1">Welcome back,</p>
                  <h1 className="text-2xl font-bold mb-2">{employee.full_name}</h1>
                  <p className="text-blue-100">{employee.department} • {employee.role === 'admin' ? 'Administrator' : 'Employee'}</p>
                </div>
                <div className="text-right">
                  <p className="text-blue-100 text-sm">{new Date().toLocaleDateString('en-US', { weekday: 'long' })}</p>
                  <p className="text-xl font-semibold">{new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</p>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.color}`}><StatusIcon className="w-6 h-6" /></div>
                  <div><p className="text-slate-500 text-sm">Current Status</p><p className="font-semibold text-slate-800">{status.status}</p></div>
                </div>
                {latestCheckin && <p className="text-sm text-slate-500">Since {formatTime(latestCheckin.timestamp)}</p>}
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center"><Timer className="w-6 h-6 text-purple-600" /></div>
                  <div><p className="text-slate-500 text-sm">Today's Activity</p><p className="font-semibold text-slate-800">{checkins.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length} check-ins</p></div>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center"><LogIn className="w-6 h-6 text-green-600" /></div>
                  <div><p className="text-slate-500 text-sm">Quick Action</p><p className="font-semibold text-slate-800">Ready for In / Out</p></div>
                </div>
                <button onClick={() => setCurrentView('scan')} className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                  Go to In / Out <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3"><Calendar className="w-5 h-5 text-slate-400" /><h2 className="font-semibold text-slate-800">Recent Activity</h2></div>
                <button onClick={() => setCurrentView('history')} className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1">View All <ArrowRight className="w-4 h-4" /></button>
              </div>
              <div className="divide-y divide-slate-100">
                {checkins.slice(0, 5).length > 0 ? checkins.slice(0, 5).map((checkin) => {
                  const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
                    in: { icon: LogIn, color: 'text-green-600 bg-green-100', label: 'Checked In' },
                    out: { icon: LogOut, color: 'text-red-600 bg-red-100', label: 'Checked Out' },
                    break_start: { icon: Coffee, color: 'text-amber-600 bg-amber-100', label: 'Started Break' },
                    break_end: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Ended Break' },
                  };
                  const config = typeConfig[checkin.check_type] || typeConfig.in;
                  const Icon = config.icon;
                  return (
                    <div key={checkin.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}><Icon className="w-5 h-5" /></div>
                      <div className="flex-1"><p className="font-medium text-slate-800">{config.label}</p></div>
                      <div className="text-right"><p className="font-medium text-slate-800">{formatTime(checkin.timestamp)}</p><p className="text-sm text-slate-500">{formatDate(checkin.timestamp)}</p></div>
                    </div>
                  );
                }) : (
                  <div className="px-6 py-12 text-center"><Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No recent activity</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Scan View */}
        {currentView === 'scan' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center"><QrCode className="w-6 h-6 text-white" /></div>
                  <div><h2 className="text-xl font-bold text-white">Quick Check-in</h2><p className="text-blue-100 text-sm">Tap to {nextCheckType === 'in' ? 'check in' : 'check out'}</p></div>
                </div>
              </div>
              <div className="p-6">
                <button
                  onClick={() => handleCheckin(nextCheckType)}
                  disabled={!geoStatus.allowed || checkinLoading}
                  className={`w-full flex flex-col items-center gap-3 p-8 rounded-xl text-white transition-all ${
                    nextCheckType === 'in'
                      ? 'bg-green-500 hover:bg-green-600'
                      : 'bg-red-500 hover:bg-red-600'
                  } ${!geoStatus.allowed || checkinLoading ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                <p className={`mt-4 text-sm ${geoStatus.allowed ? 'text-green-600' : 'text-red-600'}`}>
                  {!geoStatus.initialized ? 'Checking location...' : geoStatus.message}
                  {geoStatus.distanceMeters !== undefined ? ` (${geoStatus.distanceMeters.toFixed(1)}m)` : ''}
                </p>
                {/* <div className="mt-6 flex items-center gap-2 text-slate-500 text-sm"><MapPin className="w-4 h-4" /><span>Location: Main Office</span></div> */}
              </div>
            </div>
          </div>
        )}

        {/* History View */}
        {currentView === 'history' && (
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
              <h2 className="text-xl font-bold text-slate-800">Check-in History</h2>
              <p className="text-slate-500 text-sm mt-1">View your attendance records</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              <HistoryMap checkins={checkins} selectedId={selectedHistoryId} />
              <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100 lg:max-h-[28rem] lg:overflow-y-auto">
                {checkins.length > 0 ? checkins.map((checkin) => {
                  const typeConfig: Record<string, { icon: any; color: string; label: string }> = {
                    in: { icon: LogIn, color: 'text-green-600 bg-green-100', label: 'Checked In' },
                    out: { icon: LogOut, color: 'text-red-600 bg-red-100', label: 'Checked Out' },
                    break_start: { icon: Coffee, color: 'text-amber-600 bg-amber-100', label: 'Started Break' },
                    break_end: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Ended Break' },
                  };
                  const config = typeConfig[checkin.check_type] || typeConfig.in;
                  const Icon = config.icon;
                  const isSelected = checkin.id === selectedHistoryId;
                  return (
                    <button
                      key={checkin.id}
                      type="button"
                      onClick={() => setSelectedHistoryId(checkin.id)}
                      className={`w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-blue-50/60' : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}><Icon className="w-5 h-5" /></div>
                      <div className="flex-1"><p className="font-medium text-slate-800">{config.label}</p></div>
                      <div className="text-right"><p className="font-medium text-slate-800">{formatTime(checkin.timestamp)}</p><p className="text-sm text-slate-500">{formatDate(checkin.timestamp)}</p></div>
                    </button>
                  );
                }) : (
                  <div className="px-6 py-12 text-center"><Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" /><p className="text-slate-500">No history yet</p></div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Profile View */}
        {currentView === 'profile' && (
          <div className="max-w-2xl mx-auto">
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
              <div className="h-32 bg-gradient-to-r from-blue-600 to-blue-700 relative">
                <div className="absolute -bottom-12 left-6">
                  <div className="w-24 h-24 bg-white rounded-2xl shadow-lg flex items-center justify-center border-4 border-white">
                    <span className="text-3xl font-bold text-blue-600">{getInitials(employee.full_name)}</span>
                  </div>
                </div>
              </div>
              <div className="pt-16 pb-6 px-6">
                <h2 className="text-2xl font-bold text-slate-800">{employee.full_name}</h2>
                <p className="text-slate-500">{employee.department}</p>
                <span className={`inline-block mt-2 px-3 py-1.5 rounded-full text-sm font-medium ${employee.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                  {employee.role === 'admin' ? 'Administrator' : 'Employee'}
                </span>
              </div>
              <div className="px-6 pb-6 space-y-4">
                {[employee.company, employee.custom_location, employee.department, employee.designation].map((value, idx) => (
                  <div key={idx} className="p-4 bg-slate-50 rounded-xl">
                    <span className="text-slate-700">{value || '-'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Admin View */}
        {currentView === 'admin' && employee.role === 'admin' && (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center"><Users className="w-7 h-7" /></div>
                <div><h2 className="text-2xl font-bold">Admin Dashboard</h2><p className="text-slate-300">Monitor all employee check-ins</p></div>
              </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6 text-center">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">Admin panel with employee monitoring</p>
              <p className="text-sm text-slate-400 mt-1">View all employees and their check-in status</p>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-slate-900 text-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center"><Clock className="w-5 h-5 text-white" /></div>
              <span className="font-bold">GeoTime QCMC</span>
            </div>
            <p className="text-slate-400 text-sm">© 2026 GeoTime QCMC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AppLayout;

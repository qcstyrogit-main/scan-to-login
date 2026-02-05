import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Employee, Checkin } from '@/types';
import { Clock, Shield, Users, Zap, Eye, EyeOff, Loader2 } from 'lucide-react';
import { erpRequest, extractErrorMessage } from '@/lib/erpApi';

interface LoginPageProps {
  onLogin: (employee: Employee, latestCheckin?: Checkin) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const buildEmployeeFromErp = (user: any, loginEmail: string): Employee => {
    const userId = typeof user === 'string' ? user : (user?.name || user?.user || user?.email || loginEmail);
    const userEmail = user?.email || (typeof user === 'string' && user.includes('@') ? user : loginEmail);
    const baseName = typeof user === 'string' ? user.split('@')[0] : undefined;
    const fullName = user?.full_name || user?.fullName || baseName || loginEmail.split('@')[0] || 'Employee';
    const department = user?.department || user?.dept || 'General';
    const isAdmin = userId === 'Administrator' || user?.user_type === 'System User';
    return {
      id: userId,
      email: userEmail,
      full_name: fullName,
      department,
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

    const userSource = payload?.user || loginEmail;
    const emp = buildEmployeeFromErp(userSource, loginEmail);
    const fullName = loginData?.full_name || payload?.full_name;
    if (fullName) {
      emp.full_name = fullName;
    }
    return emp;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (rememberMe) {
        localStorage.setItem('rememberedEmail', email);
      } else {
        localStorage.removeItem('rememberedEmail');
      }

      const emp = await erpLogin(email, password);
      onLogin(emp, undefined);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(String(msg));
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    const remembered = localStorage.getItem('rememberedEmail');
    if (remembered) {
      setEmail(remembered);
      setRememberMe(true);
    }
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 flex">
      {/* Left side - Hero */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-center px-12 xl:px-20 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 to-purple-600/20"></div>
        <div className="absolute top-20 left-20 w-72 h-72 bg-blue-500/30 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-7 h-7 text-white" />
            </div>
            <span className="text-2xl font-bold text-white">TimeTrack Pro</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-bold text-white mb-6 leading-tight">
            Streamline Your<br />
            <span className="bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
              Employee Check-ins
            </span>
          </h1>
          
          <p className="text-lg text-slate-300 mb-12 max-w-md">
            Fast, secure, and effortless time tracking with QR code scanning technology.
          </p>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <Zap className="w-8 h-8 text-yellow-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Instant Scan</h3>
              <p className="text-slate-400 text-sm">Check in within seconds using QR codes</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <Shield className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Secure</h3>
              <p className="text-slate-400 text-sm">Enterprise-grade security for your data</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <Users className="w-8 h-8 text-blue-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Team View</h3>
              <p className="text-slate-400 text-sm">Real-time visibility of your team</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-5 border border-white/10">
              <Clock className="w-8 h-8 text-purple-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">Time Tracking</h3>
              <p className="text-slate-400 text-sm">Accurate hours logging automatically</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
              <Clock className="w-6 h-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">TimeTrack Pro</span>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">Welcome Back</h2>
              <p className="text-slate-500 mt-2">Sign in to your account to continue</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
                  placeholder="you@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none pr-12"
                    placeholder="Enter your password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-slate-600">Remember me</span>
                </label>
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  'Sign In'
                )}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-slate-100">
              <p className="text-center text-sm text-slate-500">
                Demo credentials:
              </p>
              <div className="mt-2 bg-slate-50 rounded-lg p-3 text-sm">
                <p className="text-slate-600"><strong>Admin:</strong> admin@company.com / admin123</p>
                <p className="text-slate-600"><strong>Employee:</strong> john.doe@company.com / password123</p>
              </div>
            </div>
          </div>

          <p className="text-center text-slate-400 text-sm mt-6">
            © 2026 TimeTrack Pro. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

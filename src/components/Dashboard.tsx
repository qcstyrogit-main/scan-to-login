import React from 'react';
import { Employee, Checkin } from '@/types';
import { Clock, LogIn, LogOut, Coffee, TrendingUp, Calendar, Timer, ArrowRight } from 'lucide-react';

interface DashboardProps {
  employee: Employee;
  latestCheckin?: Checkin;
  recentCheckins: Checkin[];
  onNavigate: (view: 'scan' | 'history') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ employee, latestCheckin, recentCheckins, onNavigate }) => {
  const getCurrentStatus = () => {
    if (!latestCheckin) return { status: 'Not Checked In', color: 'bg-slate-100 text-slate-600', icon: Clock };
    switch (latestCheckin.check_type) {
      case 'in':
        return { status: 'Checked In', color: 'bg-green-100 text-green-700', icon: LogIn };
      case 'out':
        return { status: 'Checked Out', color: 'bg-red-100 text-red-700', icon: LogOut };
      case 'break_start':
        return { status: 'On Break', color: 'bg-amber-100 text-amber-700', icon: Coffee };
      case 'break_end':
        return { status: 'Back from Break', color: 'bg-blue-100 text-blue-700', icon: Clock };
      default:
        return { status: 'Unknown', color: 'bg-slate-100 text-slate-600', icon: Clock };
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const calculateTodayHours = () => {
    const today = new Date().toDateString();
    const todayCheckins = recentCheckins.filter(
      c => new Date(c.timestamp).toDateString() === today
    );
    
    let totalMinutes = 0;
    let checkInTime: Date | null = null;
    
    for (const checkin of todayCheckins.reverse()) {
      if (checkin.check_type === 'in' && !checkInTime) {
        checkInTime = new Date(checkin.timestamp);
      } else if (checkin.check_type === 'out' && checkInTime) {
        totalMinutes += (new Date(checkin.timestamp).getTime() - checkInTime.getTime()) / 60000;
        checkInTime = null;
      }
    }
    
    if (checkInTime) {
      totalMinutes += (new Date().getTime() - checkInTime.getTime()) / 60000;
    }
    
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${hours}h ${minutes}m`;
  };

  const status = getCurrentStatus();
  const StatusIcon = status.icon;

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
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

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Current Status */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${status.color}`}>
              <StatusIcon className="w-6 h-6" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Current Status</p>
              <p className="font-semibold text-slate-800">{status.status}</p>
            </div>
          </div>
          {latestCheckin && (
            <p className="text-sm text-slate-500">
              Since {formatTime(latestCheckin.timestamp)}
            </p>
          )}
        </div>

        {/* Today's Hours */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <Timer className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Today's Hours</p>
              <p className="font-semibold text-slate-800">{calculateTodayHours()}</p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {recentCheckins.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length} activities today
          </p>
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center">
              <TrendingUp className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Quick Action</p>
              <p className="font-semibold text-slate-800">Ready to scan</p>
            </div>
          </div>
          <button
            onClick={() => onNavigate('scan')}
            className="w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
          >
            Scan Now <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Recent Activity</h2>
          </div>
          <button
            onClick={() => onNavigate('history')}
            className="text-blue-600 text-sm font-medium hover:text-blue-700 flex items-center gap-1"
          >
            View All <ArrowRight className="w-4 h-4" />
          </button>
        </div>
        <div className="divide-y divide-slate-100">
          {recentCheckins.slice(0, 5).length > 0 ? (
            recentCheckins.slice(0, 5).map((checkin) => {
              const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string }> = {
                in: { icon: LogIn, color: 'text-green-600 bg-green-100', label: 'Checked In' },
                out: { icon: LogOut, color: 'text-red-600 bg-red-100', label: 'Checked Out' },
                break_start: { icon: Coffee, color: 'text-amber-600 bg-amber-100', label: 'Started Break' },
                break_end: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Ended Break' },
              };
              const config = typeConfig[checkin.check_type] || typeConfig.in;
              const Icon = config.icon;

              return (
                <div key={checkin.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{config.label}</p>
                    <p className="text-sm text-slate-500">{checkin.location || 'Main Office'}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">{formatTime(checkin.timestamp)}</p>
                    <p className="text-sm text-slate-500">{formatDate(checkin.timestamp)}</p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No recent activity</p>
              <p className="text-sm text-slate-400">Your check-ins will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;

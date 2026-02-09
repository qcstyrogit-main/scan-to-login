import React, { useState } from 'react';
import { Checkin } from '@/types';
import { Clock, LogIn, LogOut, Coffee, Calendar, Filter, Search, Download } from 'lucide-react';

interface CheckinHistoryProps {
  checkins: Checkin[];
}

const CheckinHistory: React.FC<CheckinHistoryProps> = ({ checkins }) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchDate, setSearchDate] = useState('');

  const typeConfig: Record<string, { icon: React.ElementType; color: string; label: string; bgColor: string }> = {
    in: { icon: LogIn, color: 'text-green-600', bgColor: 'bg-green-100', label: 'Checked In' },
    out: { icon: LogOut, color: 'text-red-600', bgColor: 'bg-red-100', label: 'Checked Out' },
    break_start: { icon: Coffee, color: 'text-amber-600', bgColor: 'bg-amber-100', label: 'Started Break' },
    break_end: { icon: Clock, color: 'text-blue-600', bgColor: 'bg-blue-100', label: 'Ended Break' },
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatShortDate = (timestamp: string) => {
    return new Date(timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const filteredCheckins = checkins.filter(checkin => {
    if (filter !== 'all' && checkin.check_type !== filter) return false;
    if (searchDate) {
      const checkinDate = new Date(checkin.timestamp).toISOString().split('T')[0];
      if (checkinDate !== searchDate) return false;
    }
    return true;
  });

  // Group checkins by date
  const groupedCheckins = filteredCheckins.reduce((groups, checkin) => {
    const date = new Date(checkin.timestamp).toDateString();
    if (!groups[date]) {
      groups[date] = [];
    }
    groups[date].push(checkin);
    return groups;
  }, {} as Record<string, Checkin[]>);

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Location', 'Code'];
    const rows = filteredCheckins.map(c => [
      formatDate(c.timestamp),
      formatTime(c.timestamp),
      typeConfig[c.check_type]?.label || c.check_type,
      c.location || 'N/A',
      c.scan_code || 'N/A'
    ]);
    
    const csvContent = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `checkin-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-800">Check-in History</h2>
            <p className="text-slate-500 text-sm mt-1">View and export your attendance records</p>
          </div>
          <button
            onClick={exportToCSV}
            className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors font-medium text-sm"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mt-6">
          <div className="flex items-center gap-2 flex-1">
            <Filter className="w-5 h-5 text-slate-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white"
            >
              <option value="all">All Types</option>
              <option value="in">Check In</option>
              <option value="out">Check Out</option>
              <option value="break_start">Break Start</option>
              <option value="break_end">Break End</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <input
              type="date"
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
              className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
            />
            {searchDate && (
              <button
                onClick={() => setSearchDate('')}
                className="px-3 py-2 text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Object.entries(typeConfig).map(([type, config]) => {
          const count = checkins.filter(c => c.check_type === type).length;
          const Icon = config.icon;
          return (
            <div key={type} className="bg-white rounded-xl shadow-sm border border-slate-100 p-4">
              <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center mb-3`}>
                <Icon className={`w-5 h-5 ${config.color}`} />
              </div>
              <p className="text-2xl font-bold text-slate-800">{count}</p>
              <p className="text-sm text-slate-500">{config.label}</p>
            </div>
          );
        })}
      </div>

      {/* History List */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        {Object.keys(groupedCheckins).length > 0 ? (
          Object.entries(groupedCheckins).map(([date, dayCheckins]) => (
            <div key={date}>
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
                <p className="font-semibold text-slate-700">{formatDate(dayCheckins[0].timestamp)}</p>
              </div>
              <div className="divide-y divide-slate-100">
                {dayCheckins.map((checkin) => {
                  const config = typeConfig[checkin.check_type] || typeConfig.in;
                  const Icon = config.icon;
                  return (
                    <div key={checkin.id} className="px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors">
                      <div className={`w-10 h-10 rounded-lg ${config.bgColor} flex items-center justify-center flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-800">{config.label}</p>
                        {/* <p className="text-sm text-slate-500 truncate">
                          {checkin.location || 'Main Office'}
                          {checkin.scan_code && ` • Code: ${checkin.scan_code.slice(0, 12)}...`}
                        </p> */}
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-medium text-slate-800">{formatTime(checkin.timestamp)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        ) : (
          <div className="px-6 py-16 text-center">
            <Search className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">No records found</p>
            <p className="text-sm text-slate-400">Try adjusting your filters</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CheckinHistory;

import React from 'react';
import { Checkin } from '@/types';
import { Clock, LogIn, LogOut, Coffee } from 'lucide-react';
import HistoryMap from '@/components/HistoryMap';

interface HistoryViewProps {
  checkins: Checkin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const HistoryView: React.FC<HistoryViewProps> = ({ checkins, selectedId, onSelect }) => {
  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <h2 className="text-xl font-bold text-slate-800">Check-in History</h2>
        <p className="text-slate-500 text-sm mt-1">View your attendance records</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <HistoryMap checkins={checkins} selectedId={selectedId} />
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden divide-y divide-slate-100 max-h-[22rem] overflow-y-auto">
          {checkins.length > 0 ? (
            checkins.map((checkin) => {
              const typeConfig: Record<
                string,
                { icon: React.ElementType; color: string; label: string }
              > = {
                in: { icon: LogIn, color: 'text-green-600 bg-green-100', label: 'Checked In' },
                out: { icon: LogOut, color: 'text-red-600 bg-red-100', label: 'Checked Out' },
                break_start: { icon: Coffee, color: 'text-amber-600 bg-amber-100', label: 'Started Break' },
                break_end: { icon: Clock, color: 'text-blue-600 bg-blue-100', label: 'Ended Break' },
              };
              const config = typeConfig[checkin.check_type] || typeConfig.in;
              const Icon = config.icon;
              const isSelected = checkin.id === selectedId;

              return (
                <button
                  key={checkin.id}
                  type="button"
                  onClick={() => onSelect(checkin.id)}
                  className={`w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors ${
                    isSelected ? 'bg-blue-50/60' : ''
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${config.color}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-slate-800">{config.label}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-slate-800">{formatTime(checkin.timestamp)}</p>
                    <p className="text-sm text-slate-500">{formatDate(checkin.timestamp)}</p>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="px-6 py-12 text-center">
              <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No history yet</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HistoryView;

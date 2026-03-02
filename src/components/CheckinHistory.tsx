import React, { useState } from 'react';
import { Checkin } from '@/types';
import { Clock, LogIn, LogOut, Coffee, Calendar, Filter, Search, Download, ChevronDown, Activity } from 'lucide-react';

interface CheckinHistoryProps {
  checkins: Checkin[];
}

const CheckinHistory: React.FC<CheckinHistoryProps> = ({ checkins }) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchDate, setSearchDate] = useState('');

  const typeConfig: Record<string, { icon: React.ElementType; accent: string; bg: string; label: string }> = {
    in:          { icon: LogIn,  accent: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Checked In'    },
    out:         { icon: LogOut, accent: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Checked Out'   },
    break_start: { icon: Coffee, accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Started Break' },
    break_end:   { icon: Clock,  accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Ended Break'   },
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const filteredCheckins = checkins.filter(c => {
    if (filter !== 'all' && c.check_type !== filter) return false;
    if (searchDate) {
      const d = new Date(c.timestamp).toISOString().split('T')[0];
      if (d !== searchDate) return false;
    }
    return true;
  });

  const groupedCheckins = filteredCheckins.reduce((groups, c) => {
    const date = new Date(c.timestamp).toDateString();
    if (!groups[date]) groups[date] = [];
    groups[date].push(c);
    return groups;
  }, {} as Record<string, Checkin[]>);

  const exportToCSV = () => {
    const headers = ['Date', 'Time', 'Type', 'Location', 'Code'];
    const rows = filteredCheckins.map(c => [
      formatDate(c.timestamp),
      formatTime(c.timestamp),
      typeConfig[c.check_type]?.label || c.check_type,
      c.location || 'N/A',
      c.scan_code || 'N/A',
    ]);
    const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = `checkin-history-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .ch { font-family: 'Sora', sans-serif; display: flex; flex-direction: column; gap: 16px; animation: chFade 0.4s ease both; }
        @keyframes chFade { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }

        /* ── Header card ── */
        .ch-header {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 26px 28px;
          position: relative; overflow: hidden;
        }
        .ch-header::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }
        .ch-header-glow {
          position: absolute; top: -80px; right: -80px;
          width: 220px; height: 220px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .ch-header-top {
          display: flex; align-items: flex-start; justify-content: space-between; gap: 16px;
          flex-wrap: wrap;
        }
        .ch-title { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); }
        .ch-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .ch-export-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px;
          background: hsl(var(--foreground) / 0.05);
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: all 0.2s;
          font-family: 'Sora', sans-serif; white-space: nowrap; flex-shrink: 0;
        }
        .ch-export-btn:hover { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary) / 0.3); }

        .ch-filters {
          display: flex; gap: 12px; margin-top: 20px; flex-wrap: wrap;
        }

        .ch-select-wrap { position: relative; display: flex; align-items: center; gap: 8px; }
        .ch-filter-icon { color: hsl(var(--muted-foreground)); flex-shrink: 0; }
        .ch-select-inner { position: relative; }
        .ch-select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground)); pointer-events: none; }
        .ch-select {
          appearance: none;
          padding: 9px 30px 9px 12px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          border-radius: 9px;
          color: hsl(var(--muted-foreground)); font-size: 13px;
          outline: none; cursor: pointer; transition: border-color 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .ch-select:focus { border-color: hsl(var(--primary) / 0.4); background: hsl(var(--primary) / 0.05); }
        .ch-select option { background: hsl(var(--card)); color: hsl(var(--foreground)); }

        .ch-date-wrap { display: flex; align-items: center; gap: 8px; }
        .ch-date-input {
          padding: 9px 12px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          border-radius: 9px;
          color: hsl(var(--muted-foreground)); font-size: 13px;
          outline: none; transition: border-color 0.2s;
          font-family: 'Sora', sans-serif;
          color-scheme: light dark;
        }
        .ch-date-input:focus { border-color: hsl(var(--primary) / 0.4); background: hsl(var(--primary) / 0.05); }
        .ch-clear-btn {
          background: none; border: none;
          color: hsl(var(--muted-foreground)); font-size: 12px; font-weight: 500;
          cursor: pointer; transition: color 0.2s;
          font-family: 'Sora', sans-serif; padding: 4px 6px;
        }
        .ch-clear-btn:hover { color: hsl(var(--foreground)); }

        /* ── Stat mini cards ── */
        .ch-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 600px) { .ch-stats { grid-template-columns: repeat(2, 1fr); } }

        .ch-stat {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 14px;
          padding: 16px 18px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .ch-stat:hover { border-color: hsl(var(--primary) / 0.25); transform: translateY(-1px); }
        .ch-stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground)); margin-bottom: 10px; }
        .ch-stat-value { font-size: 28px; font-weight: 700; color: hsl(var(--foreground)); line-height: 1; font-variant-numeric: tabular-nums; }
        .ch-stat-bar { height: 2px; border-radius: 1px; margin-top: 10px; opacity: 0.5; }

        /* ── History list card ── */
        .ch-list-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }

        .ch-list-header {
          padding: 14px 22px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex; align-items: center; gap: 9px;
          font-size: 12px; font-weight: 600; color: hsl(var(--muted-foreground));
          text-transform: uppercase; letter-spacing: 0.06em;
        }

        .ch-day-header {
          padding: 10px 22px;
          background: hsl(var(--foreground) / 0.02);
          border-bottom: 1px solid hsl(var(--border));
          font-size: 12px; font-weight: 600; color: hsl(var(--muted-foreground));
          text-transform: uppercase; letter-spacing: 0.06em;
          display: flex; align-items: center; gap: 8px;
        }
        .ch-day-dot { width: 5px; height: 5px; border-radius: 50%; background: hsl(var(--muted-foreground)); flex-shrink: 0; }

        .ch-row {
          padding: 14px 22px;
          display: flex; align-items: center; gap: 14px;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          transition: background 0.15s;
        }
        .ch-row:last-child { border-bottom: none; }
        .ch-row:hover { background: hsl(var(--foreground) / 0.02); }

        .ch-row-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid hsl(var(--border));
        }

        .ch-row-label { font-size: 14px; font-weight: 500; color: hsl(var(--foreground)); }
        .ch-row-loc   { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 2px; }

        .ch-row-time {
          margin-left: auto; flex-shrink: 0;
          font-family: 'JetBrains Mono', monospace;
          font-size: 14px; font-weight: 500; color: hsl(var(--muted-foreground));
        }

        .ch-empty {
          padding: 60px 24px; text-align: center;
        }
        .ch-empty p  { font-size: 14px; color: hsl(var(--muted-foreground)); margin-bottom: 6px; }
        .ch-empty span { font-size: 12px; color: hsl(var(--muted-foreground) / 0.8); }
      `}</style>

      <div className="ch">

        {/* Header */}
        <div className="ch-header">
          <div className="ch-header-glow" />
          <div className="ch-header-top">
            <div>
              <div className="ch-title">Check-in History</div>
              <div className="ch-sub">View and export your attendance records</div>
            </div>
            <button className="ch-export-btn" onClick={exportToCSV}>
              <Download size={14} />
              Export CSV
            </button>
          </div>

          <div className="ch-filters">
            <div className="ch-select-wrap">
              <Filter size={14} className="ch-filter-icon" />
              <div className="ch-select-inner">
                <select className="ch-select" value={filter} onChange={e => setFilter(e.target.value)}>
                  <option value="all">All Types</option>
                  <option value="in">Check In</option>
                  <option value="out">Check Out</option>
                  <option value="break_start">Break Start</option>
                  <option value="break_end">Break End</option>
                </select>
                <ChevronDown size={12} className="ch-select-arrow" />
              </div>
            </div>

            <div className="ch-date-wrap">
              <Calendar size={14} className="ch-filter-icon" />
              <input
                type="date"
                className="ch-date-input"
                value={searchDate}
                onChange={e => setSearchDate(e.target.value)}
              />
              {searchDate && (
                <button className="ch-clear-btn" onClick={() => setSearchDate('')}>Clear</button>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="ch-stats">
          {Object.entries(typeConfig).map(([type, cfg]) => {
            const count = checkins.filter(c => c.check_type === type).length;
            const pct = checkins.length ? (count / checkins.length) * 100 : 0;
            return (
              <div className="ch-stat" key={type}>
                <div className="ch-stat-label">{cfg.label}</div>
                <div className="ch-stat-value">{count}</div>
                <div className="ch-stat-bar" style={{ background: cfg.accent, width: `${pct}%`, maxWidth: '100%' }} />
              </div>
            );
          })}
        </div>

        {/* List */}
        <div className="ch-list-card">
          <div className="ch-list-header">
            <Activity size={13} />
            {filteredCheckins.length} record{filteredCheckins.length !== 1 ? 's' : ''}
          </div>

          {Object.keys(groupedCheckins).length > 0 ? (
            Object.entries(groupedCheckins).map(([date, dayCheckins]) => (
              <div key={date}>
                <div className="ch-day-header">
                  <span className="ch-day-dot" />
                  {formatDate(dayCheckins[0].timestamp)}
                </div>
                {dayCheckins.map(c => {
                  const cfg = typeConfig[c.check_type] || typeConfig.in;
                  const Icon = cfg.icon;
                  return (
                    <div className="ch-row" key={c.id}>
                      <div className="ch-row-icon" style={{ background: cfg.bg }}>
                        <Icon size={15} color={cfg.accent} />
                      </div>
                      <div>
                        <div className="ch-row-label">{cfg.label}</div>
                        {c.location && <div className="ch-row-loc">{c.location}</div>}
                      </div>
                      <div className="ch-row-time">{formatTime(c.timestamp)}</div>
                    </div>
                  );
                })}
              </div>
            ))
          ) : (
            <div className="ch-empty">
              <Search size={34} style={{ margin: '0 auto 14px', opacity: 0.15, color: 'hsl(var(--muted-foreground))' }} />
              <p>No records found</p>
              <span>Try adjusting your filters</span>
            </div>
          )}
        </div>

      </div>
    </>
  );
};

export default CheckinHistory;

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Checkin } from '@/types';
import { Clock, LogIn, LogOut, Coffee, MapPin, Activity } from 'lucide-react';
import HistoryMap from '@/components/HistoryMap';

interface HistoryViewProps {
  checkins: Checkin[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
}

const typeConfig: Record<string, { icon: React.ElementType; accent: string; bg: string; label: string }> = {
  in:          { icon: LogIn,  accent: '#22c55e', bg: 'rgba(34,197,94,0.1)',   label: 'Checked In'    },
  out:         { icon: LogOut, accent: '#ef4444', bg: 'rgba(239,68,68,0.1)',   label: 'Checked Out'   },
  break_start: { icon: Coffee, accent: '#f59e0b', bg: 'rgba(245,158,11,0.1)', label: 'Started Break' },
  break_end:   { icon: Clock,  accent: '#3b82f6', bg: 'rgba(59,130,246,0.1)', label: 'Ended Break'   },
};

const HistoryView: React.FC<HistoryViewProps> = ({ checkins, selectedId, onSelect }) => {
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const monthMenuRef = useRef<HTMLDivElement | null>(null);

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  const formatDate = (ts: string) =>
    new Date(ts).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const monthOptions = useMemo(() => {
    const seen = new Set<string>();
    const options: string[] = [];
    for (const c of checkins) {
      const d = new Date(c.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!seen.has(key)) {
        seen.add(key);
        options.push(key);
      }
    }
    return options.sort((a, b) => (a < b ? 1 : -1));
  }, [checkins]);

  const filteredCheckins = useMemo(() => {
    if (selectedMonth === 'all') return checkins;
    return checkins.filter((c) => {
      const d = new Date(c.timestamp);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      return key === selectedMonth;
    });
  }, [checkins, selectedMonth]);

  useEffect(() => {
    if (!selectedId) return;
    if (filteredCheckins.some((c) => c.id === selectedId)) return;
    onSelect(filteredCheckins[0]?.id ?? null);
  }, [filteredCheckins, onSelect, selectedId]);

  useEffect(() => {
    if (!isMonthOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !monthMenuRef.current) return;
      if (monthMenuRef.current.contains(target)) return;
      setIsMonthOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [isMonthOpen]);

  const formatMonthLabel = (key: string) => {
    if (key === 'all') return 'All months';
    const [y, m] = key.split('-').map(Number);
    return new Date(y, (m || 1) - 1, 1).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .hv { font-family: 'Sora', sans-serif; display: flex; flex-direction: column; gap: 16px; animation: hvFade 0.4s ease both; }
        @keyframes hvFade { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }

        /* ── Header ── */
        .hv-header {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 24px 28px;
          position: relative; overflow: hidden;
          display: flex; align-items: center; gap: 16px;
        }
        .hv-header::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }
        .hv-header-glow {
          position: absolute; top: -70px; right: -70px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .hv-header-icon {
          width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
          position: relative;
        }
        .hv-header-title { font-size: 18px; font-weight: 700; color: hsl(var(--foreground)); }
        .hv-header-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 3px; }

        /* ── Grid ── */
        .hv-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 14px;
          align-items: start;
        }
        @media (min-width: 1024px) { .hv-grid { grid-template-columns: 1fr 1fr; } }

        /* ── Checkin list card ── */
        .hv-list-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          max-height: 480px;
          display: flex; flex-direction: column;
        }

        .hv-list-header {
          padding: 13px 20px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex; align-items: center; gap: 8px;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground));
          flex-shrink: 0;
        }

        .hv-filter {
          margin-left: auto;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          font-family: 'Sora', sans-serif;
          font-size: 11px;
          font-weight: 600;
          text-transform: none;
          letter-spacing: 0.02em;
          color: hsl(var(--foreground));
        }
        .hv-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 999px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          color: hsl(var(--foreground));
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Sora', sans-serif;
        }
        .hv-filter-menu {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          min-width: 190px;
          max-height: 240px;
          overflow: auto;
          border-radius: 12px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--card));
          box-shadow: 0 10px 24px -18px rgba(15,23,42,0.4);
          padding: 6px;
          z-index: 20;
        }
        .hv-filter-option {
          width: 100%;
          text-align: left;
          padding: 8px 10px;
          border-radius: 8px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          font-size: 12px;
          font-weight: 600;
          color: hsl(var(--muted-foreground));
          font-family: 'Sora', sans-serif;
        }
        .hv-filter-option.active { color: hsl(var(--foreground)); background: hsl(var(--foreground) / 0.03); }
        .hv-filter-option:hover { background: hsl(var(--foreground) / 0.05); }
        .hv-filter-check {
          width: 14px;
          height: 14px;
          border-radius: 999px;
          border: 2px solid hsl(var(--muted-foreground));
          display: inline-block;
        }
        .hv-filter-check.active {
          border-color: hsl(var(--primary));
          box-shadow: inset 0 0 0 4px hsl(var(--primary));
        }
        .hv-filter span {
          color: hsl(var(--muted-foreground));
          font-size: 10px;
        }

        .hv-list-scroll { overflow-y: auto; flex: 1; }
        .hv-list-scroll::-webkit-scrollbar { width: 4px; }
        .hv-list-scroll::-webkit-scrollbar-track { background: transparent; }
        .hv-list-scroll::-webkit-scrollbar-thumb { background: hsl(var(--border)); border-radius: 2px; }

        /* ── Row button ── */
        .hv-row {
          width: 100%;
          text-align: left;
          padding: 13px 20px;
          display: flex; align-items: center; gap: 13px;
          border: none; background: transparent; cursor: pointer;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          transition: background 0.15s;
          font-family: 'Sora', sans-serif;
          position: relative;
        }
        .hv-row:last-child { border-bottom: none; }
        .hv-row:hover { background: hsl(var(--foreground) / 0.025); }

        .hv-row-selected {
          background: hsl(var(--primary) / 0.07) !important;
        }
        .hv-row-selected-bar {
          position: absolute; left: 0; top: 0; bottom: 0; width: 2px;
          background: hsl(var(--primary)); border-radius: 0 1px 1px 0;
        }

        .hv-row-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          border: 1px solid hsl(var(--border));
        }

        .hv-row-label { font-size: 13px; font-weight: 500; color: hsl(var(--foreground)); }

        .hv-row-time { margin-left: auto; text-align: right; flex-shrink: 0; }
        .hv-row-time-main {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground));
        }
        .hv-row-time-date { font-size: 11px; color: hsl(var(--muted-foreground) / 0.8); margin-top: 2px; }

        /* ── Empty ── */
        .hv-empty {
          padding: 48px 20px; text-align: center;
          color: hsl(var(--muted-foreground));
        }
        .hv-empty p { font-size: 14px; color: hsl(var(--muted-foreground)); margin-top: 12px; }
      `}</style>

      <div className="hv">

        {/* Header */}
        <div className="hv-header">
          <div className="hv-header-glow" />
          <div className="hv-header-icon">
            <MapPin size={18} color="white" />
          </div>
          <div style={{ position: 'relative' }}>
            <div className="hv-header-title">Check-in History</div>
            <div className="hv-header-sub">View your attendance records</div>
          </div>
        </div>

        {/* Map + list grid */}
        <div className="hv-grid">
          <HistoryMap checkins={filteredCheckins} selectedId={selectedId} />

          <div className="hv-list-card">
            <div className="hv-list-header">
              <Activity size={12} />
              {filteredCheckins.length} record{filteredCheckins.length !== 1 ? 's' : ''}
              <div className="hv-filter" ref={monthMenuRef} style={{ position: 'relative' }}>
                <span>Month</span>
                <button
                  type="button"
                  className="hv-filter-btn"
                  onClick={() => setIsMonthOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={isMonthOpen}
                >
                  {formatMonthLabel(selectedMonth)}
                </button>
                {isMonthOpen && (
                  <div className="hv-filter-menu" role="listbox" aria-label="Filter check-ins by month">
                    {['all', ...monthOptions].map((key) => (
                      <button
                        key={key}
                        type="button"
                        className={`hv-filter-option${selectedMonth === key ? ' active' : ''}`}
                        onClick={() => {
                          setSelectedMonth(key);
                          setIsMonthOpen(false);
                        }}
                      >
                        <span>{formatMonthLabel(key)}</span>
                        <span className={`hv-filter-check${selectedMonth === key ? ' active' : ''}`} />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="hv-list-scroll">
              {filteredCheckins.length > 0 ? (
                filteredCheckins.map(c => {
                  const cfg = typeConfig[c.check_type] || typeConfig.in;
                  const Icon = cfg.icon;
                  const isSelected = c.id === selectedId;

                  return (
                    <button
                      key={c.id}
                      type="button"
                      className={`hv-row${isSelected ? ' hv-row-selected' : ''}`}
                      onClick={() => onSelect(c.id)}
                    >
                      {isSelected && <span className="hv-row-selected-bar" />}
                      <div className="hv-row-icon" style={{ background: cfg.bg }}>
                        <Icon size={14} color={cfg.accent} />
                      </div>
                      <div className="hv-row-label">{cfg.label}</div>
                      <div className="hv-row-time">
                        <div className="hv-row-time-main">{formatTime(c.timestamp)}</div>
                        <div className="hv-row-time-date">{formatDate(c.timestamp)}</div>
                      </div>
                    </button>
                  );
                })
              ) : (
                <div className="hv-empty">
                  <Clock size={32} style={{ margin: '0 auto', opacity: 0.15, color: 'hsl(var(--muted-foreground))' }} />
                  <p>No history yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

      </div>
    </>
  );
};

export default HistoryView;

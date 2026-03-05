import React, { useState, useEffect } from 'react';
import { Employee, Checkin } from '@/types';
import { Clock, LogIn, LogOut, Coffee, TrendingUp, Calendar, Timer, ArrowRight, Activity, Zap } from 'lucide-react';

interface DashboardProps {
  employee: Employee;
  latestCheckin?: Checkin;
  recentCheckins: Checkin[];
  onNavigate: (view: 'scan' | 'history') => void;
}

const Dashboard: React.FC<DashboardProps> = ({ employee, latestCheckin, recentCheckins, onNavigate }) => {
  const [time, setTime] = useState(new Date());
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const getCurrentStatus = () => {
    if (!latestCheckin) return { status: 'Not Checked In', colorClass: 'status-neutral', icon: Clock, dot: '#94a3b8' };
    switch (latestCheckin.check_type) {
      case 'in': return { status: 'Checked In', colorClass: 'status-in', icon: LogIn, dot: '#22c55e' };
      case 'out': return { status: 'Checked Out', colorClass: 'status-out', icon: LogOut, dot: '#ef4444' };
      case 'break_start': return { status: 'On Break', colorClass: 'status-break', icon: Coffee, dot: '#f59e0b' };
      case 'break_end': return { status: 'Back from Break', colorClass: 'status-back', icon: Clock, dot: '#3b82f6' };
      default: return { status: 'Unknown', colorClass: 'status-neutral', icon: Clock, dot: '#94a3b8' };
    }
  };

  const formatTime = (timestamp: string) =>
    new Date(timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const formatDate = (timestamp: string) =>
    new Date(timestamp).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  const calculateTodayHours = () => {
    const today = new Date().toDateString();
    const todayCheckins = recentCheckins.filter(c => new Date(c.timestamp).toDateString() === today);
    let totalMinutes = 0;
    let checkInTime: Date | null = null;
    for (const checkin of [...todayCheckins].reverse()) {
      if (checkin.check_type === 'in' && !checkInTime) checkInTime = new Date(checkin.timestamp);
      else if (checkin.check_type === 'out' && checkInTime) {
        totalMinutes += (new Date(checkin.timestamp).getTime() - checkInTime.getTime()) / 60000;
        checkInTime = null;
      }
    }
    if (checkInTime) totalMinutes += (new Date().getTime() - checkInTime.getTime()) / 60000;
    return { hours: Math.floor(totalMinutes / 60), minutes: Math.floor(totalMinutes % 60) };
  };

  const status = getCurrentStatus();
  const StatusIcon = status.icon;
  const { hours, minutes } = calculateTodayHours();
  const todayCount = recentCheckins.filter(c => new Date(c.timestamp).toDateString() === new Date().toDateString()).length;
  const initials = employee.full_name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'EE';

  const typeConfig: Record<string, { icon: React.ElementType; label: string; accent: string }> = {
    in: { icon: LogIn, label: 'Checked In', accent: '#22c55e' },
    out: { icon: LogOut, label: 'Checked Out', accent: '#ef4444' },
    break_start: { icon: Coffee, label: 'Started Break', accent: '#f59e0b' },
    break_end: { icon: Clock, label: 'Ended Break', accent: '#3b82f6' },
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .dash-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          min-height: 100vh;
          padding: 0;
          color: hsl(var(--foreground));
          position: relative;
          overflow-x: hidden;
        }

        .dash-root::before {
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

        .dash-root::after {
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

        .dash-content { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }

        /* Hero Card */
        .hero-card {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 26px 28px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
          opacity: 0;
          transform: translateY(16px);
          animation: fadeUp 0.5s ease forwards;
          flex-wrap: wrap;
        }
        @media (max-width: 640px) {
          .hero-card {
            flex-direction: column;
            align-items: flex-start;
            gap: 16px;
          }
          .live-clock { text-align: left; }
          .clock-time { font-size: 22px; }
          .hero-name { font-size: 18px; }
        }

        .hero-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }

        .hero-glow {
          position: absolute;
          top: -60px; right: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }

        .avatar {
          width: 56px; height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          font-size: 20px; font-weight: 700;
          color: white;
          flex-shrink: 0;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
        }

        .hero-left { display: flex; align-items: center; gap: 16px; flex: 1 1 280px; min-width: 0; }
        .hero-info { min-width: 0; }
        .hero-name {
          font-size: 22px; font-weight: 700; color: hsl(var(--foreground)); margin-bottom: 4px;
          display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline;
          word-break: break-word;
        }
        .hero-meta {
          font-size: 13px; color: hsl(var(--muted-foreground));
          display: flex; flex-wrap: wrap; gap: 6px;
          word-break: break-word;
        }
        .hero-meta span { color: hsl(var(--muted-foreground)); }

        .live-clock {
          text-align: right;
          font-family: 'JetBrains Mono', monospace;
          flex: 0 0 auto;
        }
        .clock-time { font-size: 28px; font-weight: 500; color: hsl(var(--foreground)); letter-spacing: -1px; }
        .clock-date { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        /* Status pill */
        .status-pill {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 6px 14px;
          border-radius: 100px;
          font-size: 12px; font-weight: 600;
          margin-top: 10px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          flex-wrap: wrap;
        }
        .status-dot {
          width: 7px; height: 7px;
          border-radius: 50%;
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }

        /* Stats grid */
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 16px;
        }

        @media (max-width: 640px) { .stats-grid { grid-template-columns: 1fr; } }

        .stat-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 16px 18px;
          opacity: 0;
          transform: translateY(12px);
          position: relative;
          overflow: hidden;
          transition: border-color 0.2s, transform 0.2s;
        }
        .stat-card:hover { border-color: hsl(var(--primary) / 0.3); transform: translateY(-2px); }
        .stat-card:nth-child(1) { animation: fadeUp 0.5s ease 0.1s forwards; }
        .stat-card:nth-child(2) { animation: fadeUp 0.5s ease 0.2s forwards; }
        .stat-card:nth-child(3) { animation: fadeUp 0.5s ease 0.3s forwards; }

        .stat-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: hsl(var(--muted-foreground)); margin-bottom: 12px;
        }

        .stat-value {
          font-size: 28px; font-weight: 700;
          color: hsl(var(--foreground));
          font-variant-numeric: tabular-nums;
          line-height: 1;
        }
        .stat-value .unit { font-size: 14px; font-weight: 400; color: hsl(var(--muted-foreground)); margin-left: 2px; }

        .stat-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 8px; }

        .stat-icon {
          position: absolute; top: 18px; right: 18px;
          width: 36px; height: 36px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
        }

        /* CTA button */
        .cta-btn {
          display: flex; align-items: center; justify-content: center; gap-8px;
          width: 100%;
          margin-top: 16px;
          padding: 10px 16px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          border: none; border-radius: 10px;
          color: white; font-size: 13px; font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
          font-family: 'Sora', sans-serif;
          gap: 6px;
        }
        .cta-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .cta-btn:active { transform: translateY(0); }

        /* Activity feed */
        .feed-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          opacity: 0;
          animation: fadeUp 0.5s ease 0.4s forwards;
        }

        .feed-header {
          padding: 14px 22px;
          display: flex; align-items: center; justify-content: space-between;
          border-bottom: 1px solid hsl(var(--border));
        }

        .feed-title {
          display: flex; align-items: center; gap: 10px;
          font-size: 14px; font-weight: 600; color: hsl(var(--muted-foreground));
        }

        .feed-link {
          font-size: 12px; color: hsl(var(--primary)); font-weight: 600;
          background: none; border: none; cursor: pointer;
          display: flex; align-items: center; gap: 4px;
          transition: color 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .feed-link { color: hsl(var(--primary)); }
        .feed-link:hover { color: hsl(var(--primary) / 0.8); }

        .feed-item {
          padding: 14px 22px;
          display: flex; align-items: center; gap: 14px;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          transition: background 0.15s;
        }
        .feed-item:last-child { border-bottom: none; }
        .feed-item:hover { background: hsl(var(--foreground) / 0.02); }

        .feed-icon {
          width: 38px; height: 38px;
          border-radius: 10px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
        }

        .feed-label { font-size: 14px; font-weight: 500; color: hsl(var(--foreground)); }
        .feed-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 2px; }

        .feed-time {
          margin-left: auto; text-align: right;
          font-family: 'JetBrains Mono', monospace;
        }
        .feed-time-main { font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground)); }
        .feed-time-date { font-size: 11px; color: hsl(var(--muted-foreground) / 0.8); margin-top: 2px; }

        .feed-empty {
          padding: 60px 24px;
          text-align: center;
          color: hsl(var(--muted-foreground));
        }
        .feed-empty-icon { margin: 0 auto 12px; opacity: 0.3; }

        /* Timeline line on feed items */
        .feed-timeline {
          display: flex; flex-direction: column;
          gap: 0;
        }

        @keyframes fadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        /* Progress bar for hours */
        .hours-progress {
          margin-top: 12px;
          height: 3px;
          background: hsl(var(--border));
          border-radius: 100px;
          overflow: hidden;
        }
        .hours-fill {
          height: 100%;
          background: linear-gradient(90deg, hsl(var(--primary)), hsl(var(--primary) / 0.7));
          border-radius: 100px;
          transition: width 0.6s ease;
        }

        .badge {
          display: inline-flex; align-items: center;
          padding: 2px 8px;
          border-radius: 100px;
          font-size: 10px; font-weight: 600;
          background: hsl(var(--primary) / 0.15);
          color: hsl(var(--primary));
          border: 1px solid hsl(var(--primary) / 0.2);
          margin-left: 0;
        }
      `}</style>

      <div className="dash-root">
        <div className="dash-content">

          {/* Hero */}
          <div className="hero-card">
            <div className="hero-glow" />
            <div className="hero-left">
              <div className="avatar">{initials}</div>
              <div className="hero-info">
                <div className="hero-name">
                  {employee.full_name}
                  <span className="badge">#{employee.id || 'EMP'}</span>
                </div>
                <div className="hero-meta">
                  <span>{employee.department}</span>
                  {employee.designation && <span> · {employee.designation}</span>}
                </div>
                <div
                  className="status-pill"
                  style={{ color: status.dot }}
                >
                  <span className="status-dot" style={{ background: status.dot }} />
                  {status.status}
                  {latestCheckin && (
                    <span style={{ color: 'hsl(var(--muted-foreground))', fontWeight: 400, marginLeft: 2 }}>
                      · {formatTime(latestCheckin.timestamp)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="live-clock">
              <div className="clock-time">
                {mounted ? time.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }) : '--:--:--'}
              </div>
              <div className="clock-date">
                {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="stats-grid">
            {/* Current Status */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)' }}>
                <StatusIcon size={16} color="#6366f1" />
              </div>
              <div className="stat-label">Status</div>
              <div className="stat-value" style={{ fontSize: 20, paddingTop: 4 }}>{status.status}</div>
              <div className="stat-sub">
                {latestCheckin ? `Since ${formatTime(latestCheckin.timestamp)}` : 'No activity yet'}
              </div>
            </div>

            {/* Today's Hours */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(20,184,166,0.1)' }}>
                <Timer size={16} color="#14b8a6" />
              </div>
              <div className="stat-label">Today's Hours</div>
              <div className="stat-value">
                {hours}<span className="unit">h</span> {minutes}<span className="unit">m</span>
              </div>
              <div className="hours-progress">
                <div className="hours-fill" style={{ width: `${Math.min(((hours * 60 + minutes) / 480) * 100, 100)}%` }} />
              </div>
              <div className="stat-sub">{todayCount} activit{todayCount === 1 ? 'y' : 'ies'} logged</div>
            </div>

            {/* Quick Action */}
            <div className="stat-card">
              <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)' }}>
                <Zap size={16} color="#f59e0b" />
              </div>
              <div className="stat-label">Quick Action</div>
              <div className="stat-value" style={{ fontSize: 18, paddingTop: 4 }}>Click & Log</div>
              <div className="stat-sub">Record your attendance</div>
              <button className="cta-btn" onClick={() => onNavigate('scan')}>
                Check In Now <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="feed-card">
            <div className="feed-header">
              <div className="feed-title">
                <Activity size={15} />
                Recent Activity
              </div>
              <button className="feed-link" onClick={() => onNavigate('history')}>
                View All <ArrowRight size={12} />
              </button>
            </div>

            <div className="feed-timeline">
              {recentCheckins.slice(0, 6).length > 0 ? (
                recentCheckins.slice(0, 6).map((checkin, i) => {
                  const cfg = typeConfig[checkin.check_type] || typeConfig.in;
                  const Icon = cfg.icon;
                  return (
                    <div className="feed-item" key={checkin.id} style={{ animationDelay: `${0.45 + i * 0.05}s` }}>
                      <div className="feed-icon">
                        <Icon size={15} color={cfg.accent} />
                      </div>
                      <div>
                        <div className="feed-label">{cfg.label}</div>
                        <div className="feed-sub">{checkin.location || employee.custom_location || 'Location'}</div>
                      </div>
                      <div className="feed-time">
                        <div className="feed-time-main">{formatTime(checkin.timestamp)}</div>
                        <div className="feed-time-date">{formatDate(checkin.timestamp)}</div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="feed-empty">
                  <Clock size={40} className="feed-empty-icon" />
                  <p style={{ fontSize: 14, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>No activity yet</p>
                  <p style={{ fontSize: 12, color: 'hsl(var(--muted-foreground) / 0.8)' }}>Your check-ins will appear here</p>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Dashboard;

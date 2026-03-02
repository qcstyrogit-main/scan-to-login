import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Employee } from '@/types';
import {
  Users, Search, RefreshCw, LogIn, LogOut, Coffee, Clock,
  Building2, Mail, Phone, ChevronDown, Activity,
} from 'lucide-react';

const AdminPanel: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const { data } = await supabase.functions.invoke('employee-auth', {
        body: { action: 'get_employees' },
      });
      if (data?.success) setEmployees(data.employees);
    } catch (err) {
      console.error('Error fetching employees:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchEmployees(); }, []);

  const getStatus = (employee: Employee) => {
    if (!employee.latestCheckin)
      return { status: 'Not Checked In', dot: 'hsl(var(--muted-foreground))', accent: 'rgba(100,116,139,0.12)', icon: Clock };
    switch (employee.latestCheckin.check_type) {
      case 'in':         return { status: 'Checked In',    dot: '#22c55e', accent: 'rgba(34,197,94,0.12)',   icon: LogIn };
      case 'out':        return { status: 'Checked Out',   dot: '#ef4444', accent: 'rgba(239,68,68,0.12)',   icon: LogOut };
      case 'break_start':return { status: 'On Break',      dot: '#f59e0b', accent: 'rgba(245,158,11,0.12)', icon: Coffee };
      case 'break_end':  return { status: 'Working',       dot: '#3b82f6', accent: 'rgba(59,130,246,0.12)', icon: Clock };
      default:           return { status: 'Unknown',       dot: 'hsl(var(--muted-foreground))', accent: 'rgba(100,116,139,0.12)', icon: Clock };
    }
  };

  const formatTime = (ts: string) =>
    new Date(ts).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const departments = [...new Set(employees.map(e => e.department))];

  const filteredEmployees = employees.filter(emp => {
    const matchesSearch =
      emp.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDept = departmentFilter === 'all' || emp.department === departmentFilter;
    if (!matchesSearch || !matchesDept) return false;
    if (statusFilter === 'all') return true;
    const s = getStatus(emp).status;
    if (statusFilter === 'checked_in'  && s !== 'Checked In')  return false;
    if (statusFilter === 'checked_out' && s !== 'Checked Out') return false;
    if (statusFilter === 'on_break'    && s !== 'On Break')    return false;
    return true;
  });

  const counts = {
    total:     employees.length,
    checkedIn: employees.filter(e => e.latestCheckin?.check_type === 'in').length,
    checkedOut:employees.filter(e => !e.latestCheckin || e.latestCheckin?.check_type === 'out').length,
    onBreak:   employees.filter(e => e.latestCheckin?.check_type === 'break_start').length,
  };

  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .adm { font-family: 'Sora', sans-serif; display: flex; flex-direction: column; gap: 18px; }

        /* ── Hero ── */
        .adm-hero {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 28px 32px;
          display: flex; align-items: center; justify-content: space-between; gap: 16px;
          position: relative; overflow: hidden;
        }
        .adm-hero::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.55), transparent);
        }
        .adm-hero-glow {
          position: absolute; top: -80px; right: -80px;
          width: 240px; height: 240px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%);
          border-radius: 50%; pointer-events: none;
        }
        .adm-hero-left { display: flex; align-items: center; gap: 18px; position: relative; }
        .adm-hero-icon {
          width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2);
        }
        .adm-hero-title { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); }
        .adm-hero-sub { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 3px; }

        .adm-refresh {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px;
          background: hsl(var(--foreground) / 0.05);
          border: 1px solid hsl(var(--foreground) / 0.08);
          border-radius: 10px;
          color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 500;
          cursor: pointer; transition: background 0.2s, color 0.2s;
          font-family: 'Sora', sans-serif;
          position: relative;
        }
        .adm-refresh:hover { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary) / 0.3); }
        .adm-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes spin { to { transform: rotate(360deg); } }
        .spinning { animation: spin 0.8s linear infinite; }

        /* ── Stat cards ── */
        .adm-stats {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
        }
        @media (max-width: 700px) { .adm-stats { grid-template-columns: repeat(2, 1fr); } }

        .adm-stat {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 14px;
          padding: 18px 20px;
          display: flex; flex-direction: column; gap: 10px;
          transition: border-color 0.2s, transform 0.2s;
        }
        .adm-stat:hover { border-color: rgba(99,102,241,0.25); transform: translateY(-1px); }
        .adm-stat-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground)); }
        .adm-stat-value { font-size: 30px; font-weight: 700; color: hsl(var(--foreground)); line-height: 1; font-variant-numeric: tabular-nums; }
        .adm-stat-dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 2px; }

        /* ── Filter bar ── */
        .adm-filters {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 14px;
          padding: 14px 18px;
          display: flex; gap: 12px; align-items: center; flex-wrap: wrap;
        }

        .adm-search-wrap { flex: 1; min-width: 180px; position: relative; }
        .adm-search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground)); pointer-events: none; }
        .adm-search {
          width: 100%; padding: 9px 12px 9px 38px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px;
          color: hsl(var(--foreground)); font-size: 13px;
          outline: none; transition: border-color 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .adm-search::placeholder { color: hsl(var(--muted-foreground) / 0.8); }
        .adm-search:focus { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.05); }

        .adm-select-wrap { position: relative; }
        .adm-select-arrow { position: absolute; right: 10px; top: 50%; transform: translateY(-50%); color: hsl(var(--muted-foreground)); pointer-events: none; }
        .adm-select {
          appearance: none;
          padding: 9px 30px 9px 12px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 9px;
          color: hsl(var(--muted-foreground)); font-size: 13px;
          outline: none; cursor: pointer; transition: border-color 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .adm-select:focus { border-color: rgba(99,102,241,0.4); }
        .adm-select option { background: hsl(var(--card)); color: hsl(var(--foreground)); }

        /* ── Table card ── */
        .adm-table-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }

        .adm-table-header {
          padding: 16px 24px;
          border-bottom: 1px solid hsl(var(--foreground) / 0.05);
          display: flex; align-items: center; gap: 10px;
          font-size: 13px; font-weight: 600; color: hsl(var(--muted-foreground));
        }

        .adm-table { width: 100%; border-collapse: collapse; }
        .adm-thead th {
          padding: 12px 20px;
          text-align: left;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em;
          color: hsl(var(--muted-foreground) / 0.8);
          background: rgba(255,255,255,0.02);
          border-bottom: 1px solid hsl(var(--foreground) / 0.04);
          white-space: nowrap;
        }
        .adm-tbody tr {
          border-bottom: 1px solid rgba(255,255,255,0.03);
          transition: background 0.15s;
        }
        .adm-tbody tr:last-child { border-bottom: none; }
        .adm-tbody tr:hover { background: rgba(255,255,255,0.02); }
        .adm-tbody td { padding: 14px 20px; vertical-align: middle; }

        .adm-avatar {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          display: flex; align-items: center; justify-content: center;
          font-size: 12px; font-weight: 700; color: white;
          box-shadow: 0 0 0 2px hsl(var(--primary) / 0.2);
        }

        .adm-name { font-size: 14px; font-weight: 500; color: hsl(var(--foreground)); }
        .adm-email { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 2px; }

        .adm-dept { display: flex; align-items: center; gap: 7px; font-size: 13px; color: hsl(var(--muted-foreground)); }

        .adm-status-pill {
          display: inline-flex; align-items: center; gap: 7px;
          padding: 5px 12px; border-radius: 100px;
          font-size: 12px; font-weight: 600;
          border: 1px solid transparent;
        }
        .adm-status-dot { width: 6px; height: 6px; border-radius: 50%; }

        .adm-time {
          font-family: 'JetBrains Mono', monospace;
          font-size: 13px; color: hsl(var(--muted-foreground));
        }

        .adm-contact-btn {
          width: 32px; height: 32px; border-radius: 8px;
          display: flex; align-items: center; justify-content: center;
          background: rgba(255,255,255,0.03);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground)); cursor: pointer; transition: all 0.15s;
        }
        .adm-contact-btn:hover { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary) / 0.3); }

        .adm-empty {
          padding: 60px 24px; text-align: center;
          color: hsl(var(--muted-foreground) / 0.8);
        }
        .adm-empty p { font-size: 14px; color: hsl(var(--muted-foreground)); margin-bottom: 6px; }
        .adm-empty span { font-size: 12px; color: hsl(var(--muted-foreground) / 0.8); }

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .adm { animation: fadeUp 0.4s ease both; }
      `}</style>

      <div className="adm">

        {/* Hero */}
        <div className="adm-hero">
          <div className="adm-hero-glow" />
          <div className="adm-hero-left">
            <div className="adm-hero-icon">
              <Users size={22} color="white" />
            </div>
            <div>
              <div className="adm-hero-title">Admin Dashboard</div>
              <div className="adm-hero-sub">Monitor all employee check-ins in real-time</div>
            </div>
          </div>
          <button className="adm-refresh" onClick={fetchEmployees} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>

        {/* Stats */}
        <div className="adm-stats">
          {[
            { label: 'Total', value: counts.total,     dot: 'hsl(var(--primary))', icon: <Users size={14} color="hsl(var(--primary))" /> },
            { label: 'Checked In',  value: counts.checkedIn,  dot: '#22c55e', icon: <LogIn  size={14} color="#22c55e" /> },
            { label: 'Checked Out', value: counts.checkedOut, dot: '#ef4444', icon: <LogOut size={14} color="#ef4444" /> },
            { label: 'On Break',    value: counts.onBreak,    dot: '#f59e0b', icon: <Coffee size={14} color="#f59e0b" /> },
          ].map(({ label, value, dot }) => (
            <div className="adm-stat" key={label}>
              <div className="adm-stat-label">{label}</div>
              <div className="adm-stat-value">{value}</div>
              <div className="adm-stat-dot" style={{ background: dot }} />
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="adm-filters">
          <div className="adm-search-wrap">
            <Search size={14} className="adm-search-icon" />
            <input
              type="text"
              className="adm-search"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by name or email…"
            />
          </div>

          <div className="adm-select-wrap">
            <select className="adm-select" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All Status</option>
              <option value="checked_in">Checked In</option>
              <option value="checked_out">Checked Out</option>
              <option value="on_break">On Break</option>
            </select>
            <ChevronDown size={13} className="adm-select-arrow" />
          </div>

          <div className="adm-select-wrap">
            <select className="adm-select" value={departmentFilter} onChange={e => setDepartmentFilter(e.target.value)}>
              <option value="all">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <ChevronDown size={13} className="adm-select-arrow" />
          </div>
        </div>

        {/* Table */}
        <div className="adm-table-card">
          <div className="adm-table-header">
            <Activity size={14} />
            {loading ? 'Loading…' : `${filteredEmployees.length} employee${filteredEmployees.length !== 1 ? 's' : ''}`}
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table className="adm-table">
              <thead className="adm-thead">
                <tr>
                  <th>Employee</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Last Activity</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody className="adm-tbody">
                {loading ? (
                  <tr>
                    <td colSpan={5}>
                      <div className="adm-empty">
                        <RefreshCw size={32} className="spinning" style={{ margin: '0 auto 14px', color: 'hsl(var(--muted-foreground) / 0.8)' }} />
                        <p>Loading employees…</p>
                      </div>
                    </td>
                  </tr>
                ) : filteredEmployees.length > 0 ? (
                  filteredEmployees.map(emp => {
                    const s = getStatus(emp);
                    const Icon = s.icon;
                    return (
                      <tr key={emp.id}>
                        {/* Name */}
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div className="adm-avatar">{initials(emp.full_name)}</div>
                            <div>
                              <div className="adm-name">{emp.full_name}</div>
                              <div className="adm-email">{emp.email}</div>
                            </div>
                          </div>
                        </td>
                        {/* Dept */}
                        <td>
                          <div className="adm-dept">
                            <Building2 size={13} />
                            {emp.department}
                          </div>
                        </td>
                        {/* Status */}
                        <td>
                          <span
                            className="adm-status-pill"
                            style={{ background: s.accent, borderColor: `${s.dot}33`, color: s.dot }}
                          >
                            <span className="adm-status-dot" style={{ background: s.dot }} />
                            <Icon size={12} />
                            {s.status}
                          </span>
                        </td>
                        {/* Time */}
                        <td>
                          <span className="adm-time">
                            {emp.latestCheckin ? formatTime(emp.latestCheckin.timestamp) : '—'}
                          </span>
                        </td>
                        {/* Contact */}
                        <td>
                          <div style={{ display: 'flex', gap: 8 }}>
                            <button className="adm-contact-btn" title="Email"><Mail size={13} /></button>
                            <button className="adm-contact-btn" title="Phone"><Phone size={13} /></button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5}>
                      <div className="adm-empty">
                        <Search size={32} style={{ margin: '0 auto 14px', opacity: 0.2 }} />
                        <p>No employees found</p>
                        <span>Try adjusting your filters</span>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </>
  );
};

export default AdminPanel;

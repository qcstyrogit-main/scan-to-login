import React from 'react';
import { Employee } from '@/types';
import { User, Mail, Building2, Shield, Briefcase } from 'lucide-react';

interface ProfileSectionProps {
  employee: Employee;
}

const ProfileSection: React.FC<ProfileSectionProps> = ({ employee }) => {
  const initials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  const isAdmin = employee.role === 'admin';

  const fields = [
    { icon: User,      label: 'Full Name',    value: employee.full_name,               hint: null },
    { icon: Mail,      label: 'Email',        value: employee.email,                   hint: 'Email cannot be changed' },
    { icon: Building2, label: 'Department',   value: employee.department,              hint: null },
    { icon: Briefcase, label: 'Designation',  value: employee.designation || '—',      hint: null },
    { icon: Shield,    label: 'Role',         value: isAdmin ? 'Administrator' : 'Employee', hint: null },
  ];

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .ps {
          font-family: 'Sora', sans-serif;
          max-width: 600px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 16px;
          animation: psFade 0.4s ease both;
          width: 100%;
          overflow-x: hidden;
        }
        @keyframes psFade { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }

        /* ── Hero card ── */
        .ps-hero {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 20px;
          overflow: hidden;
          position: relative;
        }

        /* Banner */
        .ps-banner {
          height: 120px;
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          position: relative; overflow: visible;
          border-top-left-radius: 20px;
          border-top-right-radius: 20px;
          z-index: 1;
        }
        .ps-banner::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }
        .ps-banner-glow {
          position: absolute; top: -60px; right: -60px;
          width: 200px; height: 200px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%);
          border-radius: 50%;
        }
        .ps-banner-glow2 {
          position: absolute; bottom: -40px; left: 30%;
          width: 140px; height: 140px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%);
          border-radius: 50%;
        }

        /* Avatar */
        .ps-avatar-wrap {
          position: absolute;
          bottom: -36px; left: 24px;
          z-index: 3;
        }
        .ps-avatar {
          width: 80px; height: 80px; border-radius: 20px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          font-size: 26px; font-weight: 700; color: white;
          box-shadow: 0 0 0 3px hsl(var(--card)), 0 0 0 5px hsl(var(--primary) / 0.3);
          overflow: hidden;
          flex-shrink: 0;
        }
        .ps-avatar img { width: 100%; height: 100%; object-fit: cover; }

        /* Info row */
        .ps-info {
          padding: 52px 28px 24px;
          display: flex; align-items: flex-start; justify-content: space-between; gap: 12px;
          position: relative;
          z-index: 2;
        }
        .ps-name { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); margin-bottom: 4px; }
        .ps-dept { font-size: 13px; color: hsl(var(--muted-foreground)); }

        .ps-role-pill {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 6px 12px; border-radius: 100px;
          font-size: 12px; font-weight: 600; flex-shrink: 0;
        }
        .ps-role-admin {
          background: hsl(var(--primary) / 0.12);
          border: 1px solid hsl(var(--primary) / 0.25);
          color: hsl(var(--primary));
        }
        .ps-role-employee {
          background: hsl(var(--primary) / 0.1);
          border: 1px solid hsl(var(--primary) / 0.2);
          color: hsl(var(--primary));
        }

        /* ── Details card ── */
        .ps-details {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }

        .ps-details-header {
          padding: 16px 24px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex; align-items: center; gap: 9px;
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground));
        }

        .ps-field {
          padding: 16px 24px;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          display: flex; align-items: flex-start; gap: 16px;
        }
        .ps-field:last-child { border-bottom: none; }

        .ps-field-icon {
          width: 34px; height: 34px; border-radius: 9px; flex-shrink: 0; margin-top: 1px;
          display: flex; align-items: center; justify-content: center;
          background: hsl(var(--foreground) / 0.03);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }

        .ps-field-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: hsl(var(--muted-foreground)); margin-bottom: 5px;
        }
        .ps-field-value {
          font-size: 14px; font-weight: 500; color: hsl(var(--foreground));
          font-family: 'Sora', sans-serif;
        }
        .ps-field-email { font-family: 'JetBrains Mono', monospace; font-size: 13px; }
        .ps-field-hint  { font-size: 11px; color: hsl(var(--muted-foreground) / 0.8); margin-top: 4px; }
      `}</style>

      <div className="ps">

        {/* Hero */}
        <div className="ps-hero">
          <div className="ps-banner">
            <div className="ps-banner-glow" />
            <div className="ps-banner-glow2" />
            <div className="ps-avatar-wrap">
              <div className="ps-avatar">
                {employee.avatar_url
                  ? <img src={employee.avatar_url} alt={employee.full_name} />
                  : initials(employee.full_name)
                }
              </div>
            </div>
          </div>

          <div className="ps-info">
            <div>
              <div className="ps-name">{employee.full_name}</div>
              <div className="ps-dept">{employee.department}</div>
            </div>
            <span className={`ps-role-pill ${isAdmin ? 'ps-role-admin' : 'ps-role-employee'}`}>
              <Shield size={11} />
              {isAdmin ? 'Administrator' : 'Employee'}
            </span>
          </div>
        </div>

        {/* Fields */}
        <div className="ps-details">
          <div className="ps-details-header">
            <User size={12} />
            Profile Information
          </div>

          {fields.map(({ icon: Icon, label, value, hint }) => (
            <div className="ps-field" key={label}>
              <div className="ps-field-icon">
                <Icon size={14} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="ps-field-label">{label}</div>
                <div className={`ps-field-value${label === 'Email' ? ' ps-field-email' : ''}`}>
                  {value}
                </div>
                {hint && <div className="ps-field-hint">{hint}</div>}
              </div>
            </div>
          ))}
        </div>

      </div>
    </>
  );
};

export default ProfileSection;

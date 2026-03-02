import React, { useState } from 'react';
import { Clock, Shield, Users, Zap, Eye, EyeOff, Loader2 } from 'lucide-react';

interface LoginPageProps {
  onLogin: (email: string, password: string) => void;
  isLoading?: boolean;
  error?: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, isLoading = false, error }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(email, password);
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        .lp-root {
          font-family: 'Sora', sans-serif;
          min-height: 100vh;
          background: hsl(var(--background));
          display: flex;
          position: relative;
          overflow: hidden;
        }

        /* Ambient blobs */
        .lp-blob {
          position: fixed;
          border-radius: 50%;
          pointer-events: none;
          z-index: 0;
          filter: blur(80px);
        }
        .lp-blob-1 {
          width: 520px; height: 520px;
          top: -180px; left: -140px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.18) 0%, transparent 70%);
        }
        .lp-blob-2 {
          width: 400px; height: 400px;
          bottom: -120px; right: -100px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%);
        }
        .lp-blob-3 {
          width: 300px; height: 300px;
          top: 40%; left: 40%;
          background: radial-gradient(circle, hsl(var(--primary) / 0.06) 0%, transparent 70%);
        }

        /* ── Left panel ── */
        .lp-left {
          display: none;
          position: relative; z-index: 1;
          flex-direction: column;
          justify-content: center;
          padding: 56px 56px 56px 64px;
          width: 52%;
          border-right: 1px solid hsl(var(--border));
        }
        @media (min-width: 1024px) { .lp-left { display: flex; } }

        .lp-logo {
          display: flex; align-items: center; gap: 12px;
          margin-bottom: 52px;
        }
        .lp-logo-icon {
          width: 46px; height: 46px; border-radius: 13px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2), 0 8px 24px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }
        .lp-logo-name {
          font-size: 18px; font-weight: 700; color: hsl(var(--foreground));
          letter-spacing: -0.3px;
        }

        .lp-headline {
          font-size: 42px; font-weight: 800;
          color: hsl(var(--foreground));
          line-height: 1.15;
          letter-spacing: -1px;
          margin-bottom: 18px;
        }
        .lp-headline-grad {
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.7));
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .lp-sub {
          font-size: 15px; color: hsl(var(--muted-foreground)); line-height: 1.7;
          max-width: 400px; margin-bottom: 44px;
        }

        .lp-features {
          display: grid; grid-template-columns: 1fr 1fr; gap: 12px;
          max-width: 460px;
        }
        .lp-feature {
          background: hsl(var(--foreground) / 0.03);
          border: 1px solid hsl(var(--border));
          border-radius: 14px;
          padding: 18px 20px;
          transition: border-color 0.2s, background 0.2s;
        }
        .lp-feature:hover {
          background: hsl(var(--primary) / 0.05);
          border-color: hsl(var(--primary) / 0.2);
        }
        .lp-feature-icon {
          width: 34px; height: 34px; border-radius: 9px;
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 12px;
        }
        .lp-feature-title { font-size: 13px; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 4px; }
        .lp-feature-desc  { font-size: 12px; color: hsl(var(--muted-foreground)); line-height: 1.5; }

        /* Divider line */
        .lp-divider {
          position: absolute; right: 0; top: 10%; bottom: 10%;
          width: 1px;
          background: linear-gradient(180deg, transparent, hsl(var(--primary) / 0.2), transparent);
        }

        /* ── Right panel ── */
        .lp-right {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          padding: 32px 24px;
          position: relative; z-index: 1;
        }

        .lp-form-wrap { width: 100%; max-width: 400px; }

        /* Mobile logo */
        .lp-mobile-logo {
          display: flex; align-items: center; justify-content: center; gap: 10px;
          margin-bottom: 32px;
        }
        @media (min-width: 1024px) { .lp-mobile-logo { display: none; } }

        /* Form card */
        .lp-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--primary) / 0.15);
          border-radius: 20px;
          padding: 36px 32px;
          position: relative; overflow: hidden;
        }
        .lp-card::before {
          content: '';
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }

        .lp-card-title {
          font-size: 22px; font-weight: 700; color: hsl(var(--foreground));
          margin-bottom: 6px;
        }
        .lp-card-sub { font-size: 13px; color: hsl(var(--muted-foreground)); margin-bottom: 28px; }

        /* Error */
        .lp-error {
          background: hsl(var(--destructive) / 0.08);
          border: 1px solid hsl(var(--destructive) / 0.2);
          border-radius: 10px;
          padding: 11px 14px;
          font-size: 13px; color: hsl(var(--destructive));
          margin-bottom: 20px;
        }

        /* Fields */
        .lp-field { margin-bottom: 18px; }
        .lp-label {
          display: block;
          font-size: 12px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          color: hsl(var(--muted-foreground)); margin-bottom: 8px;
        }
        .lp-input {
          width: 100%;
          padding: 11px 14px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid hsl(var(--border));
          border-radius: 10px;
          color: hsl(var(--foreground)); font-size: 14px;
          outline: none; transition: border-color 0.2s, background 0.2s;
          font-family: 'Sora', sans-serif;
        }
        .lp-input::placeholder { color: hsl(var(--muted-foreground) / 0.8); }
        .lp-input:focus {
          border-color: hsl(var(--primary) / 0.5);
          background: hsl(var(--primary) / 0.05);
        }
        .lp-input-wrap { position: relative; }
        .lp-eye-btn {
          position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
          background: none; border: none; color: hsl(var(--muted-foreground)); cursor: pointer;
          transition: color 0.2s; padding: 4px;
          display: flex; align-items: center;
        }
        .lp-eye-btn:hover { color: hsl(var(--foreground)); }

        /* Submit */
        .lp-submit {
          width: 100%;
          margin-top: 8px;
          padding: 12px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          border: none; border-radius: 11px;
          color: white; font-size: 14px; font-weight: 600;
          cursor: pointer;
          display: flex; align-items: center; justify-content: center; gap: 8px;
          transition: opacity 0.2s, transform 0.15s;
          font-family: 'Sora', sans-serif;
          box-shadow: 0 4px 16px hsl(var(--primary) / 0.3);
        }
        .lp-submit:hover:not(:disabled) { opacity: 0.9; transform: translateY(-1px); }
        .lp-submit:active:not(:disabled) { transform: translateY(0); }
        .lp-submit:disabled { opacity: 0.5; cursor: not-allowed; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .lp-spin { animation: spin 0.8s linear infinite; }

        .lp-footer {
          text-align: center;
          font-size: 12px; color: hsl(var(--muted-foreground));
          margin-top: 20px;
        }

        /* Entrance animations */
        .lp-left  { animation: lpSlideR 0.6s cubic-bezier(0.16,1,0.3,1) both; }
        .lp-right { animation: lpSlideL 0.6s cubic-bezier(0.16,1,0.3,1) 0.1s both; }
        @keyframes lpSlideR { from { opacity: 0; transform: translateX(-20px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes lpSlideL { from { opacity: 0; transform: translateX(20px);  } to { opacity: 1; transform: translateX(0); } }
      `}</style>

      <div className="lp-root">
        <div className="lp-blob lp-blob-1" />
        <div className="lp-blob lp-blob-2" />
        <div className="lp-blob lp-blob-3" />

        {/* ── Left panel ── */}
        <div className="lp-left">
          <div className="lp-divider" />

          <div className="lp-logo">
            <div className="lp-logo-icon">
              <Clock size={22} color="white" />
            </div>
            <span className="lp-logo-name">GeoTime QCMC</span>
          </div>

          <h1 className="lp-headline">
            Streamline Your<br />
            <span className="lp-headline-grad">Employee Check-ins</span>
          </h1>

          <p className="lp-sub">
            Fast, secure, and effortless time tracking with QR code scanning technology built for modern teams.
          </p>

          <div className="lp-features">
            {[
              { icon: <Zap size={16} color="#fbbf24" />, bg: 'rgba(251,191,36,0.1)',  title: 'Instant Scan',   desc: 'Check in within seconds using QR codes' },
              { icon: <Shield size={16} color="#34d399" />, bg: 'rgba(52,211,153,0.1)', title: 'Secure',         desc: 'Enterprise-grade security for your data' },
              { icon: <Users size={16} color="#818cf8" />,  bg: 'rgba(129,140,248,0.1)',title: 'Team View',      desc: 'Real-time visibility of your team' },
              { icon: <Clock size={16} color="#a78bfa" />,  bg: 'rgba(167,139,250,0.1)',title: 'Time Tracking',  desc: 'Accurate hours logging automatically' },
            ].map(({ icon, bg, title, desc }) => (
              <div className="lp-feature" key={title}>
                <div className="lp-feature-icon" style={{ background: bg }}>{icon}</div>
                <div className="lp-feature-title">{title}</div>
                <div className="lp-feature-desc">{desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ── Right panel ── */}
        <div className="lp-right">
          <div className="lp-form-wrap">

            {/* Mobile logo */}
            <div className="lp-mobile-logo">
              <div className="lp-logo-icon">
                <Clock size={20} color="white" />
              </div>
              <span className="lp-logo-name">GeoTime QCMC</span>
            </div>

            <div className="lp-card">
              <div className="lp-card-title">Welcome back</div>
              <div className="lp-card-sub">Sign in to your account to continue</div>

              {error && <div className="lp-error">{error}</div>}

              <form onSubmit={handleSubmit}>
                <div className="lp-field">
                  <label className="lp-label">Email Address</label>
                  <input
                    type="email"
                    className="lp-input"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@company.com"
                    required
                    autoComplete="email"
                  />
                </div>

                <div className="lp-field">
                  <label className="lp-label">Password</label>
                  <div className="lp-input-wrap">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="lp-input"
                      style={{ paddingRight: 40 }}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      className="lp-eye-btn"
                      onClick={() => setShowPassword(p => !p)}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <button type="submit" className="lp-submit" disabled={isLoading}>
                  {isLoading
                    ? <><Loader2 size={16} className="lp-spin" /> Signing in…</>
                    : 'Sign In'
                  }
                </button>
              </form>
            </div>

            <p className="lp-footer">© 2026 GeoTime QCMC. All rights reserved.</p>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;

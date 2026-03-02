import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Shield, Smartphone, Info } from 'lucide-react';
import { useTheme } from '@/components/theme-provider';

interface SettingsPageProps {
  biometricEnabled: boolean;
  onBiometricToggle: (enabled: boolean) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ biometricEnabled, onBiometricToggle }) => {
  const [isNative, setIsNative] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    setIsAndroid(Capacitor.getPlatform() === 'android');
    setPlatformReady(true);
  }, []);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .settings-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          min-height: 100vh;
          padding: 0;
          color: hsl(var(--foreground));
          position: relative;
          overflow-x: hidden;
        }

        .settings-root::before {
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

        .settings-root::after {
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

        .settings-content { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }

        .settings-card {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 22px;
          box-shadow: 0 20px 40px hsl(var(--foreground) / 0.08);
          opacity: 0;
          transform: translateY(14px);
          animation: settingsFadeUp 0.5s ease forwards;
        }

        @keyframes settingsFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .settings-header {
          display: flex;
          align-items: center;
          gap: 14px;
        }

        .settings-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .settings-title { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); }
        .settings-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .settings-section {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 20px;
          margin-top: 16px;
          opacity: 0;
          transform: translateY(12px);
          animation: settingsFadeUp 0.5s ease 0.1s forwards;
        }

        .settings-row { display: flex; align-items: flex-start; gap: 14px; }
        .settings-row-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: hsl(var(--foreground) / 0.06);
          border: 1px solid hsl(var(--border));
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .settings-label { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); }
        .settings-desc { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }
        .settings-muted { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 8px; }

        .settings-switch {
          position: relative;
          display: inline-flex;
          height: 34px;
          width: 54px;
          flex-shrink: 0;
          align-items: center;
          border-radius: 999px;
          padding: 4px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--muted));
          transition: background 0.2s, border-color 0.2s;
        }
        .settings-switch.on { background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85)); border-color: hsl(var(--primary) / 0.4); }
        .settings-thumb {
          height: 24px;
          width: 24px;
          border-radius: 999px;
          background: hsl(var(--card));
          box-shadow: 0 6px 14px hsl(var(--foreground) / 0.2);
          transition: transform 0.2s;
        }
        .settings-thumb.on { transform: translateX(20px); }

        .settings-note {
          margin-top: 12px;
          display: flex;
          align-items: flex-start;
          gap: 8px;
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }

        .settings-theme-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin-top: 12px;
        }

        .settings-theme-btn {
          padding: 8px 12px;
          border-radius: 10px;
          border: 1px solid hsl(var(--border));
          background: hsl(var(--foreground) / 0.04);
          color: hsl(var(--foreground));
          font-size: 12px;
          font-weight: 600;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }
        .settings-theme-btn.active {
          border-color: hsl(var(--primary) / 0.5);
          background: hsl(var(--primary) / 0.15);
          color: hsl(var(--foreground));
        }
      `}</style>

      <div className="settings-root">
        <div className="settings-content">
          <div className="settings-card">
            <div className="settings-header">
              <div className="settings-icon">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <div className="settings-title">Settings</div>
                <div className="settings-sub">Device preferences</div>
              </div>
            </div>

            {!platformReady && (
              <div className="settings-section">
                <p className="settings-desc">Loading device settings...</p>
              </div>
            )}

            {platformReady && isNative && (
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-icon">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div className="settings-label">Appearance</div>
                    <div className="settings-desc">Choose Light, Dark, or follow System.</div>
                    <div className="settings-theme-row">
                      {(['light', 'dark', 'system'] as const).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`settings-theme-btn ${theme === option ? 'active' : ''}`}
                          onClick={() => setTheme(option)}
                        >
                          {option === 'light' ? 'Light' : option === 'dark' ? 'Dark' : 'System'}
                        </button>
                      ))}
                    </div>
                    <div className="settings-muted">Current: {theme}</div>
                  </div>
                </div>
              </div>
            )}

            {platformReady && isNative && isAndroid && (
              <div className="settings-section">
                <div className="settings-row">
                  <div className="settings-row-icon">
                    <Smartphone className="w-4 h-4 text-muted-foreground" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                      <div>
                        <div className="settings-label">Require biometrics</div>
                        <div className="settings-desc">
                          Use fingerprint or face recognition before check in/out.
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => onBiometricToggle(!biometricEnabled)}
                        className={`settings-switch ${biometricEnabled ? 'on' : ''}`}
                        role="switch"
                        aria-checked={biometricEnabled}
                        aria-label="Require biometrics for check in or check out"
                      >
                        <span className={`settings-thumb ${biometricEnabled ? 'on' : ''}`} />
                      </button>
                    </div>
                    <div className="settings-muted">
                      Currently {biometricEnabled ? 'on' : 'off'}.
                    </div>
                    <div className="settings-note">
                      <Info className="w-4 h-4 mt-0.5 text-muted-foreground" />
                      <p>
                        This setting is stored on this device only. Default is off. When enabled,
                        biometrics will be required for check in/out.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;

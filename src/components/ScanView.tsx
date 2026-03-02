import React from 'react';
import { QrCode, LogIn, LogOut, Loader2 } from 'lucide-react';

interface GeoStatus {
  checking: boolean;
  allowed: boolean;
  message: string;
  distanceMeters?: number;
  initialized: boolean;
}

interface ScanViewProps {
  nextCheckType: 'in' | 'out';
  checkinLoading: boolean;
  geoStatus: GeoStatus;
  showBiometricHint: boolean;
  onCheckin: (type: 'in' | 'out') => void;
}

const ScanView: React.FC<ScanViewProps> = ({
  nextCheckType,
  checkinLoading,
  geoStatus,
  showBiometricHint,
  onCheckin,
}) => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .scan-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          min-height: 100vh;
          padding: 0;
          color: hsl(var(--foreground));
          position: relative;
          overflow-x: hidden;
        }

        .scan-root::before {
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

        .scan-root::after {
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

        .scan-content { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }

        .scan-card {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 20px 40px hsl(var(--foreground) / 0.08);
          animation: scanFadeUp 0.5s ease forwards;
          opacity: 0;
          transform: translateY(16px);
        }

        @keyframes scanFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .scan-header {
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid hsl(var(--border));
          position: relative;
          overflow: hidden;
        }

        .scan-header::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }

        .scan-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .scan-title { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); }
        .scan-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .scan-body { padding: 24px; }

        .scan-btn {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 10px;
          padding: 28px;
          border-radius: 16px;
          color: white;
          border: 1px solid hsl(var(--border));
          transition: transform 0.15s, opacity 0.2s, border-color 0.2s;
          font-family: 'Sora', sans-serif;
        }

        .scan-btn:hover { transform: translateY(-2px); border-color: hsl(var(--primary) / 0.3); }
        .scan-btn:active { transform: translateY(0); }

        .scan-btn.in {
          background: linear-gradient(135deg, #22c55e, #16a34a);
        }
        .scan-btn.out {
          background: linear-gradient(135deg, #ef4444, #dc2626);
        }
        .scan-btn.disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .scan-status {
          margin-top: 14px;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .scan-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
        }

        .scan-hint {
          margin-top: 10px;
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }
      `}</style>

      <div className="scan-root">
        <div className="scan-content">
          <div className="scan-card">
            <div className="scan-header">
              <div className="scan-icon">
                <QrCode className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="scan-title">Quick Check-in</div>
                <div className="scan-sub">
                  Tap to {nextCheckType === 'in' ? 'check in' : 'check out'}
                </div>
              </div>
            </div>

            <div className="scan-body">
              <button
                onClick={() => onCheckin(nextCheckType)}
                disabled={!geoStatus.allowed || checkinLoading || !geoStatus.initialized}
                className={`scan-btn ${nextCheckType === 'in' ? 'in' : 'out'} ${
                  !geoStatus.allowed || checkinLoading || !geoStatus.initialized ? 'disabled' : ''
                }`}
              >
                {checkinLoading ? (
                  <Loader2 className="w-10 h-10 animate-spin" />
                ) : nextCheckType === 'in' ? (
                  <LogIn className="w-10 h-10" />
                ) : (
                  <LogOut className="w-10 h-10" />
                )}
                <span className="font-semibold text-lg">
                  {checkinLoading ? 'Processing...' : nextCheckType === 'in' ? 'Check In' : 'Check Out'}
                </span>
              </button>

              <div className="scan-status">
                <span
                  className="scan-status-dot"
                  style={{ background: geoStatus.allowed ? '#22c55e' : '#ef4444' }}
                />
                <span>
                  {!geoStatus.initialized ? 'Checking location...' : geoStatus.message}
                  {geoStatus.distanceMeters !== undefined ? ` (${geoStatus.distanceMeters.toFixed(1)}m)` : ''}
                </span>
              </div>

              {showBiometricHint && (
                <div className="scan-hint">
                  Biometric authentication is required on Android for check in/out.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ScanView;

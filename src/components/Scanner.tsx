import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Employee, Checkin } from '@/types';
import { erpRequest } from '@/lib/erpApi';
import { Camera, QrCode, Check, X, Loader2, LogIn, LogOut, Coffee, Play, MapPin } from 'lucide-react';

interface ScannerProps {
  employee: Employee;
  onCheckin: (checkin: Checkin) => void;
}

const Scanner: React.FC<ScannerProps> = ({ employee, onCheckin }) => {
  const [scanning, setScanning]       = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [success, setSuccess]         = useState<string | null>(null);
  const [error, setError]             = useState<string | null>(null);
  const [loading, setLoading]         = useState(false);
  const [selectedType, setSelectedType] = useState<'in' | 'out' | 'break_start' | 'break_end'>('in');
  const [manualCode, setManualCode]   = useState('');
  const videoRef  = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkTypes = [
    { type: 'in'          as const, label: 'Check In',   icon: LogIn,  accent: '#22c55e', bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.25)'   },
    { type: 'out'         as const, label: 'Check Out',  icon: LogOut, accent: '#ef4444', bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.25)'   },
    { type: 'break_start' as const, label: 'Start Break',icon: Coffee, accent: '#f59e0b', bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.25)' },
    { type: 'break_end'   as const, label: 'End Break',  icon: Play,   accent: '#3b82f6', bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.25)' },
  ];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setScanning(true);
      }
    } catch {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraActive(false);
    setScanning(false);
  };

  const performCheckin = useCallback(async (scanCode?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      // Get GPS location
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      }).catch(() => null);

      const latitude = position?.coords.latitude ?? 0;
      const longitude = position?.coords.longitude ?? 0;

      // Call ERP API to create check-in
      const checkinRes = await erpRequest(
        '/api/method/qcmc_logic.api.login_scan.create_employee_checkin',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            log_type: selectedType === 'in' || selectedType === 'break_end' ? 'IN' : 'OUT',
            latitude,
            longitude,
            device_id: `mobile-${employee.id}`,
            scan_code: scanCode || `MANUAL-${Date.now()}`,
            custom_location: employee.custom_location || undefined,
          },
        }
      );

      if (!checkinRes.ok) {
        const payload = checkinRes.data?.message ?? checkinRes.data;
        throw new Error(
          payload?.error || 'Check-in failed. Please try again.'
        );
      }

      const payload = checkinRes.data?.message ?? checkinRes.data;
      const checkin: Checkin = {
        id: payload?.checkin?.name || `CHK-${Date.now()}`,
        employee_id: employee.id,
        check_type: selectedType,
        timestamp: payload?.checkin?.time || new Date().toISOString(),
        location: payload?.checkin?.location || employee.custom_location || 'Location',
        scan_code: scanCode || `MANUAL-${Date.now()}`,
        latitude,
        longitude,
      };

      setSuccess(`${selectedType.replace('_', ' ')} successful`);
      onCheckin(checkin);
      stopCamera();
      setManualCode('');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  }, [employee.id, selectedType, onCheckin]);

  useEffect(() => {
    if (!scanning || !cameraActive) return;
    const t = setTimeout(() => {
      performCheckin(`EMP-${employee.id.slice(0, 8)}-${Date.now()}`);
    }, 2500);
    return () => clearTimeout(t);
  }, [scanning, cameraActive, employee.id, performCheckin]);

  useEffect(() => () => stopCamera(), []);

  const activeType = checkTypes.find(c => c.type === selectedType)!;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .sc { font-family: 'Sora', sans-serif; max-width: 560px; margin: 0 auto; display: flex; flex-direction: column; gap: 14px; animation: scFade 0.4s ease both; }
        @keyframes scFade { from { opacity:0; transform: translateY(10px); } to { opacity:1; transform: translateY(0); } }

        /* ── Header ── */
        .sc-header {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--card)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 22px 26px;
          display: flex; align-items: center; gap: 14px;
          position: relative; overflow: hidden;
        }
        .sc-header::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }
        .sc-header-glow { position: absolute; top: -60px; right: -60px; width: 180px; height: 180px; background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%); border-radius: 50%; }
        .sc-header-icon { width: 44px; height: 44px; border-radius: 12px; background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85)); display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 3px hsl(var(--primary) / 0.2); flex-shrink: 0; position: relative; }
        .sc-header-title { font-size: 18px; font-weight: 700; color: hsl(var(--foreground)); }
        .sc-header-sub   { font-size: 13px; color: hsl(var(--muted-foreground)); margin-top: 3px; }

        /* ── Toast messages ── */
        .sc-toast {
          border-radius: 14px; padding: 14px 16px;
          display: flex; align-items: center; gap: 12px;
          animation: toastIn 0.3s cubic-bezier(0.16,1,0.3,1) both;
        }
        @keyframes toastIn { from { opacity:0; transform: translateY(-6px); } to { opacity:1; transform: translateY(0); } }
        .sc-toast-success { background: rgba(34,197,94,0.08); border: 1px solid rgba(34,197,94,0.2); }
        .sc-toast-error   { background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2); }
        .sc-toast-icon { width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; }
        .sc-toast-title { font-size: 13px; font-weight: 600; }
        .sc-toast-sub   { font-size: 12px; margin-top: 2px; font-family: 'JetBrains Mono', monospace; }

        /* ── Card shell ── */
        .sc-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }
        .sc-card-section {
          padding: 18px 20px;
          border-bottom: 1px solid hsl(var(--foreground) / 0.05);
        }
        .sc-card-section:last-child { border-bottom: none; }
        .sc-section-label {
          font-size: 11px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.07em; color: hsl(var(--muted-foreground));
          margin-bottom: 12px;
        }

        /* ── Action type grid ── */
        .sc-types { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
        .sc-type-btn {
          display: flex; align-items: center; gap: 10px;
          padding: 12px 14px; border-radius: 12px;
          border: 1px solid rgba(255,255,255,0.07);
          background: rgba(255,255,255,0.03);
          cursor: pointer; transition: all 0.15s;
          font-family: 'Sora', sans-serif; text-align: left;
        }
        .sc-type-btn:hover { background: hsl(var(--border)); }
        .sc-type-icon { width: 34px; height: 34px; border-radius: 9px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
        .sc-type-label { font-size: 13px; font-weight: 500; color: hsl(var(--muted-foreground)); }

        /* ── Camera view ── */
        .sc-viewport {
          position: relative;
          background: hsl(var(--background));
          border-radius: 12px;
          overflow: hidden;
          aspect-ratio: 16/9;
        }
        .sc-video { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* Scan frame */
        .sc-frame {
          position: absolute; inset: 0;
          display: flex; align-items: center; justify-content: center;
        }
        .sc-frame-box {
          width: 160px; height: 160px;
          position: relative;
        }
        .sc-corner {
          position: absolute; width: 20px; height: 20px;
          border-color: hsl(var(--primary)); border-style: solid; border-width: 0;
        }
        .sc-corner-tl { top: 0; left: 0; border-top-width: 3px; border-left-width: 3px; border-radius: 4px 0 0 0; }
        .sc-corner-tr { top: 0; right: 0; border-top-width: 3px; border-right-width: 3px; border-radius: 0 4px 0 0; }
        .sc-corner-bl { bottom: 0; left: 0; border-bottom-width: 3px; border-left-width: 3px; border-radius: 0 0 0 4px; }
        .sc-corner-br { bottom: 0; right: 0; border-bottom-width: 3px; border-right-width: 3px; border-radius: 0 0 4px 0; }

        .sc-scanline {
          position: absolute; left: 4px; right: 4px; top: 4px;
          height: 2px; border-radius: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary)), transparent);
          animation: scanline 1.8s ease-in-out infinite;
        }
        @keyframes scanline { 0%,100% { top: 4px; opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 50% { top: calc(100% - 6px); } }

        .sc-idle {
          position: absolute; inset: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px;
          color: hsl(var(--muted-foreground) / 0.8);
        }
        .sc-idle p    { font-size: 14px; color: hsl(var(--muted-foreground)); }
        .sc-idle span { font-size: 12px; color: hsl(var(--muted-foreground) / 0.8); }

        /* Loading overlay */
        .sc-loading-overlay {
          position: absolute; inset: 0;
          background: rgba(0,0,0,0.6); backdrop-filter: blur(4px);
          display: flex; align-items: center; justify-content: center;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .sc-spin { animation: spin 0.8s linear infinite; }

        /* Camera buttons */
        .sc-cam-btns { display: flex; gap: 10px; margin-top: 12px; }
        .sc-btn-start {
          flex: 1; padding: 11px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          border: none; border-radius: 11px;
          color: white; font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: opacity 0.2s, transform 0.15s;
          font-family: 'Sora', sans-serif;
          box-shadow: 0 4px 14px rgba(99,102,241,0.25);
        }
        .sc-btn-start:hover { opacity: 0.9; transform: translateY(-1px); }

        .sc-btn-stop {
          flex: 1; padding: 11px;
          background: hsl(var(--foreground) / 0.05);
          border: 1px solid hsl(var(--foreground) / 0.08);
          border-radius: 11px;
          color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 7px;
          transition: all 0.15s;
          font-family: 'Sora', sans-serif;
        }
        .sc-btn-stop:hover { background: hsl(var(--destructive) / 0.08); color: hsl(var(--destructive)); border-color: hsl(var(--destructive) / 0.2); }

        /* Divider */
        .sc-divider { display: flex; align-items: center; gap: 12px; margin: 2px 0; }
        .sc-divider-line { flex: 1; height: 1px; background: hsl(var(--foreground) / 0.05); }
        .sc-divider-label { font-size: 11px; color: hsl(var(--muted-foreground) / 0.8); white-space: nowrap; }

        /* Manual input */
        .sc-manual { display: flex; gap: 10px; }
        .sc-input {
          flex: 1; padding: 11px 14px;
          background: hsl(var(--foreground) / 0.04);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px;
          color: hsl(var(--foreground)); font-size: 13px;
          outline: none; transition: border-color 0.2s, background 0.2s;
          font-family: 'JetBrains Mono', monospace;
        }
        .sc-input::placeholder { color: hsl(var(--muted-foreground) / 0.8); }
        .sc-input:focus { border-color: rgba(99,102,241,0.4); background: rgba(99,102,241,0.05); }

        .sc-btn-submit {
          padding: 11px 18px;
          background: hsl(var(--foreground) / 0.05);
          border: 1px solid hsl(var(--foreground) / 0.08);
          border-radius: 10px;
          color: hsl(var(--muted-foreground)); font-size: 13px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; gap: 6px;
          transition: all 0.15s;
          font-family: 'Sora', sans-serif; white-space: nowrap;
        }
        .sc-btn-submit:hover:not(:disabled) { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary) / 0.3); }
        .sc-btn-submit:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Location row */
        .sc-location { display: flex; align-items: center; gap: 8px; font-size: 12px; color: hsl(var(--muted-foreground) / 0.8); }
      `}</style>

      <div className="sc">

        {/* Header */}
        <div className="sc-header">
          <div className="sc-header-glow" />
          <div className="sc-header-icon"><QrCode size={20} color="white" /></div>
          <div style={{ position: 'relative' }}>
            <div className="sc-header-title">Scan to Check In</div>
            <div className="sc-header-sub">Use QR code or enter manually</div>
          </div>
        </div>

        {/* Success toast */}
        {success && (
          <div className="sc-toast sc-toast-success">
            <div className="sc-toast-icon" style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.2)' }}>
              <Check size={16} color="#22c55e" />
            </div>
            <div>
              <div className="sc-toast-title" style={{ color: '#4ade80' }}>{success}</div>
              <div className="sc-toast-sub" style={{ color: '#166534' }}>
                {new Date().toLocaleTimeString()} · {new Date().toLocaleDateString()}
              </div>
            </div>
          </div>
        )}

        {/* Error toast */}
        {error && (
          <div className="sc-toast sc-toast-error">
            <div className="sc-toast-icon" style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.2)' }}>
              <X size={16} color="#ef4444" />
            </div>
            <div>
              <div className="sc-toast-title" style={{ color: '#f87171' }}>Error</div>
              <div className="sc-toast-sub" style={{ color: '#7f1d1d' }}>{error}</div>
            </div>
          </div>
        )}

        {/* Main card */}
        <div className="sc-card">

          {/* Action type selector */}
          <div className="sc-card-section">
            <div className="sc-section-label">Select Action</div>
            <div className="sc-types">
              {checkTypes.map(({ type, label, icon: Icon, accent, bg, border }) => {
                const active = selectedType === type;
                return (
                  <button
                    key={type}
                    className="sc-type-btn"
                    style={active ? { background: bg, borderColor: border } : {}}
                    onClick={() => setSelectedType(type)}
                  >
                    <div className="sc-type-icon" style={{ background: active ? bg : 'hsl(var(--foreground) / 0.04)', border: `1px solid ${active ? border : 'hsl(var(--border))'}` }}>
                      <Icon size={15} color={active ? accent : 'hsl(var(--muted-foreground))'} />
                    </div>
                    <span className="sc-type-label" style={active ? { color: accent } : {}}>
                      {label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Camera */}
          <div className="sc-card-section">
            <div className="sc-section-label">Camera Scanner</div>
            <div className="sc-viewport">
              {cameraActive ? (
                <>
                  <video ref={videoRef} autoPlay playsInline className="sc-video" />
                  <div className="sc-frame">
                    <div className="sc-frame-box">
                      <span className="sc-corner sc-corner-tl" />
                      <span className="sc-corner sc-corner-tr" />
                      <span className="sc-corner sc-corner-bl" />
                      <span className="sc-corner sc-corner-br" />
                      {scanning && <div className="sc-scanline" />}
                    </div>
                  </div>
                  {loading && (
                    <div className="sc-loading-overlay">
                      <Loader2 size={36} color="white" className="sc-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="sc-idle">
                  <Camera size={40} style={{ opacity: 0.2 }} />
                  <p>Camera not active</p>
                  <span>Click below to start scanning</span>
                </div>
              )}
            </div>

            <div className="sc-cam-btns">
              {!cameraActive ? (
                <button className="sc-btn-start" onClick={startCamera}>
                  <Camera size={15} /> Start Camera
                </button>
              ) : (
                <button className="sc-btn-stop" onClick={stopCamera}>
                  <X size={15} /> Stop Camera
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="sc-card-section" style={{ paddingTop: 4, paddingBottom: 4 }}>
            <div className="sc-divider">
              <div className="sc-divider-line" />
              <span className="sc-divider-label">or enter code manually</span>
              <div className="sc-divider-line" />
            </div>
          </div>

          {/* Manual entry */}
          <div className="sc-card-section">
            <div className="sc-section-label">Manual Entry</div>
            <div className="sc-manual">
              <input
                type="text"
                className="sc-input"
                value={manualCode}
                onChange={e => setManualCode(e.target.value)}
                placeholder="Enter check-in code…"
                onKeyDown={e => e.key === 'Enter' && !loading && performCheckin(manualCode || undefined)}
              />
              <button
                className="sc-btn-submit"
                onClick={() => performCheckin(manualCode || undefined)}
                disabled={loading}
              >
                {loading
                  ? <Loader2 size={14} className="sc-spin" />
                  : <Check size={14} />
                }
                Submit
              </button>
            </div>
          </div>

          {/* Location */}
          <div className="sc-card-section" style={{ paddingTop: 12, paddingBottom: 14 }}>
            <div className="sc-location">
              <MapPin size={12} color="hsl(var(--muted-foreground))" />
              Location: Main Office
            </div>
          </div>

        </div>
      </div>
    </>
  );
};

export default Scanner;

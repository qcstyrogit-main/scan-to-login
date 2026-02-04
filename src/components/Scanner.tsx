import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Employee, Checkin } from '@/types';
import { Camera, QrCode, Check, X, Loader2, LogIn, LogOut, Coffee, Play, MapPin } from 'lucide-react';

interface ScannerProps {
  employee: Employee;
  onCheckin: (checkin: Checkin) => void;
}

const Scanner: React.FC<ScannerProps> = ({ employee, onCheckin }) => {
  const [scanning, setScanning] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<'in' | 'out' | 'break_start' | 'break_end'>('in');
  const [manualCode, setManualCode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const checkTypes = [
    { type: 'in' as const, label: 'Check In', icon: LogIn, color: 'bg-green-500 hover:bg-green-600' },
    { type: 'out' as const, label: 'Check Out', icon: LogOut, color: 'bg-red-500 hover:bg-red-600' },
    { type: 'break_start' as const, label: 'Start Break', icon: Coffee, color: 'bg-amber-500 hover:bg-amber-600' },
    { type: 'break_end' as const, label: 'End Break', icon: Play, color: 'bg-blue-500 hover:bg-blue-600' },
  ];

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setCameraActive(true);
        setScanning(true);
      }
    } catch (err) {
      setError('Unable to access camera. Please check permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
    setScanning(false);
  };

  const performCheckin = async (scanCode?: string) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error: funcError } = await supabase.functions.invoke('employee-checkin', {
        body: {
          employeeId: employee.id,
          checkType: selectedType,
          scanCode: scanCode || `MANUAL-${Date.now()}`,
          location: 'Main Office'
        }
      });

      if (funcError || !data.success) {
        setError(data?.error || 'Check-in failed. Please try again.');
        setLoading(false);
        return;
      }

      setSuccess(data.message);
      onCheckin(data.checkin);
      stopCamera();
      setManualCode('');

      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Simulate QR code detection
  useEffect(() => {
    if (scanning && cameraActive) {
      const timer = setTimeout(() => {
        const simulatedCode = `EMP-${employee.id.slice(0, 8)}-${Date.now()}`;
        performCheckin(simulatedCode);
      }, 2500);
      return () => clearTimeout(timer);
    }
  }, [scanning, cameraActive]);

  useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Scan to Check In</h2>
              <p className="text-blue-100 text-sm">Use QR code or enter manually</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <Check className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-green-800">{success}</p>
                <p className="text-green-600 text-sm">
                  {new Date().toLocaleTimeString()} - {new Date().toLocaleDateString()}
                </p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center flex-shrink-0">
                <X className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-red-800">Error</p>
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Check Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-slate-700 mb-3">Select Action</label>
            <div className="grid grid-cols-2 gap-3">
              {checkTypes.map(({ type, label, icon: Icon, color }) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all ${
                    selectedType === type
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${color}`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <span className={`font-medium ${selectedType === type ? 'text-blue-700' : 'text-slate-700'}`}>
                    {label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Camera View */}
          <div className="mb-6">
            <div className="relative bg-slate-900 rounded-xl overflow-hidden aspect-video">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-full object-cover"
                  />
                  {/* Scanning overlay */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-4 border-white/50 rounded-2xl relative">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-lg"></div>
                      {scanning && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-full h-1 bg-blue-400 animate-pulse"></div>
                        </div>
                      )}
                    </div>
                  </div>
                  {/* Loading indicator */}
                  {loading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-12 h-12 text-white animate-spin" />
                    </div>
                  )}
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                  <Camera className="w-16 h-16 mb-4" />
                  <p className="text-lg font-medium">Camera not active</p>
                  <p className="text-sm">Click the button below to start scanning</p>
                </div>
              )}
            </div>

            <div className="flex gap-3 mt-4">
              {!cameraActive ? (
                <button
                  onClick={startCamera}
                  className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
                >
                  <Camera className="w-5 h-5" />
                  Start Camera
                </button>
              ) : (
                <button
                  onClick={stopCamera}
                  className="flex-1 bg-slate-600 text-white py-3 rounded-xl font-semibold hover:bg-slate-700 transition-all flex items-center justify-center gap-2"
                >
                  <X className="w-5 h-5" />
                  Stop Camera
                </button>
              )}
            </div>
          </div>

          {/* Divider */}
          <div className="relative mb-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-white px-4 text-sm text-slate-500">or enter code manually</span>
            </div>
          </div>

          {/* Manual Entry */}
          <div className="flex gap-3">
            <input
              type="text"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value)}
              placeholder="Enter check-in code"
              className="flex-1 px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none"
            />
            <button
              onClick={() => performCheckin(manualCode || undefined)}
              disabled={loading}
              className="px-6 py-3 bg-slate-800 text-white rounded-xl font-semibold hover:bg-slate-900 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Check className="w-5 h-5" />}
              Submit
            </button>
          </div>

          {/* Location Info */}
          <div className="mt-6 flex items-center gap-2 text-slate-500 text-sm">
            <MapPin className="w-4 h-4" />
            <span>Location: Main Office</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Scanner;

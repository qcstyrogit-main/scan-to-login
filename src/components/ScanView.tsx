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
    <div className="max-w-2xl mx-auto">
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <QrCode className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Quick Check-in</h2>
              <p className="text-blue-100 text-sm">
                Tap to {nextCheckType === 'in' ? 'check in' : 'check out'}
              </p>
            </div>
          </div>
        </div>
        <div className="p-6">
          <button
            onClick={() => onCheckin(nextCheckType)}
            disabled={!geoStatus.allowed || checkinLoading || !geoStatus.initialized}
            className={`w-full flex flex-col items-center gap-3 p-8 rounded-xl text-white transition-all ${
              nextCheckType === 'in'
                ? 'bg-green-500 hover:bg-green-600'
                : 'bg-red-500 hover:bg-red-600'
            } ${
              !geoStatus.allowed || checkinLoading || !geoStatus.initialized
                ? 'opacity-60 cursor-not-allowed'
                : ''
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
          <p className={`mt-4 text-sm ${geoStatus.allowed ? 'text-green-600' : 'text-red-600'}`}>
            {!geoStatus.initialized ? 'Checking location...' : geoStatus.message}
            {geoStatus.distanceMeters !== undefined ? ` (${geoStatus.distanceMeters.toFixed(1)}m)` : ''}
          </p>
          {showBiometricHint && (
            <p className="mt-2 text-xs text-slate-500">
              Biometric authentication is required on Android for check in/out.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanView;

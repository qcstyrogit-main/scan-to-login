import React, { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { Shield, Smartphone, Info } from 'lucide-react';

interface SettingsPageProps {
  biometricEnabled: boolean;
  onBiometricToggle: (enabled: boolean) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ biometricEnabled, onBiometricToggle }) => {
  const [isNative, setIsNative] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [platformReady, setPlatformReady] = useState(false);

  useEffect(() => {
    setIsNative(Capacitor.isNativePlatform());
    setIsAndroid(Capacitor.getPlatform() === 'android');
    setPlatformReady(true);
  }, []);

  return (
    <div className="max-w-2xl mx-auto space-y-6 px-4 sm:px-0">
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 sm:p-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Shield className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-800">Settings</h2>
            <p className="text-sm text-slate-500">Device preferences</p>
          </div>
        </div>
      </div>

      {!platformReady && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <p className="text-sm text-slate-500">Loading device settings...</p>
        </div>
      )}

      {platformReady && isNative && isAndroid && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
              <Smartphone className="w-5 h-5 text-slate-600" />
            </div>
            <div className="flex-1">
              <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-slate-800">Require biometrics</h3>
                  <p className="text-sm text-slate-500">
                    Use fingerprint or face recognition before check in/out.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onBiometricToggle(!biometricEnabled)}
                  className={`relative inline-flex h-9 w-14 flex-shrink-0 items-center rounded-full p-1 shadow-inner transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/60 ${
                    biometricEnabled ? 'bg-blue-600' : 'bg-slate-300'
                  }`}
                  role="switch"
                  aria-checked={biometricEnabled}
                  aria-label="Require biometrics for check in or check out"
                >
                  <span
                    className={`h-7 w-7 rounded-full bg-white shadow-md transition-transform ${
                      biometricEnabled ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Currently {biometricEnabled ? 'on' : 'off'}.
              </p>
              <div className="mt-4 flex items-start gap-2 text-xs text-slate-500">
                <Info className="w-4 h-4 mt-0.5 text-slate-400" />
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
  );
};

export default SettingsPage;

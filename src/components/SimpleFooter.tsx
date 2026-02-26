import React from 'react';
import { Clock } from 'lucide-react';

const SimpleFooter: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg flex items-center justify-center">
              <Clock className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold">GeoTime QCMC</span>
          </div>
          <p className="text-slate-400 text-sm">(c) 2026 GeoTime QCMC. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
};

export default SimpleFooter;

import React from 'react';
import { Clock } from 'lucide-react';

const SimpleFooter: React.FC = () => {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

        .footer-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border-top: 1px solid hsl(var(--border));
          position: relative;
          overflow: hidden;
        }
        @media (max-width: 767px) {
          .footer-root { display: block; padding-bottom: calc(64px + env(safe-area-inset-bottom)); }
        }

        .footer-root::before {
          content: '';
          position: absolute;
          top: -120px;
          right: -120px;
          width: 280px;
          height: 280px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%);
          pointer-events: none;
        }

        .footer-badge {
          width: 34px;
          height: 34px;
          border-radius: 10px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .footer-brand { font-weight: 700; color: hsl(var(--foreground)); }
        .footer-note { font-size: 12px; color: hsl(var(--muted-foreground)); }
      `}</style>

      <footer className="footer-root mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="footer-badge">
                <Clock className="w-4 h-4 text-white" />
              </div>
              <span className="footer-brand">GeoTime QCMC</span>
            </div>
            <p className="footer-note">(c) 2026 GeoTime QCMC. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </>
  );
};

export default SimpleFooter;

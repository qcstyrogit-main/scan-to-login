import React from 'react';
import appLogo from '@/assets/app-logo-transparent.png';

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

        .footer-logo {
          width: 42px;
          height: 42px;
          object-fit: contain;
          flex-shrink: 0;
        }

        .footer-brand { font-weight: 700; color: hsl(var(--foreground)); }
        .footer-note { font-size: 12px; color: hsl(var(--muted-foreground)); }
      `}</style>

      <footer className="footer-root mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <img src={appLogo} alt="GeoTime QCMC logo" className="footer-logo" />
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

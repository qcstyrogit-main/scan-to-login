import React from 'react';
import { Clock, Mail, Phone, MapPin, Github, Twitter, Linkedin } from 'lucide-react';

const Footer: React.FC = () => {
  return (
    <footer className="bg-slate-900 text-white mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="w-6 h-6 text-white" />
              </div>
              <span className="text-xl font-bold">TimeTrack Pro</span>
            </div>
            <p className="text-slate-400 mb-6 max-w-md">
              Streamline your workforce management with our modern employee check-in system. 
              Fast, secure, and reliable time tracking for businesses of all sizes.
            </p>
            <div className="flex gap-4">
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Twitter className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Linkedin className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center hover:bg-slate-700 transition-colors">
                <Github className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">About Us</a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Features</a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Pricing</a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Support</a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Privacy Policy</a>
              </li>
              <li>
                <a href="#" className="text-slate-400 hover:text-white transition-colors">Terms of Service</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h3 className="font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-3">
              <li className="flex items-center gap-3 text-slate-400">
                <Mail className="w-5 h-5 text-blue-400" />
                support@timetrackpro.com
              </li>
              <li className="flex items-center gap-3 text-slate-400">
                <Phone className="w-5 h-5 text-blue-400" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-start gap-3 text-slate-400">
                <MapPin className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                123 Business Ave, Suite 100<br />
                San Francisco, CA 94102
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 mt-10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-slate-400 text-sm">
            © 2026 TimeTrack Pro. All rights reserved.
          </p>
          <div className="flex gap-6">
            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Privacy</a>
            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Terms</a>
            <a href="#" className="text-slate-400 hover:text-white text-sm transition-colors">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

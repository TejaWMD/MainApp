import React from 'react';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import wmdLogo from '../assets/wmd-logo.jpg';
import '../styles/login.css';

interface RestrictedPageProps {
  onGoToHub: () => void;
}

export const RestrictedPage: React.FC<RestrictedPageProps> = ({ onGoToHub }) => {
  return (
    <div className="login-screen">
      <div className="login-card text-center">
        {/* Brand Header — logo centered above title */}
        <div className="login-brand">
          <div className="login-logo-frame">
            <img src={wmdLogo} alt="WMD Hub" className="login-logo-img" />
          </div>
          <div className="login-brand-text">
            <span className="login-brand-name">WMD</span>
            <span className="login-brand-accent">Hub</span>
          </div>
        </div>

        {/* Concise Restriction Notice */}
        <div className="login-form-box text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#83121c]/10 border border-[#83121c]/25 text-[#83121c] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#14260f]">
              Access Restricted
            </h2>
          </div>

          <button
            type="button"
            onClick={onGoToHub}
            className="login-submit-btn"
          >
            <span>Go to WMD Hub</span>
            <ArrowRight className="login-submit-arrow" />
          </button>
        </div>
      </div>
    </div>
  );
};
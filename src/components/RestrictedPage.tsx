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
        {/* Brand Header */}
        <div className="mb-4">
          <div className="login-logo-frame">
            <img src={wmdLogo} alt="WMD Hub" className="login-logo-img" />
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-[#193116] tracking-tight">
            WMD <span className="text-[#bf944b]">Hub</span>
          </h1>
        </div>

        {/* Concise Restriction Notice */}
        <div className="login-form-box text-center space-y-3.5">
          <div className="w-11 h-11 rounded-xl bg-[#83121c]/10 border border-[#83121c]/20 text-[#83121c] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#193116]">
              Access Restricted
            </h2>
            <p className="text-xs sm:text-[13px] font-medium text-[#193116]/70 leading-relaxed">
              This link is no longer active. Please access through the{' '}
              <span className="font-bold text-[#193116]">WMD Hub</span> link.
            </p>
          </div>

          <button
            type="button"
            onClick={onGoToHub}
            className="login-submit-btn"
          >
            <span>Go to WMD Hub</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

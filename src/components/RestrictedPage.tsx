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
        {/* Compact Brand Header */}
        <div className="mb-3.5">
          <div className="login-logo-frame">
            <img src={wmdLogo} alt="WMD Hub" className="login-logo-img" />
          </div>
          <h1 className="text-lg sm:text-xl font-extrabold text-[#09234e] tracking-tight leading-tight">
            WMD <span className="text-[#d49b27]">Hub</span>
          </h1>
        </div>

        {/* Concise Restriction Notice */}
        <div className="login-form-box text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-[#c81e2b]/10 border border-[#c81e2b]/20 text-[#c81e2b] flex items-center justify-center mx-auto">
            <ShieldAlert className="w-5 h-5" />
          </div>

          <div className="space-y-1">
            <h2 className="text-sm sm:text-base font-extrabold text-[#09234e]">
              Access Restricted
            </h2>
            <p className="text-xs font-medium text-[#09234e]/70 leading-relaxed">
              Open this workspace from <span className="font-bold text-[#09234e]">WMD Hub</span>.
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

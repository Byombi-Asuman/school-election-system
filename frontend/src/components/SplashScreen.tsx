import React from 'react';
import { Icons } from './ui/Icons';

export const SplashScreen: React.FC<{ fadingOut: boolean }> = ({ fadingOut }) => (
  <div
    className={`fixed inset-0 z-[200] bg-gradient-to-br from-primary-700 via-primary-800 to-slate-900 flex items-center justify-center transition-opacity duration-300 ${
      fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
    }`}
  >
    <div className="flex flex-col items-center gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-2xl bg-white/10 backdrop-blur flex items-center justify-center">
        <Icons.Shield className="w-9 h-9 text-white" />
      </div>
      <span className="font-display font-bold text-lg text-white tracking-wide">School Elections</span>
    </div>
  </div>
);
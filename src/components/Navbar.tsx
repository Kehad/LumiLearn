import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LayoutDashboard, Sparkles } from 'lucide-react';

export default function Navbar() {
  const location = useLocation();

  return (
    <nav className="glass-panel sticky top-0 z-50 border-b border-white/5 px-6 py-4">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-amber-400 p-0.5 shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform duration-300">
            <div className="w-full h-full bg-[#080710] rounded-[10px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-indigo-400 group-hover:text-amber-300 transition-colors" />
            </div>
          </div>
          <div>
            <span className="font-bold text-xl tracking-tight bg-gradient-to-r from-white via-gray-100 to-indigo-300 bg-clip-text text-transparent">
              LumiLearn
            </span>
            <span className="block text-[10px] font-medium tracking-widest text-indigo-400 uppercase">
              Equal-Ability Study
            </span>
          </div>
        </Link>

        {/* Links */}
        <div className="flex items-center gap-4">
          <Link
            to="/"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              location.pathname === '/'
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Study
          </Link>
          <Link
            to="/dashboard"
            className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              location.pathname === '/dashboard'
                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
                : 'text-gray-400 hover:text-gray-200 hover:bg-white/5 border border-transparent'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            Dashboard
          </Link>
        </div>
      </div>
    </nav>
  );
}

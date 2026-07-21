import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Lesson from './pages/Lesson';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Router>
      <div className="relative min-h-screen bg-slate-50 text-slate-800 overflow-hidden font-sans selection:bg-indigo-500/20">
        {/* Dynamic Background Elements */}
        <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-300/40 blur-[120px] animate-pulse" />
          <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-purple-300/30 blur-[100px] animate-pulse" style={{ animationDelay: '2s', animationDuration: '4s' }} />
          <div className="absolute top-[30%] right-[15%] w-[30%] h-[30%] rounded-full bg-blue-300/20 blur-[80px] animate-pulse" style={{ animationDelay: '1s', animationDuration: '5s' }} />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          {/* Navigation Header */}
          <Navbar />

          {/* Main Content Area */}
          <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-8 md:px-8">
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/lesson/:id" element={<Lesson />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Routes>
          </main>

          {/* Footer */}
          <footer className="border-t border-slate-200 py-8 bg-white/60 backdrop-blur-xl mt-auto">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col md:flex-row items-center justify-between text-sm text-slate-500 gap-4">
              <div className="flex flex-col items-center md:items-start text-center md:text-left">
                <span className="font-semibold text-slate-800">LumiLearn Explainer Portal</span>
                <span className="block mt-1.5 text-xs text-slate-500">Durable generative education for Nigerian secondary classrooms</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs tracking-wide">Backblaze B2</span>
                <span className="px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 text-xs tracking-wide">Genblaze</span>
              </div>
            </div>
          </footer>
        </div>
      </div>
    </Router>
  );
}

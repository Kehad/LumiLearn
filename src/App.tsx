import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Lesson from './pages/Lesson';
import Dashboard from './pages/Dashboard';

export default function App() {
  return (
    <Router>
      <div className="flex flex-col min-h-screen bg-[#080710] text-gray-200">
        {/* Navigation Header */}
        <Navbar />

        {/* Main Content Area */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 py-6 md:px-8">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/lesson/:id" element={<Lesson />} />
            <Route path="/dashboard" element={<Dashboard />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-white/5 py-6 bg-black/30">
          <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between text-xs text-gray-500 gap-4">
            <div>
              <span className="font-semibold text-gray-400">LumiLearn Explainer Portal</span>
              <span className="block mt-1">Durable generative education for Nigerian secondary classrooms</span>
            </div>
            <div className="flex gap-4">
              <span>Backblaze B2 Storage Integration</span>
              <span>•</span>
              <span>Genblaze Orchestrated Pipeline</span>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}

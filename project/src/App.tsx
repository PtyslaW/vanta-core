import { BrowserRouter, Routes, Route, NavLink } from 'react-router-dom';
import { Trophy, Mail, Calendar, Home, Menu, X, Crown } from 'lucide-react';
import { useState } from 'react';
import Leaderboard from './pages/Leaderboard';
import Announcements from './pages/Announcements';
import Contests from './pages/Contests';

function App() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { to: '/', icon: Home, label: 'Panel Glowny' },
    { to: '/leaderboard', icon: Trophy, label: 'Ranking' },
    { to: '/announcements', icon: Mail, label: 'Ogloszenia' },
    { to: '/contests', icon: Calendar, label: 'Konkursy' },
  ];

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0b0713] text-white font-sans">
        {/* Header */}
        <header className="sticky top-0 z-50 bg-[#120b24]/95 backdrop-blur-sm border-b border-purple-900/30">
          <div className="max-w-6xl mx-auto px-4 py-3">
            <div className="flex items-center justify-between">
              {/* Logo */}
              <NavLink to="/" className="flex items-center gap-3 group">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-lg bg-gradient-to-r from-pink-400 to-purple-400 bg-clip-text text-transparent">
                    VANTA CORE
                  </div>
                  <div className="text-[10px] text-purple-400 tracking-widest">CLUB PORTAL</div>
                </div>
              </NavLink>

              {/* Desktop Nav */}
              <nav className="hidden md:flex items-center gap-1">
                {navItems.map(({ to, icon: Icon, label }) => (
                  <NavLink
                    key={to}
                    to={to}
                    className={({ isActive }) =>
                      `flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                        isActive
                          ? 'bg-purple-600/30 text-pink-400 border border-purple-500/50'
                          : 'text-purple-300 hover:text-pink-400 hover:bg-purple-900/30'
                      }`
                    }
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{label}</span>
                  </NavLink>
                ))}
              </nav>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-purple-300 hover:text-pink-400"
              >
                {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

            {/* Mobile Nav */}
            {mobileMenuOpen && (
              <nav className="md:hidden mt-3 pt-3 border-t border-purple-900/30">
                <div className="flex flex-col gap-1">
                  {navItems.map(({ to, icon: Icon, label }) => (
                    <NavLink
                      key={to}
                      to={to}
                      onClick={() => setMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${
                          isActive
                            ? 'bg-purple-600/30 text-pink-400'
                            : 'text-purple-300 hover:bg-purple-900/30'
                        }`
                      }
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </NavLink>
                  ))}
                </div>
              </nav>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="max-w-6xl mx-auto px-4 py-6">
          <Routes>
            <Route path="/" element={<Leaderboard mode="home" />} />
            <Route path="/leaderboard" element={<Leaderboard mode="full" />} />
            <Route path="/announcements" element={<Announcements />} />
            <Route path="/contests" element={<Contests />} />
          </Routes>
        </main>

        {/* Footer */}
        <footer className="border-t border-purple-900/30 mt-auto">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="text-center text-xs text-purple-400/50">
              JEDEN RDZEN. JEDEN CEL. ZWYCIESTWO.
            </div>
          </div>
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;

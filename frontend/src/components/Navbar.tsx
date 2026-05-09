import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

interface NavbarProps {
  onReport: () => void;
  onLogout: () => void;
}

const NAV_LINKS = [
  { label: 'Dashboard',   href: '/dashboard',  section: '#dashboard' },
  { label: 'Incidents',   href: '/dashboard',  section: '#incidents' },
  { label: 'Report',      href: '/create',     section: null         },
  { label: 'Trajectory',  href: '/trajectory', section: null         },
  { label: 'Analytics',   href: '/dashboard',  section: '#analytics' },
];

export default function Navbar({ onReport, onLogout }: NavbarProps) {
  const [scrolled,  setScrolled]  = useState(false);
  const [menuOpen,  setMenuOpen]  = useState(false);
  const location = useLocation();
  const navigate  = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  const isActive = (href: string) => location.pathname === href;

  const handleNavClick = (link: typeof NAV_LINKS[0]) => {
    if (link.section) {
      if (location.pathname !== '/dashboard') {
        navigate('/dashboard');
        setTimeout(() => document.querySelector(link.section!)?.scrollIntoView({ behavior: 'smooth' }), 120);
      } else {
        document.querySelector(link.section!)?.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      navigate(link.href);
    }
    setMenuOpen(false);
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled ? 'glass mx-4 mt-3 rounded-2xl' : 'bg-transparent'
      }`}
      role="navigation"
      aria-label="Main navigation"
    >
      <div className="max-w-7xl mx-auto px-5 py-4 flex items-center justify-between gap-4">

        {/* Logo */}
        <button
          className="flex items-center gap-2.5 shrink-0 group"
          onClick={() => navigate('/dashboard')}
          aria-label="Go to dashboard"
        >
          <div className="relative w-8 h-8">
            <div className="absolute inset-0 rounded-full border border-neon opacity-50"
              style={{ animation: 'ping 2.4s cubic-bezier(0,0,0.2,1) infinite' }} />
            <div className="absolute inset-1.5 rounded-full bg-neon group-hover:scale-110 transition-transform duration-200" />
          </div>
          <span className="font-grotesk text-cream text-lg tracking-widest uppercase">IRTDP</span>
        </button>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map(link => {
            const active = isActive(link.href);
            return (
              <button
                key={link.label}
                onClick={() => handleNavClick(link)}
                className={`relative font-mono text-xs px-3 py-2 rounded-lg tracking-widest uppercase transition-all duration-200 ${
                  active
                    ? 'text-neon'
                    : 'text-cream/50 hover:text-cream/80 hover:bg-white/[0.04]'
                }`}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
                {link.href === '/trajectory' && (
                  <span
                    className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-neon"
                    style={{ boxShadow: '0 0 6px rgba(111,255,0,0.9)' }}
                    aria-label="new"
                  />
                )}
                {active && (
                  <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-neon"
                    style={{ boxShadow: '0 0 6px rgba(111,255,0,0.8)' }} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right cluster */}
        <div className="hidden md:flex items-center gap-3">
          <LivePill />
          <button className="btn-neon text-xs py-2 px-5" onClick={onReport}>
            Report Incident
          </button>
          <button
            onClick={onLogout}
            className="font-mono text-xs text-cream/25 hover:text-red-400 transition-colors tracking-widest uppercase px-2 py-1.5 rounded-lg hover:bg-red-400/5"
            title="Sign out"
          >
            Sign Out
          </button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2 rounded-lg hover:bg-white/[0.06] transition-colors"
          onClick={() => setMenuOpen(v => !v)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          <span className={`block w-5 h-[1.5px] bg-cream transition-all duration-300 ${menuOpen ? 'rotate-45 translate-y-1.5' : ''}`} />
          <span className={`block w-5 h-[1.5px] bg-cream transition-all duration-300 ${menuOpen ? 'opacity-0 scale-x-0' : ''}`} />
          <span className={`block w-5 h-[1.5px] bg-cream transition-all duration-300 ${menuOpen ? '-rotate-45 -translate-y-1.5' : ''}`} />
        </button>
      </div>

      {/* Mobile drawer */}
      <div className={`md:hidden overflow-hidden transition-all duration-300 ease-in-out ${menuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="glass mx-4 mb-4 rounded-2xl px-5 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(link => (
            <button
              key={link.label}
              onClick={() => handleNavClick(link)}
              className={`text-left font-mono text-sm px-3 py-2.5 rounded-xl tracking-widest uppercase transition-all flex items-center justify-between ${
                isActive(link.href) ? 'text-neon bg-neon/8' : 'text-cream/60 hover:text-cream hover:bg-white/[0.05]'
              }`}
              aria-current={isActive(link.href) ? 'page' : undefined}
            >
              {link.label}
              {link.href === '/trajectory' && (
                <span className="font-mono text-[9px] text-neon tracking-widest">NEW</span>
              )}
            </button>
          ))}
          <div className="border-t border-white/[0.07] mt-2 pt-3 flex flex-col gap-2">
            <button className="btn-neon text-xs py-2.5" onClick={() => { onReport(); setMenuOpen(false); }}>
              Report Incident
            </button>
            <button onClick={onLogout}
              className="font-mono text-xs text-cream/30 hover:text-red-400 transition-colors tracking-widest uppercase py-2 text-center">
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}

function LivePill() {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
      style={{ background: 'rgba(111,255,0,0.08)', border: '1px solid rgba(111,255,0,0.2)' }}>
      <span className="w-1.5 h-1.5 rounded-full bg-neon"
        style={{ animation: 'pulse 2s cubic-bezier(0.4,0,0.6,1) infinite', boxShadow: '0 0 6px rgba(111,255,0,0.8)' }} />
      <span className="font-mono text-neon text-[10px] tracking-widest">LIVE</span>
    </div>
  );
}

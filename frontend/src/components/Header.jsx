import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Camera, Search, Home, BarChart3, LogOut, User, Building2 } from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../contexts/AuthContext.jsx';
import toast from 'react-hot-toast';

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isCitizen, isOfficial, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const headerRef = useRef(null);
  const logoRef = useRef(null);
  const navRef = useRef(null);

  useEffect(() => {
    if (headerRef.current) {
      gsap.fromTo(headerRef.current,
        { y: -100, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }
      );
    }
    if (logoRef.current) {
      gsap.fromTo(logoRef.current,
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.6, delay: 0.2, ease: "back.out(1.7)" }
      );
    }
    if (navRef.current) {
      gsap.fromTo(navRef.current.children,
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.5, delay: 0.4, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      setShowUserMenu(false);
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
      toast.error('Error signing out. Please try again.');
    }
  };

  const getNavItems = () => {
    if (isCitizen()) {
      return [
        { path: '/dashboard', label: 'My Complaints', icon: User },
        { path: '/', label: 'Home', icon: Home },
        { path: '/report', label: 'Report Issue', icon: Camera },
        { path: '/track', label: 'Track Complaint', icon: Search },
      ];
    } else if (isOfficial()) {
      return [
        { path: '/dashboard', label: 'Department Dashboard', icon: Building2 },
        { path: '/admin-dashboard', label: 'All Complaints', icon: BarChart3 },
      ];
    }
    return [];
  };

  const navItems = getNavItems();

  return (
    <header ref={headerRef} className="glass sticky top-0 z-50 border-b border-white/20 backdrop-blur-xl">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-20">
          <Link to="/" className="flex items-center space-x-3 group">
            <div 
              ref={logoRef}
              className="w-12 h-12 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-glow transition-all duration-300 group-hover:scale-110"
            >
              <Camera className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-bold gradient-text">Civic Reporter</span>
          </Link>
          
          <nav ref={navRef} className="hidden md:flex space-x-2">
            {navItems.map(({ path, label, icon: Icon }) => (
              <Link
                key={path}
                to={path}
                className={`group flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-300 ${
                  location.pathname === path
                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg shadow-blue-400/50'
                    : 'text-gray-800 hover:bg-white/70 hover:text-blue-600'
                }`}
              >
                <Icon className={`w-4 h-4 transition-transform duration-300 ${location.pathname === path ? '' : 'group-hover:scale-110'}`} />
                <span>{label}</span>
              </Link>
            ))}
          </nav>

          {/* User Menu */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center space-x-2 px-4 py-2 rounded-xl text-sm font-medium text-gray-700 hover:bg-white/50 transition-all duration-300 hover:scale-105"
            >
              {isCitizen() ? (
                <div className="w-8 h-8 bg-gradient-to-br from-blue-300 to-cyan-400 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4 text-white" />
                </div>
              ) : (
                <div className="w-8 h-8 bg-gradient-to-br from-indigo-300 to-blue-400 rounded-lg flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
              )}
              <span className="hidden md:block max-w-[150px] truncate">{user?.email}</span>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-56 glass rounded-2xl shadow-modern py-2 z-50 animate-fade-in-up">
                <div className="px-4 py-3 text-sm text-gray-700 border-b border-white/20">
                  <div className="font-semibold text-gray-900">{user?.email}</div>
                  <div className="text-xs text-gray-500 mt-1">
                    {isCitizen() ? 'Citizen' : `${user?.department} Official`}
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-2 w-full px-4 py-2 text-sm text-gray-700 hover:bg-white/50 transition-all duration-300 rounded-lg mx-2"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button className="p-2 rounded-xl text-gray-600 hover:bg-white/50 transition-all duration-300">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;

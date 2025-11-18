import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, User, Shield, Building2, Eye, EyeOff, UserPlus } from 'lucide-react';
import { gsap } from 'gsap';
import { useAuth } from '../contexts/AuthContext.jsx';
import { CITIZEN_DASHBOARD_PATH, DEPARTMENT_DASHBOARD_PATH } from '../constants/routes';
import toast from 'react-hot-toast';

const Login = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [userType, setUserType] = useState('citizen');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    displayName: '',
    department: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { signIn, signUp, isAuthenticated, isCitizen, isOfficial } = useAuth();
  const containerRef = useRef(null);
  const formRef = useRef(null);
  const logoRef = useRef(null);

  // GSAP Animations
  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, scale: 0.9 },
        { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" }
      );
    }
    if (logoRef.current) {
      gsap.fromTo(logoRef.current,
        { scale: 0, rotation: -180 },
        { scale: 1, rotation: 0, duration: 0.6, delay: 0.2, ease: "back.out(1.7)" }
      );
    }
    if (formRef.current) {
      gsap.fromTo(formRef.current.children,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, delay: 0.4, stagger: 0.1, ease: "power2.out" }
      );
    }
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated()) {
      if (isCitizen()) {
        navigate(CITIZEN_DASHBOARD_PATH);
      } else if (isOfficial()) {
        navigate(DEPARTMENT_DASHBOARD_PATH);
      }
    }
  }, [isAuthenticated, isCitizen, isOfficial, navigate]);

  const departments = [
    'Public Works',
    'Water Department', 
    'Traffic Department',
    'Sanitation',
    'Health Department',
    'Education Department'
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (isSignUp) {
        // Sign Up
        if (formData.password !== formData.confirmPassword) {
          toast.error('Passwords do not match');
          setIsLoading(false);
          return;
        }

        if (formData.password.length < 6) {
          toast.error('Password must be at least 6 characters');
          setIsLoading(false);
          return;
        }

        if (userType === 'official' && !formData.department) {
          toast.error('Please select a department');
          setIsLoading(false);
          return;
        }

        const userData = {
          displayName: formData.displayName || formData.email.split('@')[0],
          userType,
          department: userType === 'official' ? formData.department : null
        };

        const result = await signUp(formData.email, formData.password, userData);
        
        if (result.success) {
          toast.success('Account created successfully!');
          setTimeout(() => {
            if (userType === 'citizen') {
              navigate(CITIZEN_DASHBOARD_PATH);
            } else {
              navigate(DEPARTMENT_DASHBOARD_PATH);
            }
          }, 500);
        } else {
          toast.error(result.error || 'Sign up failed. Please try again.');
        }
      } else {
        // Sign In
        const result = await signIn(formData.email, formData.password);
        
        if (result.success) {
          toast.success('Signed in successfully!');
          setTimeout(() => {
            if (isCitizen()) {
              navigate(CITIZEN_DASHBOARD_PATH);
            } else if (isOfficial()) {
              navigate(DEPARTMENT_DASHBOARD_PATH);
            } else {
              navigate(CITIZEN_DASHBOARD_PATH);
            }
          }, 500);
        } else {
          // Handle specific Firebase auth errors
          let errorMessage = 'Sign in failed. Please try again.';
          if (result.error.includes('user-not-found')) {
            errorMessage = 'No account found with this email. Please sign up first.';
          } else if (result.error.includes('wrong-password')) {
            errorMessage = 'Incorrect password. Please try again.';
          } else if (result.error.includes('invalid-email')) {
            errorMessage = 'Invalid email address.';
          } else if (result.error.includes('too-many-requests')) {
            errorMessage = 'Too many failed attempts. Please try again later.';
          }
          toast.error(errorMessage);
        }
      }
    } catch (error) {
      toast.error('An error occurred. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  // Reset confirm password when switching modes
  useEffect(() => {
    if (!isSignUp) {
      setFormData(prev => ({ ...prev, confirmPassword: '' }));
    }
  }, [isSignUp]);

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative">
      <div ref={containerRef} className="max-w-md w-full space-y-6">
        <div className="text-center">
          <div 
            ref={logoRef}
            className="mx-auto h-16 w-16 bg-gradient-to-br from-blue-400 to-cyan-400 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-400/50 mb-4"
          >
            <Shield className="h-8 w-8 text-white" />
          </div>
          <h2 className="text-4xl font-bold gradient-text mb-2">
            Welcome to Civic Reporter
          </h2>
          <p className="text-gray-600">
            {isSignUp ? 'Create an account' : 'Sign in to report issues or manage complaints'}
          </p>
        </div>

        {/* Toggle between Sign In and Sign Up */}
        <div className="glass rounded-2xl p-2 shadow-modern">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                setIsSignUp(false);
                setFormData(prev => ({ ...prev, confirmPassword: '', displayName: '' }));
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                !isSignUp
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg shadow-blue-400/50'
                  : 'bg-white/70 text-gray-800 hover:bg-white/90'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSignUp(true);
                setFormData(prev => ({ ...prev, confirmPassword: '', displayName: '' }));
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center space-x-2 ${
                isSignUp
                  ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg shadow-blue-400/50'
                  : 'bg-white/70 text-gray-800 hover:bg-white/90'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Sign Up</span>
            </button>
          </div>
        </div>

        {/* User Type Selection */}
        <div ref={formRef} className="glass rounded-2xl p-6 shadow-modern">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              I am a:
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setUserType('citizen')}
                className={`p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  userType === 'citizen'
                    ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-cyan-50 text-blue-800 shadow-lg shadow-blue-400/20'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-white/70'
                }`}
              >
                <User className="w-8 h-8 mx-auto mb-2 text-blue-600" />
                <span className="font-semibold block">Citizen</span>
                <p className="text-xs text-gray-500 mt-1">Report issues</p>
              </button>
              
              <button
                type="button"
                onClick={() => setUserType('official')}
                className={`p-5 rounded-xl border-2 transition-all duration-300 hover:scale-105 ${
                  userType === 'official'
                    ? 'border-indigo-400 bg-gradient-to-br from-indigo-50 to-blue-50 text-indigo-800 shadow-lg shadow-indigo-400/20'
                    : 'border-gray-200 hover:border-indigo-300 hover:bg-white/70'
                }`}
              >
                <Building2 className="w-8 h-8 mx-auto mb-2 text-indigo-600" />
                <span className="font-semibold block">Official</span>
                <p className="text-xs text-gray-500 mt-1">Manage complaints</p>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Display Name Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="displayName" className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name (Optional)
                </label>
                <input
                  id="displayName"
                  name="displayName"
                  type="text"
                  value={formData.displayName}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  placeholder="Enter your name"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  placeholder="Enter your email"
                />
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                  placeholder="Enter your password"
                  minLength={isSignUp ? 6 : undefined}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-gray-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-gray-400" />
                  )}
                </button>
              </div>
              {isSignUp && (
                <p className="mt-1 text-xs text-gray-500">Must be at least 6 characters</p>
              )}
            </div>

            {/* Confirm Password Field (Sign Up only) */}
            {isSignUp && (
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="w-full px-4 py-3 pr-12 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {/* Department Field (for officials) */}
            {userType === 'official' && (
              <div>
                <label htmlFor="department" className="block text-sm font-medium text-gray-700 mb-2">
                  Department
                </label>
                <select
                  id="department"
                  name="department"
                  required
                  value={formData.department}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                >
                  <option value="">Select your department</option>
                  {departments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-400 to-cyan-400 text-white py-4 px-6 rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2 shadow-lg shadow-blue-400/50 hover:shadow-xl hover:shadow-blue-400/60 hover:scale-105 disabled:hover:scale-100"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>{isSignUp ? 'Creating account...' : 'Signing in...'}</span>
                </>
              ) : (
                <>
                  {isSignUp ? <UserPlus className="w-5 h-5" /> : <LogIn className="w-5 h-5" />}
                  <span>{isSignUp ? 'Sign Up' : 'Sign In'}</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-sm text-gray-600 glass rounded-xl p-4">
          {!isSignUp ? (
            <p>
              Don't have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(true)}
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-300"
              >
                Sign up here
              </button>
            </p>
          ) : (
            <p>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsSignUp(false)}
                className="text-blue-600 hover:text-blue-700 font-semibold transition-colors duration-300"
              >
                Sign in here
              </button>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;

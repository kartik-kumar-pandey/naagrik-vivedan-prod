import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { gsap } from 'gsap';
import { AuthProvider, useAuth } from './contexts/AuthContext.jsx';
import Header from './components/Header.jsx';
import Login from './pages/Login.jsx';
import Home from './pages/Home.jsx';
import ReportIssue from './pages/ReportIssue.jsx';
import TrackComplaint from './pages/TrackComplaint.jsx';
import MapView from './pages/MapView.jsx';
import ComplaintsDashboard from './pages/ComplaintsDashboard.jsx';
import DepartmentDashboard from './pages/DepartmentDashboard.jsx';
import CitizenDashboard from './pages/CitizenDashboard.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import { CITIZEN_DASHBOARD_PATH, DEPARTMENT_DASHBOARD_PATH } from './constants/routes';
import './App.css';

function AppContent() {
  const [userLocation, setUserLocation] = useState(null);
  const { isAuthenticated, isLoading, isCitizen, isOfficial } = useAuth();
  const mainRef = useRef(null);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    // Check for Firebase configuration
    const firebaseVars = [
      { key: 'VITE_FIREBASE_API_KEY', legacy: 'REACT_APP_FIREBASE_API_KEY' },
      { key: 'VITE_FIREBASE_AUTH_DOMAIN', legacy: 'REACT_APP_FIREBASE_AUTH_DOMAIN' },
      { key: 'VITE_FIREBASE_DATABASE_URL', legacy: 'REACT_APP_FIREBASE_DATABASE_URL' },
      { key: 'VITE_FIREBASE_PROJECT_ID', legacy: 'REACT_APP_FIREBASE_PROJECT_ID' },
    ];
    
    const missingVars = firebaseVars
      .filter(({ key, legacy }) => {
        return !(import.meta.env?.[key] || import.meta.env?.[legacy]);
      })
      .map(({ key }) => key);
    
    if (missingVars.length > 0) {
      console.error('Missing Firebase environment variables:', missingVars);
      setHasError(true);
      setErrorMessage(`Missing Firebase configuration. Please set: ${missingVars.join(', ')}`);
    }

    if (mainRef.current) {
      gsap.fromTo(mainRef.current, 
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, []);

  // Show error message if Firebase is not configured
  if (hasError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100 p-4">
        <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-red-600 mb-4">⚠️ Configuration Error</h1>
          <p className="text-gray-700 mb-4">{errorMessage}</p>
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
            <p className="text-sm text-gray-700">
              <strong>To fix this:</strong>
            </p>
            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm text-gray-600">
              <li>Go to Vercel Dashboard → Your Project → Settings → Environment Variables</li>
              <li>Add all 7 Firebase environment variables</li>
              <li>Set them for <strong>Production</strong>, <strong>Preview</strong>, AND <strong>Development</strong></li>
              <li>Redeploy your application</li>
            </ol>
          </div>
          <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
            <p className="text-sm text-gray-700">
              <strong>Required Variables:</strong>
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-gray-600 font-mono">
              <li>VITE_FIREBASE_API_KEY</li>
              <li>VITE_FIREBASE_AUTH_DOMAIN</li>
              <li>VITE_FIREBASE_DATABASE_URL</li>
              <li>VITE_FIREBASE_PROJECT_ID</li>
              <li>VITE_FIREBASE_STORAGE_BUCKET</li>
              <li>VITE_FIREBASE_MESSAGING_SENDER_ID</li>
              <li>VITE_FIREBASE_APP_ID</li>
              <li>VITE_API_BASE_URL</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-cyan-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow"></div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '1s' }}></div>
        <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-sky-200 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-pulse-slow" style={{ animationDelay: '2s' }}></div>
      </div>
      
      {isAuthenticated() && <Header />}
      <main ref={mainRef} className="relative z-10">
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<Home />} />
          <Route 
            path={CITIZEN_DASHBOARD_PATH} 
            element={
              <ProtectedRoute requiredRole="citizen">
                <CitizenDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/report" 
            element={
              <ProtectedRoute requiredRole="citizen">
                <ReportIssue userLocation={userLocation} setUserLocation={setUserLocation} />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/track" 
            element={
              <ProtectedRoute requiredRole="citizen">
                <TrackComplaint />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/map" 
            element={
              <ProtectedRoute requiredRole="citizen">
                <MapView />
              </ProtectedRoute>
            } 
          />
          <Route 
            path={DEPARTMENT_DASHBOARD_PATH} 
            element={
              <ProtectedRoute requiredRole="official">
                <DepartmentDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/admin-dashboard" 
            element={
              <ProtectedRoute requiredRole="official">
                <ComplaintsDashboard />
              </ProtectedRoute>
            } 
          />
          <Route 
            path="/dashboard"
            element={<DashboardRedirect />} 
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
      <Toaster 
        position="top-right"
        toastOptions={{
          style: {
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
          },
        }}
      />
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;

const DashboardRedirect = () => {
  const { isAuthenticated, isCitizen } = useAuth();

  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate 
      to={isCitizen() ? CITIZEN_DASHBOARD_PATH : DEPARTMENT_DASHBOARD_PATH} 
      replace 
    />
  );
};

import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { gsap } from 'gsap';
import ImageCapture from '../components/ImageCapture.jsx';
import LocationDetails from '../components/LocationDetails.jsx';
import MapPicker from '../components/MapPicker.jsx';
import { MapPin, FileText, Send, Loader } from 'lucide-react';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext.jsx';
import { createComplaint } from '../services/complaintsService';
import { API_BASE_URL } from '../config';

const ReportIssue = ({ userLocation, setUserLocation }) => {
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    image: null,
    issueType: '',
    description: '',
    latitude: null,
    longitude: null,
    address: '',
    locationDetails: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [classificationResult, setClassificationResult] = useState(null);
  const [manualLocationInput, setManualLocationInput] = useState('');
  const [showManualLocation, setShowManualLocation] = useState(false);
  const [deviceCoords, setDeviceCoords] = useState(null);
  const [geoAccuracy, setGeoAccuracy] = useState(null);
  const [geoTimestamp, setGeoTimestamp] = useState(null);
  const [geoWatchId, setGeoWatchId] = useState(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.6, ease: "power2.out" }
      );
    }
  }, [step]);

  // Get user location
  useEffect(() => {
    if (!userLocation) {
      getCurrentLocation();
    } else {
      setFormData(prev => ({
        ...prev,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        address: userLocation.address
      }));
    }
  }, [userLocation]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }

    // Clear any previous watch
    if (geoWatchId != null) {
      try { 
        navigator.geolocation.clearWatch(geoWatchId); 
      } catch {}
      setGeoWatchId(null);
    }

    // Use watchPosition for high accuracy (same as improveAccuracy)
    // This continuously updates location until accurate or timeout
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        
        const location = {
          latitude,
          longitude,
          address: 'Getting address...'
        };
        
        setGeoAccuracy(accuracy || null);
        setGeoTimestamp(new Date(position.timestamp));
        setDeviceCoords({ latitude, longitude });
        setFormData(prev => ({
          ...prev,
          latitude,
          longitude
        }));
        setUserLocation(location);
        
        // Get address from coordinates
        getAddressFromCoords(latitude, longitude);
        
        // Stop early if accuracy is good (<= 20 meters)
        if (accuracy != null && accuracy <= 20) {
          try { 
            navigator.geolocation.clearWatch(watchId); 
          } catch {}
          setGeoWatchId(null);
          toast.success('High-accuracy location acquired');
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        let errorMessage = 'Unable to get your location. ';
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += 'Please allow location access and try again.';
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += 'Location information is unavailable.';
            break;
          case error.TIMEOUT:
            errorMessage += 'Location request timed out. Please try again.';
            break;
          default:
            errorMessage += 'Please enable location services.';
            break;
        }
        toast.error(errorMessage);
        // Clear watch on error
        try { 
          navigator.geolocation.clearWatch(watchId); 
        } catch {}
        setGeoWatchId(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 20000,
        maximumAge: 0 // force fresh reading
      }
    );

    setGeoWatchId(watchId);
    
    // Safety stop after 15 seconds if accuracy hasn't been achieved
    setTimeout(() => {
      if (geoWatchId === watchId) {
        try { 
          navigator.geolocation.clearWatch(watchId); 
        } catch {}
        setGeoWatchId(null);
        // Only show message if we still don't have good accuracy
        if (geoAccuracy === null || geoAccuracy > 20) {
          toast('Location accuracy improved. You can continue or click "Improve Accuracy" for better precision.', { icon: '📍' });
        }
      }
    }, 15000);
    
    toast('Acquiring high-accuracy location...', { icon: '📍' });
  };

  // Start a short "precision" session to refine GPS, auto-stops when accurate or timed out
  const improveAccuracy = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by this browser.');
      return;
    }
    // Clear any previous watch
    if (geoWatchId != null) {
      try { navigator.geolocation.clearWatch(geoWatchId); } catch {}
      setGeoWatchId(null);
    }
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setGeoAccuracy(accuracy || null);
        setGeoTimestamp(new Date(position.timestamp));
        setDeviceCoords({ latitude, longitude });
        setFormData(prev => ({ ...prev, latitude, longitude }));
        setUserLocation(prev => ({ ...(prev || {}), latitude, longitude }));
        getAddressFromCoords(latitude, longitude);
        // Stop early if accuracy is good
        if (accuracy != null && accuracy <= 20) {
          try { navigator.geolocation.clearWatch(watchId); } catch {}
          setGeoWatchId(null);
          toast.success('High-accuracy location acquired');
        }
      },
      (error) => {
        console.error('Accuracy watch error:', error);
        toast.error('Unable to improve location accuracy.');
        try { navigator.geolocation.clearWatch(watchId); } catch {}
        setGeoWatchId(null);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000
      }
    );
    setGeoWatchId(watchId);
    // Safety stop after 15s
    setTimeout(() => {
      try { navigator.geolocation.clearWatch(watchId); } catch {}
      setGeoWatchId(null);
    }, 15000);
    toast('Improving location accuracy...', { icon: '📍' });
  };

  const getAddressFromCoords = async (lat, lng) => {
    try {
      // Use OpenStreetMap's Nominatim service for reverse geocoding
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&zoom=18&namedetails=1`,
        {
          headers: {
            'Accept-Language': 'en',
            'User-Agent': 'CivicIssuesApp/1.0'
          }
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch address data');
      }
      
      const data = await response.json();
      console.log('Geocoding response:', data);
      
      if (data && data.address) {
        // Enhanced address data processing
        const enhancedAddress = {
          street: data.address.road || data.address.street || data.address.footway || data.address.path || 'N/A',
          area: data.address.neighbourhood || data.address.suburb || data.address.residential || data.address.hamlet || 'N/A',
          city: data.address.city || data.address.town || data.address.village || data.address.municipality || data.address.county || 'N/A',
          state: data.address.state || data.address.province || data.address.region || 'N/A',
          pinCode: data.address.postcode || data.address.postal_code || 'N/A',
          country: data.address.country || 'N/A',
          completeAddress: data.display_name || `${lat}, ${lng}`,
          coordinates: { latitude: lat, longitude: lng }
        };
        
        const address = enhancedAddress.completeAddress;
        setFormData(prev => ({ ...prev, address, locationDetails: enhancedAddress }));
        setUserLocation(prev => ({ ...prev, address, locationDetails: enhancedAddress }));
      } else {
        // Fallback if no address data is found
        const fallbackAddress = {
          street: 'N/A',
          area: 'N/A',
          city: 'N/A',
          state: 'N/A',
          pinCode: 'N/A',
          country: 'N/A',
          completeAddress: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          coordinates: { latitude: lat, longitude: lng }
        };
        
        const address = fallbackAddress.completeAddress;
        setFormData(prev => ({ ...prev, address, locationDetails: fallbackAddress }));
        setUserLocation(prev => ({ ...prev, address, locationDetails: fallbackAddress }));
      }
    } catch (error) {
      console.error('Error getting address:', error);
      toast.error('Unable to get address details. Using coordinates only.');
      
      // Fallback on error
      const fallbackAddress = {
        street: 'N/A',
        area: 'N/A',
        city: 'N/A',
        state: 'N/A',
        pinCode: 'N/A',
        country: 'N/A',
        completeAddress: `Location: ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        coordinates: { latitude: lat, longitude: lng }
      };
      
      const address = fallbackAddress.completeAddress;
      setFormData(prev => ({ ...prev, address, locationDetails: fallbackAddress }));
      setUserLocation(prev => ({ ...prev, address, locationDetails: fallbackAddress }));
    }
  };

  const formatDistance = (lat1, lon1, lat2, lon2) => {
    try {
      const R = 6371e3; // metres
      const toRad = (deg) => deg * Math.PI / 180;
      const φ1 = toRad(lat1);
      const φ2 = toRad(lat2);
      const Δφ = toRad(lat2 - lat1);
      const Δλ = toRad(lon2 - lon1);

      const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ/2) * Math.sin(Δλ/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const d = R * c; // in metres
      if (d < 1000) {
        return `${Math.round(d)} m`;
      }
      return `${(d/1000).toFixed(2)} km`;
    } catch {
      return 'N/A';
    }
  };

  const handleManualLocationSubmit = () => {
    if (manualLocationInput.trim()) {
      const manualAddress = {
        street: 'N/A',
        area: 'N/A',
        city: 'N/A',
        state: 'N/A',
        pinCode: 'N/A',
        country: 'N/A',
        completeAddress: manualLocationInput.trim(),
        coordinates: { latitude: null, longitude: null }
      };
      
      setFormData(prev => ({ 
        ...prev, 
        address: manualLocationInput.trim(), 
        locationDetails: manualAddress 
      }));
      setUserLocation(prev => ({ 
        ...prev, 
        address: manualLocationInput.trim(), 
        locationDetails: manualAddress 
      }));
      setShowManualLocation(false);
      toast.success('Manual location set successfully');
    }
  };

  const handleImageCapture = (imageData) => {
    setFormData(prev => ({ ...prev, image: imageData }));
    setStep(2);
    classifyImage(imageData);
  };

  const handleImageUpload = (imageData) => {
    setFormData(prev => ({ ...prev, image: imageData }));
    setStep(2);
    classifyImage(imageData);
  };

  const classifyImage = async (imageData) => {
    setIsLoading(true);
    try {
      const response = await axios.post(`${API_BASE_URL}/api/classify-issue`, {
        image: imageData
      });
      setClassificationResult(response.data);
      setFormData(prev => ({ 
        ...prev, 
        issueType: response.data.issue_type 
      }));
    } catch (error) {
      // Surface backend error details to help diagnose
      const serverData = error?.response?.data;
      console.error('Classification error:', error, serverData);
      const detail = serverData?.detail || serverData?.error || error?.message || 'Unknown error';
      toast.error(`Failed to classify the image. ${detail}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!user || !user.uid) {
      toast.error('You must be logged in to submit a complaint.');
      navigate('/login');
      return;
    }

    if (!formData.issueType) {
      toast.error('Please select or confirm the issue type.');
      return;
    }

    if (!formData.description || formData.description.trim() === '') {
      toast.error('Please provide a description of the issue.');
      return;
    }

    setIsLoading(true);

    try {
      // Map issue types to departments (similar to backend logic)
      const getDepartmentForIssueType = (issueType) => {
        const departmentMap = {
          'potholes': 'Public Works',
          'garbage': 'Sanitation',
          'graffiti': 'Public Works',
          'fallen_trees': 'Public Works',
          'damaged_signs': 'Traffic Department',
          'illegal_parking': 'Traffic Department',
          'street_light': 'Public Works',
          'water_leak': 'Water Department',
          'traffic_signal': 'Traffic Department',
          'sidewalk_damage': 'Public Works',
          'drainage': 'Public Works',
          'health_issue': 'Health Department',
          'medical_emergency': 'Health Department',
          'school_issue': 'Education Department',
          'education_facility': 'Education Department'
        };
        return departmentMap[issueType] || 'Public Works';
      };

      // Determine priority based on issue type
      const getPriority = (issueType) => {
        const highPriorityTypes = ['medical_emergency', 'water_leak', 'traffic_signal'];
        return highPriorityTypes.includes(issueType) ? 'high' : 'normal';
      };

      // Prepare complaint data for Firebase
      const complaintData = {
        image: formData.image, // Base64 encoded image
        issueType: formData.issueType,
        description: formData.description.trim(),
        latitude: formData.latitude,
        longitude: formData.longitude,
        address: formData.address,
        locationDetails: formData.locationDetails,
        department: getDepartmentForIssueType(formData.issueType),
        priority: getPriority(formData.issueType),
        status: 'pending',
        classificationResult: classificationResult || null,
        formalComplaint: null, // Can be generated later if needed
        userName: user.displayName || user.email || 'Citizen',
        userEmail: user.email || '',
        submittedBy: user.displayName || user.email || 'Citizen'
      };

      // Save to Firebase Realtime Database
      const complaintId = await createComplaint(complaintData, user.uid);

      // Optionally, also save to backend for ML/formal complaint generation
      // You can uncomment this if you want to sync with your Flask backend
      /*
      try {
        const backendData = {
          image: formData.image,
          issue_type: formData.issueType,
          description: formData.description,
          latitude: formData.latitude,
          longitude: formData.longitude,
          address: formData.address,
          user_id: user.uid,
          firebase_id: complaintId // Link Firebase ID with backend
        };
        await axios.post(`${API_BASE_URL}/api/submit-complaint`, backendData);
      } catch (backendError) {
        console.warn('Failed to sync with backend, but saved to Firebase:', backendError);
        // Don't fail the whole submission if backend sync fails
      }
      */

      toast.success('Complaint submitted successfully!');
      navigate(`/track?complaint_id=${complaintId}`);
    } catch (error) {
      console.error('Submission error:', error);
      toast.error(error.message || 'Failed to submit complaint. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Issue types that match the ML model classes and additional manual options
  const issueTypes = [
    // ML Model Classes (6 categories from MobileNetV3)
    { value: 'damaged_signs', label: 'Damaged Signs', description: 'Traffic or road signs that are damaged' },
    { value: 'fallen_trees', label: 'Fallen Trees', description: 'Trees that have fallen or need removal' },
    { value: 'garbage', label: 'Garbage', description: 'Waste management issues' },
    { value: 'graffiti', label: 'Graffiti', description: 'Unauthorized graffiti or vandalism' },
    { value: 'illegal_parking', label: 'Illegal Parking', description: 'Vehicles parked illegally' },
    { value: 'potholes', label: 'Potholes', description: 'Road surface damage and potholes' },
    // Additional manual options (not classified by ML)
    { value: 'street_light', label: 'Street Light', description: 'Non-working street lights' },
    { value: 'water_leak', label: 'Water Leak', description: 'Water supply problems' },
    { value: 'traffic_signal', label: 'Traffic Signal', description: 'Traffic light issues' },
    { value: 'sidewalk_damage', label: 'Sidewalk Damage', description: 'Pedestrian pathway issues' },
    { value: 'drainage', label: 'Drainage', description: 'Water drainage problems' },
    // Health Department
    { value: 'health_issue', label: 'Health Issue', description: 'Public health concerns' },
    { value: 'medical_emergency', label: 'Medical Emergency', description: 'Medical emergency situations' },
    // Education Department
    { value: 'school_issue', label: 'School Issue', description: 'School-related problems' },
    { value: 'education_facility', label: 'Education Facility', description: 'Education facility issues' },
    // Default
    { value: 'other', label: 'Other', description: 'Other civic issues' }
  ];

  return (
    <div className="max-w-4xl mx-auto">
      <div ref={containerRef} className="glass rounded-2xl shadow-modern p-8">
        <h1 className="text-4xl font-bold gradient-text mb-8">Report a Civic Issue</h1>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-10">
          <div className="flex items-center space-x-4">
            {[1, 2, 3].map((stepNumber) => (
              <div key={stepNumber} className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                  step >= stepNumber 
                    ? 'bg-gradient-to-r from-blue-400 to-cyan-400 text-white shadow-lg shadow-blue-400/50 scale-110' 
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumber}
                </div>
                {stepNumber < 3 && (
                  <div className={`w-20 h-2 mx-3 rounded-full transition-all duration-300 ${
                    step > stepNumber ? 'bg-gradient-to-r from-blue-400 to-cyan-400' : 'bg-gray-200'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Step 1: Image Capture */}
        {step === 1 && (
          <div className="animate-fade-in-up">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Take or Upload a Photo</h2>
            <p className="text-gray-600 mb-6">
              Capture a clear photo of the issue or upload an existing image. 
              Our AI will automatically classify the type of issue.
            </p>
            
            {/* Location Details */}
            {formData.address && (
              <div className="mb-6">
                <LocationDetails 
                  location={formData.address} 
                  coordinates={{ latitude: formData.latitude, longitude: formData.longitude }}
                  detailedAddress={formData.locationDetails}
                />
                <div className="mt-3">
                  <p className="text-sm text-gray-600 mb-2">Adjust the pin if needed:</p>
                  <MapPicker
                    latitude={formData.latitude}
                    longitude={formData.longitude}
                    onChange={(lat, lng) => {
                      setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                      setUserLocation(prev => ({ ...(prev || {}), latitude: lat, longitude: lng }));
                      getAddressFromCoords(lat, lng);
                    }}
                  />
                  <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                    <button
                      type="button"
                      onClick={getCurrentLocation}
                      className="text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Use current location
                    </button>
                    <button
                      type="button"
                      onClick={improveAccuracy}
                      className="text-blue-600 hover:text-blue-700 font-medium ml-4"
                    >
                      Improve accuracy
                    </button>
                    {deviceCoords && formData.latitude != null && formData.longitude != null && (
                      <span>
                        Distance to pin: {formatDistance(deviceCoords.latitude, deviceCoords.longitude, formData.latitude, formData.longitude)}
                      </span>
                    )}
                  </div>
                  {(geoAccuracy != null || geoTimestamp) && (
                    <div className="mt-1 text-xs text-gray-500">
                      {geoAccuracy != null && <span>GPS accuracy ~ {Math.round(geoAccuracy)} m</span>}
                      {geoAccuracy != null && geoTimestamp && <span> • </span>}
                      {geoTimestamp && <span>updated {geoTimestamp.toLocaleTimeString()}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <ImageCapture
              onImageCapture={handleImageCapture}
              onImageUpload={handleImageUpload}
            />
          </div>
        )}

        {/* Step 2: Classification Results */}
        {step === 2 && (
          <div className="animate-fade-in-up">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Issue Classification</h2>
            
            {isLoading ? (
              <div className="text-center py-12">
                <Loader className="w-12 h-12 animate-spin mx-auto mb-4 text-blue-600" />
                <p className="text-gray-600 text-lg">Analyzing your image...</p>
              </div>
            ) : classificationResult ? (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-300 rounded-2xl p-6 mb-6 shadow-lg">
                <h3 className="text-xl font-bold text-green-800 mb-2">
                  Issue Detected: {classificationResult.issue_type.replace('_', ' ').toUpperCase()}
                </h3>
                <p className="text-green-700 font-semibold">
                  Confidence: {Math.round(classificationResult.confidence * 100)}%
                </p>
              </div>
            ) : null}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Issue Type
                </label>
                <select
                  value={formData.issueType}
                  onChange={(e) => setFormData(prev => ({ ...prev, issueType: e.target.value }))}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                >
                  <option value="">Select issue type</option>
                  {issueTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label} - {type.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Additional Details
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Provide any additional details about the issue..."
                  rows={4}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300 bg-white/50 backdrop-blur-sm"
                />
              </div>

              <div className="flex justify-between">
                <button
                  onClick={() => setStep(1)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-all duration-300 rounded-xl hover:bg-gray-100"
                >
                  ← Back
                </button>
                <button
                  onClick={() => setStep(3)}
                  disabled={!formData.issueType}
                  className="bg-gradient-to-r from-blue-400 to-cyan-400 text-white px-8 py-3 rounded-xl font-bold hover:from-blue-500 hover:to-cyan-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-400/50 hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                >
                  Continue →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Location and Submit */}
        {step === 3 && (
          <div className="animate-fade-in-up">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">Location & Submit</h2>
            
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Detailed Location Display */}
              <LocationDetails 
                location={formData.address} 
                coordinates={{ latitude: formData.latitude, longitude: formData.longitude }}
                detailedAddress={formData.locationDetails}
              />
              <div>
                <p className="text-sm text-gray-600 mb-2">Fine-tune location by dragging the pin:</p>
                <MapPicker
                  latitude={formData.latitude}
                  longitude={formData.longitude}
                  onChange={(lat, lng) => {
                    setFormData(prev => ({ ...prev, latitude: lat, longitude: lng }));
                    setUserLocation(prev => ({ ...(prev || {}), latitude: lat, longitude: lng }));
                    getAddressFromCoords(lat, lng);
                  }}
                />
                <div className="flex items-center justify-between mt-2 text-sm text-gray-600">
                  <button
                    type="button"
                    onClick={getCurrentLocation}
                    className="text-blue-600 hover:text-blue-700 font-medium"
                  >
                    Use current location
                  </button>
                  <button
                    type="button"
                    onClick={improveAccuracy}
                    className="text-blue-600 hover:text-blue-700 font-medium ml-4"
                  >
                    Improve accuracy
                  </button>
                  {deviceCoords && formData.latitude != null && formData.longitude != null && (
                    <span>
                      Distance to pin: {formatDistance(deviceCoords.latitude, deviceCoords.longitude, formData.latitude, formData.longitude)}
                    </span>
                  )}
                </div>
                {(geoAccuracy != null || geoTimestamp) && (
                  <div className="mt-1 text-xs text-gray-500">
                    {geoAccuracy != null && <span>GPS accuracy ~ {Math.round(geoAccuracy)} m</span>}
                    {geoAccuracy != null && geoTimestamp && <span> • </span>}
                    {geoTimestamp && <span>updated {geoTimestamp.toLocaleTimeString()}</span>}
                  </div>
                )}
              </div>

              {/* Manual Location Input Option */}
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border-2 border-yellow-300 rounded-2xl p-6 shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-5 h-5 text-yellow-600" />
                    <span className="font-semibold text-gray-900">Location Not Correct?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowManualLocation(!showManualLocation)}
                    className="text-yellow-600 hover:text-yellow-700 text-sm font-medium"
                  >
                    {showManualLocation ? 'Hide' : 'Enter Manually'}
                  </button>
                </div>
                
                {showManualLocation && (
                  <div className="space-y-3">
                    <input
                      type="text"
                      value={manualLocationInput}
                      onChange={(e) => setManualLocationInput(e.target.value)}
                      placeholder="Enter your complete address manually"
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500"
                    />
                    <button
                      type="button"
                      onClick={handleManualLocationSubmit}
                      disabled={!manualLocationInput.trim()}
                      className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Set Manual Location
                    </button>
                  </div>
                )}
                
                <p className="text-sm text-gray-600 mt-2">
                  If the detected location is incorrect, you can enter your address manually above.
                </p>
              </div>

              {/* Issue Summary */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-2xl p-6 border-2 border-blue-200 shadow-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <FileText className="w-5 h-5 text-blue-700" />
                  <span className="font-semibold text-gray-900">Issue Summary</span>
                </div>
                <p className="text-gray-800">
                  <strong>Type:</strong> {formData.issueType.replace('_', ' ').toUpperCase()}
                </p>
                {formData.description && (
                  <p className="text-gray-700 mt-1">
                    <strong>Description:</strong> {formData.description}
                  </p>
                )}
              </div>

              <div className="flex justify-between">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-6 py-3 text-gray-600 hover:text-gray-800 transition-all duration-300 rounded-xl hover:bg-gray-100"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-10 py-4 rounded-xl font-bold hover:from-green-600 hover:to-emerald-700 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 shadow-lg shadow-green-500/50 hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
                >
                  {isLoading ? (
                    <Loader className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                  <span>{isLoading ? 'Submitting...' : 'Submit Complaint'}</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportIssue;

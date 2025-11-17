import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import { MapPin, AlertTriangle, Eye, Filter } from 'lucide-react';
import { getComplaintsForMap } from '../services/complaintsService';
import { useAuth } from '../contexts/AuthContext.jsx';
import 'leaflet/dist/leaflet.css';
import ensureLeafletIcons from '../utils/leafletIcons';

ensureLeafletIcons();

const MapView = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [heatmapData, setHeatmapData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    issueType: 'all',
    status: 'all',
    priority: 'all'
  });
  const [showHeatmap, setShowHeatmap] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const mapRef = useRef(null);

  // Default center (Kanpur, India)
  const defaultCenter = [26.4499, 80.3319];
  const [mapCenter, setMapCenter] = useState(defaultCenter);

  useEffect(() => {
    getCurrentLocation();
    fetchComplaints();
  }, []);

  // Update heatmap when complaints change
  useEffect(() => {
    fetchHeatmapData();
  }, [complaints]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      return;
    }

    // Use watchPosition for better accuracy with auto-stop
    let watchId;
    let accuracyCheckTimeout;
    
    watchId = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const location = [latitude, longitude];
        
        setUserLocation(location);
        
        // Only update center if no complaints yet
        if (complaints.length === 0) {
          setMapCenter(location);
        }
        
        // Stop watching if accuracy is good (<= 20 meters)
        if (accuracy != null && accuracy <= 20) {
          if (watchId != null) {
            navigator.geolocation.clearWatch(watchId);
          }
          if (accuracyCheckTimeout) {
            clearTimeout(accuracyCheckTimeout);
          }
        }
      },
      (error) => {
        console.error('Error getting location:', error);
        if (watchId != null) {
          navigator.geolocation.clearWatch(watchId);
        }
        if (accuracyCheckTimeout) {
          clearTimeout(accuracyCheckTimeout);
        }
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    // Safety timeout - stop after 10 seconds
    accuracyCheckTimeout = setTimeout(() => {
      if (watchId != null) {
        navigator.geolocation.clearWatch(watchId);
      }
    }, 10000);
  };

  const fetchComplaints = async () => {
    try {
      setIsLoading(true);
      // Fetch all complaints with location from Firebase
      const allComplaints = await getComplaintsForMap();
      setComplaints(allComplaints);
      
      // Update map center based on complaints
      if (allComplaints.length > 0) {
        const avgLat = allComplaints.reduce((sum, c) => sum + c.latitude, 0) / allComplaints.length;
        const avgLng = allComplaints.reduce((sum, c) => sum + c.longitude, 0) / allComplaints.length;
        setMapCenter([avgLat, avgLng]);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setComplaints([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchHeatmapData = () => {
    // Generate heatmap data from complaints
    const complaintsWithLocation = complaints.filter(c => c.latitude && c.longitude);
    
    // Group complaints by location (rounded to 3 decimal places ~100m)
    const locationGroups = {};
    complaintsWithLocation.forEach(complaint => {
      const lat = Math.round(complaint.latitude * 1000) / 1000;
      const lng = Math.round(complaint.longitude * 1000) / 1000;
      const key = `${lat},${lng}`;
      
      if (!locationGroups[key]) {
        locationGroups[key] = {
          lat,
          lng,
          weight: 0
        };
      }
      
      locationGroups[key].weight++;
    });
    
    setHeatmapData(Object.values(locationGroups));
  };

  const getMarkerColor = (status, priority) => {
    if (status === 'resolved') return 'green';
    if (status === 'rejected') return 'red';
    if (priority === 'urgent') return 'red';
    if (priority === 'high') return 'orange';
    return 'blue';
  };

  const getIssueIcon = (issueType) => {
    if (!issueType) return '⚠️';
    const icons = {
      // ML Model Classes
      damaged_signs: '🚧',
      fallen_trees: '🌳',
      garbage: '🗑️',
      graffiti: '🎨',
      illegal_parking: '🚗',
      potholes: '🕳️',
      // Additional types
      pothole: '🕳️', // Legacy support
      street_light: '💡',
      water_leak: '💧',
      traffic_signal: '🚦',
      sidewalk_damage: '🚶',
      drainage: '🌊',
      other: '⚠️'
    };
    return icons[issueType] || '⚠️';
  };

  const filteredComplaints = complaints.filter(complaint => {
    // Support both camelCase and snake_case
    const issueType = complaint.issueType || complaint.issue_type;
    
    if (filters.issueType !== 'all' && issueType !== filters.issueType) {
      return false;
    }
    if (filters.status !== 'all' && complaint.status !== filters.status) {
      return false;
    }
    if (filters.priority !== 'all' && complaint.priority !== filters.priority) {
      return false;
    }
    return true;
  });

  // Calculate map center from filtered complaints
  const getMapCenterFromComplaints = () => {
    const complaintsWithLocation = filteredComplaints.filter(c => c.latitude && c.longitude);
    if (complaintsWithLocation.length === 0) {
      return mapCenter;
    }
    
    const avgLat = complaintsWithLocation.reduce((sum, c) => sum + c.latitude, 0) / complaintsWithLocation.length;
    const avgLng = complaintsWithLocation.reduce((sum, c) => sum + c.longitude, 0) / complaintsWithLocation.length;
    return [avgLat, avgLng];
  };

  const issueTypes = [
    'all', 'pothole', 'street_light', 'garbage', 'water_leak', 
    'traffic_signal', 'sidewalk_damage', 'drainage', 'other'
  ];

  const statuses = ['all', 'pending', 'in_progress', 'resolved', 'rejected'];
  const priorities = ['all', 'low', 'normal', 'high', 'urgent'];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="bg-white rounded-lg shadow-sm p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Issue Map</h1>
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setShowHeatmap(!showHeatmap)}
              className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
                showHeatmap 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 inline mr-2" />
              {showHeatmap ? 'Hide Heatmap' : 'Show Heatmap'}
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-50 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Issue Type
              </label>
              <select
                value={filters.issueType}
                onChange={(e) => setFilters(prev => ({ ...prev, issueType: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {issueTypes.map(type => (
                  <option key={type} value={type}>
                    {type === 'all' ? 'All Types' : type.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {statuses.map(status => (
                  <option key={status} value={status}>
                    {status === 'all' ? 'All Statuses' : status.replace('_', ' ').toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Priority
              </label>
              <select
                value={filters.priority}
                onChange={(e) => setFilters(prev => ({ ...prev, priority: e.target.value }))}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {priorities.map(priority => (
                  <option key={priority} value={priority}>
                    {priority === 'all' ? 'All Priorities' : priority.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Map Container */}
        <div className="relative">
          <MapContainer
            center={getMapCenterFromComplaints()}
            zoom={filteredComplaints.length === 0 ? 10 : filteredComplaints.length === 1 ? 15 : 13}
            style={{ height: '600px', width: '100%' }}
            ref={mapRef}
            key={`${filteredComplaints.length}-${mapCenter[0]}-${mapCenter[1]}`}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* User Location Marker */}
            {userLocation && (
              <Marker position={userLocation}>
                <Popup>
                  <div className="text-center">
                    <MapPin className="w-4 h-4 inline mr-1" />
                    <strong>Your Location</strong>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Complaint Markers */}
            {filteredComplaints.map((complaint) => {
              const lat = complaint.latitude;
              const lng = complaint.longitude;
              
              if (!lat || !lng || isNaN(lat) || isNaN(lng)) return null;
              
              return (
                <Marker
                  key={complaint.id}
                  position={[lat, lng]}
                >
                  <Popup>
                    <div className="p-2">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className="text-lg">{getIssueIcon(complaint.issueType || complaint.issue_type)}</span>
                        <span className="font-semibold text-gray-900">
                          {(complaint.issueType || complaint.issue_type || 'Unknown').replace(/_/g, ' ').toUpperCase()}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm">
                        <p><strong>Status:</strong> {complaint.status || 'Unknown'}</p>
                        <p><strong>Priority:</strong> {complaint.priority || 'Unknown'}</p>
                        <p><strong>Department:</strong> {complaint.department || 'Not assigned'}</p>
                        <p><strong>Address:</strong> {complaint.address || 'N/A'}</p>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}

            {/* Heatmap Circles */}
            {showHeatmap && heatmapData.map((point, index) => {
              if (!point.lat || !point.lng || isNaN(point.lat) || isNaN(point.lng)) return null;
              
              return (
                <Circle
                  key={index}
                  center={[point.lat, point.lng]}
                  radius={point.weight * 100}
                  pathOptions={{
                    color: point.weight > 3 ? '#dc2626' : '#f59e0b',
                    fillColor: point.weight > 3 ? '#dc2626' : '#f59e0b',
                    fillOpacity: point.weight > 3 ? 0.4 : 0.3,
                    weight: 1
                  }}
                >
                  <Popup>
                    <div className="p-2 text-center">
                      <strong>{point.weight} {point.weight === 1 ? 'Complaint' : 'Complaints'}</strong>
                    </div>
                  </Popup>
                </Circle>
              );
            })}
          </MapContainer>

          {/* Map Legend */}
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 z-10">
            <h3 className="font-semibold text-gray-900 mb-2">Legend</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Resolved</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Pending/In Progress</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Rejected/Urgent</span>
              </div>
              {showHeatmap && (
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-red-500 rounded-full opacity-30"></div>
                  <span>High Density Area</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{complaints.length}</div>
            <div className="text-sm text-gray-600">Total Issues</div>
          </div>
          <div className="bg-green-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-green-600">
              {complaints.filter(c => c.status === 'resolved').length}
            </div>
            <div className="text-sm text-gray-600">Resolved</div>
          </div>
          <div className="bg-yellow-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">
              {complaints.filter(c => c.status === 'pending').length}
            </div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="bg-red-50 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-red-600">
              {complaints.filter(c => c.priority === 'urgent').length}
            </div>
            <div className="text-sm text-gray-600">Urgent</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MapView;

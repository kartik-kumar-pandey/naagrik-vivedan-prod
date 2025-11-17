import React from 'react';
import { MapPin, Navigation } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ensureLeafletIcons from '../utils/leafletIcons';

ensureLeafletIcons();

const LocationDetails = ({ location, coordinates, detailedAddress }) => {
  // Parse detailed location information
  const parseLocationDetails = (address) => {
    if (!address) {
      return {
        street: 'N/A',
        area: 'N/A',
        city: 'N/A',
        completeAddress: 'Location not available',
        state: 'N/A',
        pinCode: 'N/A',
        country: 'N/A'
      };
    }

    // If address starts with "Location:" it means it's just coordinates
    if (address.startsWith('Location:')) {
      return {
        street: 'N/A',
        area: 'N/A',
        city: 'N/A',
        completeAddress: address,
        state: 'N/A',
        pinCode: 'N/A',
        country: 'N/A'
      };
    }

    // Parse the address string properly
    const addressString = address.toString();
    const parts = addressString.split(', ');
    
    // Try to extract pin code (6 digits)
    const pinCodeMatch = addressString.match(/\b\d{6}\b/);
    const pinCode = pinCodeMatch ? pinCodeMatch[0] : 'N/A';
    
    // Try to extract state (look for common state patterns)
    const statePatterns = [
      /Uttar Pradesh|UP/gi,
      /Maharashtra/gi,
      /Karnataka/gi,
      /Tamil Nadu/gi,
      /West Bengal/gi,
      /Gujarat/gi,
      /Rajasthan/gi,
      /Madhya Pradesh|MP/gi,
      /Punjab/gi,
      /Haryana/gi,
      /Delhi/gi,
      /Andhra Pradesh/gi,
      /Telangana/gi,
      /Kerala/gi,
      /Odisha/gi,
      /Bihar/gi,
      /Jharkhand/gi,
      /Chhattisgarh/gi,
      /Himachal Pradesh/gi,
      /Uttarakhand/gi,
      /Assam/gi,
      /Manipur/gi,
      /Meghalaya/gi,
      /Mizoram/gi,
      /Nagaland/gi,
      /Tripura/gi,
      /Sikkim/gi,
      /Arunachal Pradesh/gi,
      /Goa/gi,
      /Jammu and Kashmir/gi
    ];
    
    let state = 'N/A';
    for (const pattern of statePatterns) {
      const match = addressString.match(pattern);
      if (match) {
        state = match[0];
        break;
      }
    }
    
    // Try to extract city (usually the first or second part)
    let city = 'N/A';
    if (parts.length > 0) {
      city = parts[0].trim();
    }
    
    // Try to extract street/area information
    let street = 'N/A';
    let area = 'N/A';
    
    // Look for common street indicators
    const streetIndicators = ['road', 'street', 'lane', 'avenue', 'drive', 'colony', 'sector', 'block'];
    for (let i = 0; i < Math.min(parts.length, 3); i++) {
      const part = parts[i].toLowerCase();
      if (streetIndicators.some(indicator => part.includes(indicator))) {
        street = parts[i].trim();
        break;
      }
    }
    
    // Extract country (usually the last part)
    const country = parts.length > 1 ? parts[parts.length - 1].trim() : 'N/A';
    
    return {
      street: street,
      area: area,
      city: city,
      completeAddress: addressString,
      state: state,
      pinCode: pinCode,
      country: country
    };
  };

  // Use detailedAddress if provided, otherwise parse the location
  const locationDetails = detailedAddress || parseLocationDetails(location);

  return (
    <div className="bg-gray-50 rounded-lg p-6">
      <div className="flex items-center space-x-2 mb-4">
        <MapPin className="w-5 h-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Location Details</h3>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600">Street:</label>
            <p className="text-gray-900 font-medium">{locationDetails.street}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">Area:</label>
            <p className="text-gray-900 font-medium">{locationDetails.area}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">City:</label>
            <p className="text-gray-900 font-medium">{locationDetails.city}</p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-gray-600">State:</label>
            <p className="text-gray-900 font-medium">{locationDetails.state}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">Pin Code:</label>
            <p className="text-gray-900 font-medium">{locationDetails.pinCode}</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-600">Country:</label>
            <p className="text-gray-900 font-medium">{locationDetails.country}</p>
          </div>
        </div>
      </div>
      
      <div className="mt-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">Complete Address:</label>
        <p className="text-gray-900 font-medium bg-white p-3 rounded border">
          {locationDetails.completeAddress}
        </p>
      </div>
      
      {coordinates && coordinates.latitude != null && coordinates.longitude != null && (
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-600 mb-2">Map Preview:</label>
          <div className="rounded overflow-hidden border" style={{ height: 220 }}>
            <MapContainer
              center={[coordinates.latitude, coordinates.longitude]}
              zoom={16}
              style={{ height: '100%', width: '100%' }}
              scrollWheelZoom={false}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              <Marker position={[coordinates.latitude, coordinates.longitude]}>
                <Popup>
                  {locationDetails.completeAddress || 'Selected Location'}
                </Popup>
              </Marker>
            </MapContainer>
          </div>
        </div>
      )}
      
      {coordinates && (
        <div className="mt-4 flex items-center space-x-2 text-sm text-gray-600">
          <Navigation className="w-4 h-4" />
          <span>Coordinates: {coordinates.latitude?.toFixed(6)}, {coordinates.longitude?.toFixed(6)}</span>
        </div>
      )}
    </div>
  );
};

export default LocationDetails;

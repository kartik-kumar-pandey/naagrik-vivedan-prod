import React, { useEffect, useMemo, useRef } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import ensureLeafletIcons from '../utils/leafletIcons';

ensureLeafletIcons();

const DraggableMarker = ({ position, onDragEnd }) => {
  const markerRef = useRef(null);
  useMapEvents({
    click(e) {
      onDragEnd(e.latlng.lat, e.latlng.lng);
    }
  });
  const eventHandlers = useMemo(() => ({
    dragend() {
      const marker = markerRef.current;
      if (marker != null) {
        const latlng = marker.getLatLng();
        onDragEnd(latlng.lat, latlng.lng);
      }
    },
  }), [onDragEnd]);
  return (
    <Marker
      draggable
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
    />
  );
};

const MapPicker = ({ latitude, longitude, onChange }) => {
  const center = useMemo(() => {
    const lat = latitude ?? 26.3843;
    const lng = longitude ?? 80.3768;
    return [lat, lng];
  }, [latitude, longitude]);

  const SetViewOnChange = ({ center }) => {
    const map = useMap();
    useEffect(() => {
      map.setView(center);
    }, [center, map]);
    return null;
  };

  return (
    <div className="rounded overflow-hidden border" style={{ height: 260 }}>
      <MapContainer
        center={center}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
        scrollWheelZoom={false}
      >
        <SetViewOnChange center={center} />
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        />
        <DraggableMarker
          position={center}
          onDragEnd={(lat, lng) => onChange && onChange(lat, lng)}
        />
      </MapContainer>
    </div>
  );
};

export default MapPicker;


import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Checkin } from '@/types';
import { getAddressFromCoordinates } from '@/lib/location';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type HistoryMapProps = {
  checkins: Checkin[];
  selectedId?: string | null;
};

const normalizeCoord = (value?: number | string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const hasCoords = (checkin: Checkin) =>
  Number.isFinite(checkin.latitude) && Number.isFinite(checkin.longitude);

const MapRecenter: React.FC<{ lat: number; lng: number }> = ({ lat, lng }) => {
  const map = useMap();
  useEffect(() => {
    map.setView([lat, lng], map.getZoom(), { animate: true });
  }, [map, lat, lng]);
  return null;
};

const historyMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const HistoryMap: React.FC<HistoryMapProps> = ({ checkins, selectedId }) => {
  const [address, setAddress] = useState<string>('');
  const [addressLoading, setAddressLoading] = useState(false);
  const addressCache = useRef<Map<string, string>>(new Map());
  const cacheKey = 'historyMapAddressCache';

  useEffect(() => {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === 'object') {
        Object.entries(parsed).forEach(([key, value]) => {
          if (typeof value === 'string') {
            addressCache.current.set(key, value);
          }
        });
      }
    } catch {
      // Ignore cache load errors.
    }
  }, []);

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  const mapCheckins = useMemo(() => {
    return checkins
      .map((checkin) => ({
        ...checkin,
        latitude: normalizeCoord(checkin.latitude),
        longitude: normalizeCoord(checkin.longitude),
      }))
      .filter(hasCoords);
  }, [checkins]);

  const selected =
    mapCheckins.find((checkin) => checkin.id === selectedId) ?? mapCheckins[0];

  if (!selected || selected.latitude === undefined || selected.longitude === undefined) {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <p className="text-slate-600 font-medium">Map unavailable</p>
        <p className="text-sm text-slate-500 mt-1">
          No location data found for your history yet.
        </p>
      </div>
    );
  }

  const position: [number, number] = [selected.latitude, selected.longitude];
  const label = selected.location || 'Check-in location';

  useEffect(() => {
    let alive = true;
    const loadAddress = async () => {
      const key = `${position[0].toFixed(6)},${position[1].toFixed(6)}`;
      const cached = addressCache.current.get(key);
      if (cached) {
        setAddress(cached);
        setAddressLoading(false);
        return;
      }

      setAddressLoading(true);
      try {
        const text = await getAddressFromCoordinates(position[0], position[1]);
        if (alive) {
          addressCache.current.set(key, text);
          try {
            const obj = Object.fromEntries(addressCache.current.entries());
            localStorage.setItem(cacheKey, JSON.stringify(obj));
          } catch {
            // Ignore cache persist errors.
          }
          setAddress(text);
        }
      } catch {
        if (alive) {
          setAddress('');
        }
      } finally {
        if (alive) {
          setAddressLoading(false);
        }
      }
    };
    loadAddress();
    return () => {
      alive = false;
    };
  }, [position[0], position[1]]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h3 className="text-lg font-semibold text-slate-800">History Location</h3>
        <p className="text-sm text-slate-500 mt-1">{label}</p>
        <p className="text-sm text-slate-500 mt-1">
          {addressLoading ? 'Resolving address...' : address || 'Address unavailable'}
        </p>
        <p className="text-xs text-slate-400 mt-1">
          {position[0].toFixed(6)}, {position[1].toFixed(6)}
        </p>
      </div>
      <div className="h-80 lg:h-[28rem]">
        <MapContainer center={position} zoom={16} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={position} icon={historyMarkerIcon}>
            <Popup>{label}</Popup>
          </Marker>
          <MapRecenter lat={position[0]} lng={position[1]} />
        </MapContainer>
      </div>
    </div>
  );
};

export default HistoryMap;

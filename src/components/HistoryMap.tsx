import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import type { Checkin } from '@/types';
import { getAddressFromCoordinates } from '@/lib/location';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { MapPin, Navigation, Loader } from 'lucide-react';

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
          if (typeof value === 'string') addressCache.current.set(key, value);
        });
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  const mapCheckins = useMemo(() =>
    checkins
      .map(c => ({ ...c, latitude: normalizeCoord(c.latitude), longitude: normalizeCoord(c.longitude) }))
      .filter(hasCoords),
    [checkins]
  );

  const selected = useMemo(
    () => mapCheckins.find(c => c.id === selectedId) ?? mapCheckins[0],
    [mapCheckins, selectedId]
  );

  const position = useMemo(() => {
    if (!selected || selected.latitude === undefined || selected.longitude === undefined) return null;
    return [selected.latitude, selected.longitude] as [number, number];
  }, [selected]);

  const positionKey = useMemo(() => {
    if (!position) return null;
    return `${position[0].toFixed(6)},${position[1].toFixed(6)}`;
  }, [position]);

  const label = selected?.location || 'Check-in location';

  useEffect(() => {
    let alive = true;
    if (!position || !positionKey) {
      setAddress('');
      setAddressLoading(false);
      return () => { alive = false; };
    }
    const loadAddress = async () => {
      const cached = addressCache.current.get(positionKey);
      if (cached) { setAddress(cached); setAddressLoading(false); return; }
      setAddressLoading(true);
      try {
        const text = await getAddressFromCoordinates(position[0], position[1]);
        if (alive) {
          addressCache.current.set(positionKey, text);
          try {
            localStorage.setItem(cacheKey, JSON.stringify(Object.fromEntries(addressCache.current)));
          } catch { /* ignore */ }
          setAddress(text);
        }
      } catch {
        if (alive) setAddress('');
      } finally {
        if (alive) setAddressLoading(false);
      }
    };
    loadAddress();
    return () => { alive = false; };
  }, [position, positionKey]);

  // ── Empty state ──
  if (!position) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600&display=swap');
          .hm-empty {
            font-family: 'Sora', sans-serif;
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: 16px;
            padding: 48px 32px;
            text-align: center;
            color: hsl(var(--muted-foreground));
          }
          .hm-empty p { font-size: 14px; color: hsl(var(--muted-foreground)); margin-bottom: 6px; }
          .hm-empty span { font-size: 12px; color: hsl(var(--muted-foreground) / 0.8); }
        `}</style>
        <div className="hm-empty">
          <MapPin size={36} style={{ margin: '0 auto 14px', opacity: 0.15, color: 'hsl(var(--muted-foreground))' }} />
          <p>Map unavailable</p>
          <span>No location data found for your history yet.</span>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .hm-card {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          animation: hmFade 0.4s ease both;
        }
        @keyframes hmFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        .hm-info {
          padding: 18px 22px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex; align-items: flex-start; gap: 14px;
        }

        .hm-pin-icon {
          width: 36px; height: 36px; border-radius: 10px; flex-shrink: 0;
          background: hsl(var(--primary) / 0.12);
          border: 1px solid hsl(var(--primary) / 0.2);
          display: flex; align-items: center; justify-content: center;
          margin-top: 2px;
        }

        .hm-label { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); margin-bottom: 4px; }

        .hm-address {
          font-size: 13px; color: hsl(var(--muted-foreground));
          display: flex; align-items: center; gap: 6px;
          min-height: 20px;
        }
        .hm-address-spin { animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .hm-coords {
          font-family: 'JetBrains Mono', monospace;
          font-size: 11px; color: hsl(var(--muted-foreground) / 0.8);
          margin-top: 5px;
          display: flex; align-items: center; gap: 5px;
        }

        /* Override leaflet container bg */
        .hm-map-wrap { height: 320px; position: relative; }
        @media (min-width: 1024px) { .hm-map-wrap { height: 420px; } }

        /* Dark-tinted overlay on OSM tiles via mix-blend */
        .dark .hm-map-wrap .leaflet-tile-pane {
          filter: brightness(0.75) saturate(0.7) hue-rotate(180deg) invert(1);
        }
        /* Invert markers back to normal */
        .dark .hm-map-wrap .leaflet-marker-pane,
        .dark .hm-map-wrap .leaflet-popup-pane {
          filter: invert(1) hue-rotate(180deg);
        }

        /* Dark popup */
        .hm-map-wrap .leaflet-popup-content-wrapper {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--primary) / 0.3);
          border-radius: 10px;
          box-shadow: 0 8px 24px hsl(var(--foreground) / 0.2);
        }
        .hm-map-wrap .leaflet-popup-content {
          color: hsl(var(--foreground));
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          margin: 10px 14px;
        }
        .hm-map-wrap .leaflet-popup-tip { background: hsl(var(--card)); }
        .hm-map-wrap .leaflet-popup-close-button { color: hsl(var(--muted-foreground)) !important; }
        .hm-map-wrap .leaflet-popup-close-button:hover { color: hsl(var(--foreground)) !important; }
      `}</style>

      <div className="hm-card">
        {/* Info strip */}
        <div className="hm-info">
          <div className="hm-pin-icon">
            <MapPin size={16} color="hsl(var(--primary))" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="hm-label">{label}</div>
            <div className="hm-address">
              {addressLoading
                ? <><Loader size={12} className="hm-address-spin" /> Resolving address…</>
                : address || <span style={{ color: 'hsl(var(--muted-foreground) / 0.8)' }}>Address unavailable</span>
              }
            </div>
            <div className="hm-coords">
              <Navigation size={10} />
              {position[0].toFixed(6)}, {position[1].toFixed(6)}
            </div>
          </div>
        </div>

        {/* Map */}
        <div className="hm-map-wrap">
          <MapContainer center={position} zoom={16} scrollWheelZoom style={{ height: '100%', width: '100%' }}>
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
    </>
  );
};

export default HistoryMap;

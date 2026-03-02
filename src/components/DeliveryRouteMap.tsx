import React, { useEffect, useMemo } from 'react';
import type { GeoJsonObject } from 'geojson';
import { GeoJSON, MapContainer, Marker, Popup, Polyline, TileLayer, useMap } from 'react-leaflet';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

type RouteStop = {
  name: string;
  idx: number;
  customer?: string;
  address?: string;
  customer_address?: string;
  latitude?: number | string;
  longitude?: number | string;
};

type DeliveryRouteMapProps = {
  stops: RouteStop[];
  routeGeojson?: GeoJsonObject | null;
  startLabel?: string;
  startLatitude?: number | string;
  startLongitude?: number | string;
  onOpenGoogleMaps?: () => void;
  completedStopKeys?: Set<string>;
};

const deliveryMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const completedMarkerIcon = L.divIcon({
  className: '',
  html: '<div style="width:18px;height:18px;border-radius:50%;background:hsl(var(--primary));border:2px solid hsl(var(--background));box-shadow:0 2px 6px hsl(var(--foreground) / 0.2)"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const MapFitBounds: React.FC<{ positions: [number, number][] }> = ({ positions }) => {
  const map = useMap();
  useEffect(() => {
    if (!positions.length) return;
    const bounds = L.latLngBounds(positions.map(([lat, lng]) => [lat, lng]));
    map.fitBounds(bounds, { padding: [24, 24] });
  }, [map, positions]);
  return null;
};

const normalizeCoord = (value?: number | string) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const normalizePoint = (lat?: number | string, lng?: number | string) => {
  const latNum = normalizeCoord(lat);
  const lngNum = normalizeCoord(lng);
  if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return null;

  if (Math.abs(latNum as number) > 90 && Math.abs(lngNum as number) <= 90) {
    return [lngNum as number, latNum as number] as [number, number];
  }

  return [latNum as number, lngNum as number] as [number, number];
};

const DeliveryRouteMap: React.FC<DeliveryRouteMapProps> = ({
  stops,
  routeGeojson,
  startLabel,
  startLatitude,
  startLongitude,
  onOpenGoogleMaps,
  completedStopKeys,
}) => {
  const startPoint = useMemo(
    () => normalizePoint(startLatitude, startLongitude),
    [startLatitude, startLongitude]
  );
  const positions = useMemo(
    () =>
      stops
        .map((stop) => normalizePoint(stop.latitude, stop.longitude))
        .filter((value): value is [number, number] => Array.isArray(value)),
    [stops]
  );

  const allPositions = useMemo(() => {
    if (startPoint) {
      return [startPoint, ...positions];
    }
    return positions;
  }, [positions, startPoint]);

  if (allPositions.length === 0) {
    return (
      <>
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

          .route-empty-card {
            font-family: 'Sora', sans-serif;
            background: hsl(var(--card));
            border: 1px solid hsl(var(--border));
            border-radius: 16px;
            padding: 20px;
            color: hsl(var(--foreground));
          }
          .route-empty-title { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); }
          .route-empty-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }
        `}</style>
        <div className="route-empty-card">
          <div className="route-empty-title">Route map unavailable</div>
          <div className="route-empty-sub">No coordinates found for delivery stops.</div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&display=swap');

        .route-card {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }

        .route-header {
          padding: 16px 20px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .route-title { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); }
        .route-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .route-actions { display: flex; align-items: center; gap: 8px; }

        .route-btn {
          background: hsl(var(--foreground) / 0.06);
          border: 1px solid hsl(var(--border));
          color: hsl(var(--foreground));
          padding: 8px 12px;
          border-radius: 10px;
          font-size: 12px;
          font-weight: 600;
          transition: opacity 0.2s, transform 0.15s;
        }
        .route-btn:hover { opacity: 0.9; transform: translateY(-1px); }
        .route-btn:active { transform: translateY(0); }

        @media (min-width: 640px) {
          .route-header {
            flex-direction: row;
            align-items: center;
            justify-content: space-between;
          }
        }

        .route-map { height: 24rem; }
      `}</style>

      <div className="route-card">
        <div className="route-header">
          <div>
            <div className="route-title">Delivery Route</div>
            <div className="route-sub">Showing all delivery stops and the planned route.</div>
          </div>
          {onOpenGoogleMaps && (
            <div className="route-actions">
              <button
                type="button"
                onClick={onOpenGoogleMaps}
                className="route-btn"
              >
                Open in Google Maps
              </button>
            </div>
          )}
        </div>
        <div className="route-map">
          <MapContainer center={allPositions[0]} zoom={12} scrollWheelZoom className="h-full w-full">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {routeGeojson ? <GeoJSON data={routeGeojson} /> : null}
            {startPoint && (
              <Marker position={startPoint} icon={deliveryMarkerIcon}>
                <Popup>
                  <div>
                    <strong>Start</strong>
                    <div>{startLabel || 'Starting point'}</div>
                  </div>
                </Popup>
              </Marker>
            )}
            {stops.map((stop) => {
              const position = normalizePoint(stop.latitude, stop.longitude);
              if (!position) return null;
              const isCompleted = completedStopKeys?.has(stop.name);
              return (
                <Marker
                  key={stop.name}
                  position={position}
                  icon={isCompleted ? completedMarkerIcon : deliveryMarkerIcon}
                >
                  <Popup>
                    <div>
                      <strong>{stop.customer || 'Stop'}</strong>
                      <div>{stop.address || stop.customer_address || 'Address unavailable'}</div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
            <MapFitBounds positions={allPositions} />
          </MapContainer>
        </div>
      </div>
    </>
  );
};

export default DeliveryRouteMap;

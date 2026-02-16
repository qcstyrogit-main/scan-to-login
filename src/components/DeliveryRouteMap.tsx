import React, { useEffect, useMemo } from 'react';
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
  routeGeojson?: unknown;
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
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:2px solid #ffffff;box-shadow:0 2px 6px rgba(0,0,0,0.25)"></div>',
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
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <p className="text-slate-600 font-medium">Route map unavailable</p>
        <p className="text-sm text-slate-500 mt-1">No coordinates found for delivery stops.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-800">Delivery Route</h3>
          <p className="text-sm text-slate-500 mt-1">
            Showing all delivery stops and the planned route.
          </p>
        </div>
        {onOpenGoogleMaps && (
          <button
            type="button"
            onClick={onOpenGoogleMaps}
            className="bg-white border border-slate-200 text-slate-700 px-3 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
          >
            Open in Google Maps
          </button>
        )}
      </div>
      <div className="h-96">
        <MapContainer center={allPositions[0]} zoom={12} scrollWheelZoom className="h-full w-full">
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {routeGeojson ? <GeoJSON data={routeGeojson as any} /> : null}
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
  );
};

export default DeliveryRouteMap;

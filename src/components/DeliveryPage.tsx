import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Camera, MapPin, Package, Route, Truck } from 'lucide-react';
import { erpRequest, extractErrorMessage } from '@/lib/erpApi';
import { getAddressFromCoordinates, getCurrentLocation } from '@/lib/location';
import DeliveryRouteMap from '@/components/DeliveryRouteMap';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';

interface DeliveryPageProps {
  fullName: string;
  department?: string;
  designation?: string;
  company?: string;
  customLocation?: string;
  employeeId: string;
}

type DeliveryStop = {
  name: string;
  idx: number;
  customer?: string;
  address?: string;
  customer_address?: string;
  visited?: number | boolean;
  contact?: string;
  email_sent_to?: string;
  customer_contact?: string;
  distance?: number;
  estimated_arrival?: string;
  latitude?: number;
  longitude?: number;
  geofence_radius_meters?: number;
  uom?: string;
};

type DeliveryTrip = {
  name?: string;
  company?: string;
  custom_location?: string;
  custom_route_geojson?: unknown;
  status?: string;
  driver?: string;
  driver_name?: string;
  driver_address?: string;
  total_distance?: number;
  vehicle?: string;
  departure_time?: string;
  employee?: string;
  latitude?: number;
  longitude?: number;
};

const getVisitLabel = (visited?: number | boolean) => {
  if (visited === true || visited === 1) return 'Delivered';
  if (visited === false || visited === 0) return 'Pending';
  return 'Pending';
};

const normalizeAddress = (value?: string) => {
  if (!value) return '';
  const noBreaks = value.replace(/<br\s*\/?>/gi, ', ');
  const collapsed = noBreaks.replace(/\s*,\s*/g, ', ').replace(/,\s*,+/g, ', ').trim();
  return collapsed.replace(/,\s*$/, '');
};

const truncateText = (value: string, maxLength: number) => {
  if (!value || value.length <= maxLength) return value;
  return `${value.slice(0, Math.max(0, maxLength - 3))}...`;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') return {};
  return value as Record<string, unknown>;
};

const readString = (value: unknown) => (typeof value === 'string' ? value : undefined);

const DEFAULT_GEOFENCE_RADIUS_METERS = 150;

const isFiniteNumber = (value?: number) => Number.isFinite(value);

const toRadians = (value: number) => (value * Math.PI) / 180;

const getDistanceMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const earthRadiusMeters = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadiusMeters * c;
};

const DeliveryPage: React.FC<DeliveryPageProps> = ({
  fullName,
  department,
  designation,
  company,
  customLocation,
  employeeId,
}) => {
  const [loading, setLoading] = useState(true);
  const [trip, setTrip] = useState<DeliveryTrip | null>(null);
  const [stops, setStops] = useState<DeliveryStop[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [showRoute, setShowRoute] = useState(false);
  const [selectedStop, setSelectedStop] = useState<DeliveryStop | null>(null);
  const [isUnloadingOpen, setIsUnloadingOpen] = useState(false);
  const [isUnloadingSubmitting, setIsUnloadingSubmitting] = useState(false);
  const [statusByStop, setStatusByStop] = useState<Map<string, string>>(new Map());
  const [proofImage, setProofImage] = useState<string | null>(null);
  const [proofFilename, setProofFilename] = useState<string | null>(null);
  const [radiusCheck, setRadiusCheck] = useState<{
    checking: boolean;
    allowed: boolean;
    distance?: number;
    message?: string;
  }>({ checking: false, allowed: false });
  const proofInputRef = useRef<HTMLInputElement>(null);

  const stopKey = (stop?: DeliveryStop | null) =>
    stop?.name || `${stop?.customer || ''}||${normalizeAddress(stop?.customer_address || stop?.address || '')}`;

  const getStopStatus = React.useCallback(
    (stop?: DeliveryStop | null) => statusByStop.get(stopKey(stop)) || '',
    [statusByStop]
  );

  const getStatusBadge = (stop?: DeliveryStop | null) => {
    const status = getStopStatus(stop);
    if (status === 'Completed') {
      return { label: 'Completed', className: 'text-green-700 bg-green-100' };
    }
    if (status === 'Unloading') {
      return { label: 'Unloading', className: 'text-red-700 bg-red-100' };
    }
    const fallback = getVisitLabel(stop?.visited);
    return { label: fallback, className: 'text-slate-700 bg-slate-100' };
  };

  useEffect(() => {
    let isMounted = true;
    const loadTrip = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await erpRequest(
          '/api/method/route_optimizer.api.delivery_trip.get_delivery_trip_by_employee',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { employee: employeeId },
          }
        );

        const payload = res.data?.message ?? res.data;
        if (!res.ok || payload?.success === false) {
          throw new Error(extractErrorMessage(payload, 'Unable to load delivery trip'));
        }

        const header = payload?.header || {};
        const parsedGeojson =
          typeof header?.custom_route_geojson === 'string'
            ? (() => {
                try {
                  return JSON.parse(header.custom_route_geojson);
                } catch {
                  return null;
                }
              })()
            : header?.custom_route_geojson;

        if (header) {
          header.custom_route_geojson = parsedGeojson;
        }
        const deliveryStops: DeliveryStop[] = Array.isArray(payload?.delivery_stops)
          ? payload.delivery_stops
          : [];

        if (isMounted) {
          setTrip(header);
          setStops(deliveryStops);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to load delivery trip';
        if (isMounted) {
          setTrip(null);
          setStops([]);
          setError(msg);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (employeeId) {
      loadTrip();
    } else {
      setLoading(false);
    }

    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  useEffect(() => {
    let alive = true;
    const loadMonitoringStatuses = async () => {
      if (!trip?.name) return;
      try {
        const res = await erpRequest(
          '/api/method/route_optimizer.api.delivery_monitoring.get_delivery_monitoring_statuses',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { delivery_trip: trip.name },
          }
        );
        const payload = res.data?.message ?? res.data;
        if (!res.ok || payload?.success === false) {
          throw new Error(extractErrorMessage(payload, 'Unable to load delivery logs'));
        }
        const statuses = Array.isArray(payload?.statuses) ? payload.statuses : [];
        const map = new Map<string, string>();
        statuses.forEach((entry) => {
          const item = asRecord(entry);
          const key = String(readString(item.key) || '').trim();
          const status = String(readString(item.status) || '').trim();
          if (key && status) map.set(key, status);
        });
        if (alive) setStatusByStop(map);
      } catch {
        if (alive) setStatusByStop(new Map());
      }
    };
    loadMonitoringStatuses();
    return () => {
      alive = false;
    };
  }, [trip?.name]);

  const nextStop = useMemo(() => {
    return stops.find((stop) => {
      const status = getStopStatus(stop);
      if (status === 'Completed') return false;
      return !(stop.visited === true || stop.visited === 1);
    });
  }, [stops, getStopStatus]);

  const remainingStops = useMemo(
    () =>
      stops.filter((stop) => {
        const status = getStopStatus(stop);
        if (status === 'Completed') return false;
        return !(stop.visited === true || stop.visited === 1);
      }),
    [stops, getStopStatus]
  );

  const formatPoint = (lat?: number, lng?: number) => {
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return '';
    return `${lat},${lng}`;
  };

  const buildGoogleMapsUrl = () => {
    if (remainingStops.length === 0) return '';

    const origin =
      normalizeAddress(trip?.custom_location) ||
      normalizeAddress(customLocation) ||
      formatPoint(remainingStops[0]?.latitude, remainingStops[0]?.longitude) ||
      normalizeAddress(remainingStops[0]?.customer_address || remainingStops[0]?.address) ||
      '';

    const destinations = remainingStops
      .map((stop) =>
        formatPoint(stop.latitude, stop.longitude) ||
        normalizeAddress(stop.customer_address || stop.address)
      )
      .filter(Boolean);

    if (!destinations.length) return '';

    const destination = destinations[destinations.length - 1];
    const waypoints = destinations.slice(0, -1).join('|');

    const params = new URLSearchParams({
      api: '1',
      destination,
      travelmode: 'driving',
    });
    if (origin) {
      params.set('origin', origin);
    }
    if (waypoints) {
      params.set('waypoints', waypoints);
    }

    return `https://www.google.com/maps/dir/?${params.toString()}`;
  };

  const handleNavigate = () => {
    if (stops.length === 0) return;
    setShowRoute(true);
  };

  const handleOpenGoogleMaps = () => {
    const url = buildGoogleMapsUrl();
    if (!url) return;
    window.open(url, '_blank', 'noopener');
  };

  const totalStops = stops.length;
  const completedStops = stops.filter((stop) => {
    const status = getStopStatus(stop);
    if (status === 'Completed') return true;
    return stop.visited === true || stop.visited === 1;
  }).length;

  const openUnloadingModal = (stop: DeliveryStop) => {
    setSelectedStop(stop);
    setIsUnloadingOpen(true);
    setProofImage(null);
    setProofFilename(null);
  };

  const hasStopCoordinates = (stop?: DeliveryStop | null) =>
    isFiniteNumber(stop?.latitude) && isFiniteNumber(stop?.longitude);

  const getStopRadiusMeters = (stop?: DeliveryStop | null) => {
    if (isFiniteNumber(stop?.geofence_radius_meters)) {
      return Number(stop?.geofence_radius_meters);
    }
    return DEFAULT_GEOFENCE_RADIUS_METERS;
  };

  const resolveLocationForStop = async (stop: DeliveryStop) => {
    if (!hasStopCoordinates(stop)) {
      toast.error('Delivery coordinates are missing. Unable to verify location.');
      throw new Error('Delivery coordinates are missing.');
    }
    let currentLocation: { latitude: number; longitude: number } | null = null;
    try {
      currentLocation = await getCurrentLocation('checkin');
    } catch {
      currentLocation = null;
    }
    if (!currentLocation) {
      toast.error('Unable to get your current location. Please enable GPS and try again.');
      throw new Error('Missing location.');
    }

    const distance = getDistanceMeters(
      currentLocation.latitude,
      currentLocation.longitude,
      stop.latitude!,
      stop.longitude!
    );

    const allowedRadius = getStopRadiusMeters(stop);
    if (distance > allowedRadius) {
      toast.error(
        `You are too far from the delivery location (~${Math.round(distance)}m, allowed ${Math.round(allowedRadius)}m).`
      );
      throw new Error('Outside allowed radius.');
    }

    let latitude = stop.latitude;
    let longitude = stop.longitude;
    let address = normalizeAddress(stop.customer_address || stop.address);
    try {
      latitude = currentLocation.latitude;
      longitude = currentLocation.longitude;
      const reverseAddress = await getAddressFromCoordinates(latitude, longitude);
      if (reverseAddress) {
        address = reverseAddress;
      }
    } catch {
      // Fallback to stop coordinates if device location is unavailable.
    }

    return { latitude, longitude, address };
  };

  const handleStartUnloading = async () => {
    if (!selectedStop || !trip) return;
    setIsUnloadingSubmitting(true);
    try {
      const { latitude, longitude, address } = await resolveLocationForStop(selectedStop);

      const res = await erpRequest(
        '/api/method/route_optimizer.api.delivery_monitoring.create_delivery_monitoring',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            delivery_trip: trip.name,
            delivery_stop: selectedStop.name,
            status: 'Unloading',
            driver: trip.driver,
            vehicle: trip.vehicle,
            customer: selectedStop.customer,
            address,
            latitude,
            longitude,
          },
        }
      );

      const payload = res.data?.message ?? res.data;
      if (!res.ok || payload?.success === false) {
        throw new Error(extractErrorMessage(payload, 'Unable to save delivery log'));
      }

      const updated = new Map(statusByStop);
      updated.set(stopKey(selectedStop), 'Unloading');
      setStatusByStop(updated);
      toast.success('Delivery marked as unloading.');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to save delivery log';
      toast.error(msg);
    } finally {
      setIsUnloadingSubmitting(false);
    }
  };

  const handleProofCapture = () => {
    proofInputRef.current?.click();
  };

  const handleProofChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setProofFilename(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      setProofImage(typeof reader.result === 'string' ? reader.result : null);
    };
    reader.readAsDataURL(file);
  };

  const handleCompleteWithProof = async () => {
    if (!selectedStop || !trip) return;
    if (!proofImage) {
      handleProofCapture();
      return;
    }
    setIsUnloadingSubmitting(true);
    try {
      const { latitude, longitude, address } = await resolveLocationForStop(selectedStop);
      const res = await erpRequest(
        '/api/method/route_optimizer.api.delivery_monitoring.complete_delivery_with_proof',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            delivery_trip: trip.name,
            delivery_stop: selectedStop.name,
            status: 'Completed',
            driver: trip.driver,
            vehicle: trip.vehicle,
            customer: selectedStop.customer,
            address,
            latitude,
            longitude,
            proof_image: proofImage,
            proof_filename: proofFilename,
          },
        }
      );

      const payload = res.data?.message ?? res.data;
      if (!res.ok || payload?.success === false) {
        throw new Error(extractErrorMessage(payload, 'Unable to complete delivery'));
      }

      const updated = new Map(statusByStop);
      updated.set(stopKey(selectedStop), 'Completed');
      setStatusByStop(updated);
      toast.success('Delivery completed and proof sent.');
      setIsUnloadingOpen(false);
      setProofImage(null);
      setProofFilename(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to complete delivery';
      toast.error(msg);
    } finally {
      setIsUnloadingSubmitting(false);
    }
  };

  useEffect(() => {
    let alive = true;
    const checkRadius = async () => {
      if (!isUnloadingOpen || !selectedStop) return;
      if (!hasStopCoordinates(selectedStop)) {
        setRadiusCheck({
          checking: false,
          allowed: false,
          message: 'Delivery coordinates are missing.',
        });
        return;
      }
      setRadiusCheck({ checking: true, allowed: false });
      try {
        const currentLocation = await getCurrentLocation('checkin');
        const distance = getDistanceMeters(
          currentLocation.latitude,
          currentLocation.longitude,
          selectedStop.latitude!,
          selectedStop.longitude!
        );
        const allowedRadius = getStopRadiusMeters(selectedStop);
        const allowed = distance <= allowedRadius;
        if (!alive) return;
        setRadiusCheck({
          checking: false,
          allowed,
          distance,
          message: allowed
            ? 'Inside allowed area.'
            : `Too far (~${Math.round(distance)}m, allowed ${Math.round(allowedRadius)}m).`,
        });
      } catch {
        if (!alive) return;
        setRadiusCheck({
          checking: false,
          allowed: false,
          message: 'Unable to get your current location.',
        });
      }
    };

    checkRadius();
    return () => {
      alive = false;
    };
  }, [isUnloadingOpen, selectedStop]);

  const isTripCompleted =
    (trip?.status && trip.status.toLowerCase() === 'completed') ||
    (totalStops > 0 && completedStops === totalStops);

  const showData = !isTripCompleted;
  const displayStops = showData ? stops : [];
  const displayTotalStops = showData ? totalStops : 0;
  const displayCompletedStops = showData ? completedStops : 0;
  const displayTripName = showData ? (trip?.name || 'Route not assigned') : '--';
  const displayCompany = showData ? (trip?.company || company || 'Company') : 'Company';
  const displayLocation = showData ? (trip?.custom_location || customLocation || 'Location') : 'Location';
  const displayNextStop = showData ? nextStop : undefined;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-emerald-100 mb-1">Welcome,</p>
            <h1 className="text-2xl font-bold mb-2">{fullName}</h1>
            <p className="text-emerald-100">
              {department || 'Delivery'} - {designation || 'Delivery Driver'}
            </p>
          </div>
          <div className="w-14 h-14 bg-white/15 rounded-xl flex items-center justify-center">
            <Truck className="w-7 h-7 text-white" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
              <Route className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Today's Route</p>
              <p className="font-semibold text-slate-800">
                {loading ? 'Loading...' : displayTripName}
              </p>
            </div>
          </div>
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>Stops: {loading ? '--' : displayTotalStops}</span>
            <span>Completed: {loading ? '--' : displayCompletedStops}</span>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Shift: {showData ? (trip?.departure_time || '--:--') : '--:--'} to --:--
          </p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Next Stop</p>
              <p className="font-semibold text-slate-800">
                {loading
                  ? 'Loading...'
                  : displayNextStop?.customer || displayNextStop?.address || 'No upcoming stop'}
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            Address: {loading ? '--' : displayNextStop?.address || '--'}
          </p>
          <p className="text-sm text-slate-500">
            ETA: {loading ? '--' : displayNextStop?.estimated_arrival || '--'}
          </p>
          <button
            type="button"
            disabled={displayStops.length === 0}
            onClick={handleNavigate}
            className="mt-4 w-full bg-blue-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Navigate
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-5">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
              <Package className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-slate-500 text-sm">Assigned Deliveries</p>
              <p className="font-semibold text-slate-800">
                {loading ? '--' : displayTotalStops} packages
              </p>
            </div>
          </div>
          <p className="text-sm text-slate-500">
            {displayCompany} - {displayLocation}
          </p>
          <p className="text-xs text-slate-400 mt-3">
            {loading ? 'Loading assignments...' : displayTotalStops ? 'Assignments loaded.' : 'Awaiting assignments.'}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Assigned Deliveries</h2>
          </div>
          <span className="text-sm text-slate-500">{loading ? '--' : displayTotalStops} total</span>
        </div>
        {error ? (
          <div className="px-6 py-10 text-center text-red-600 text-sm">{error}</div>
        ) : loading ? (
          <div className="px-6 py-10 text-center text-slate-500 text-sm">Loading deliveries...</div>
        ) : displayTotalStops === 0 ? (
          <div className="px-6 py-10 text-center text-slate-500 text-sm">
            No deliveries assigned yet.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {displayStops.map((stop, index) => (
              <button
                key={stop.name}
                type="button"
                onClick={() => openUnloadingModal(stop)}
                className="w-full text-left px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors"
              >
                <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 text-sm font-semibold">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{stop.customer || stop.address || 'Delivery Stop'}</p>
                  <p className="text-sm text-slate-500">{stop.address || '--'}</p>
                  {stop.customer_address && (
                    <p className="text-xs text-slate-400">
                      {truncateText(normalizeAddress(stop.customer_address), 90)}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${getStatusBadge(stop).className}`}
                  >
                    {getStatusBadge(stop).label}
                  </span>
                  <p className="text-xs text-slate-400 mt-1">ETA {stop.estimated_arrival || '--'}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {showRoute && showData && (
        <DeliveryRouteMap
          stops={stops}
          routeGeojson={trip?.custom_route_geojson}
          startLabel={trip?.custom_location || customLocation}
          startLatitude={trip?.latitude}
          startLongitude={trip?.longitude}
          onOpenGoogleMaps={handleOpenGoogleMaps}
          completedStopKeys={new Set(
            stops
              .filter((stop) => getStopStatus(stop) === 'Completed')
              .map((stop) => stop.name)
          )}
        />
      )}

      <Dialog open={isUnloadingOpen} onOpenChange={setIsUnloadingOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unload Delivery</DialogTitle>
            <DialogDescription>
              {selectedStop?.customer || selectedStop?.address || 'Delivery Stop'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-slate-600">
            <p>
              Address: {selectedStop?.customer_address
                ? normalizeAddress(selectedStop.customer_address)
                : selectedStop?.address || '--'}
            </p>
            <p>ETA: {selectedStop?.estimated_arrival || '--'}</p>
            <p>
              Status:{' '}
              {getStopStatus(selectedStop) || getVisitLabel(selectedStop?.visited)}
            </p>
            <p className={`text-xs ${radiusCheck.allowed ? 'text-green-600' : 'text-red-600'}`}>
              {radiusCheck.checking
                ? 'Checking distance...'
                : radiusCheck.message || 'Location check required.'}
            </p>
            {getStopStatus(selectedStop) === 'Unloading' && (
              <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-700">Delivery proof</p>
                    <p className="text-xs text-slate-500">Capture a photo before completing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleProofCapture}
                    className="inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-slate-200 hover:bg-slate-100"
                  >
                    <Camera className="h-4 w-4" />
                    {proofImage ? 'Retake' : 'Open Camera'}
                  </button>
                </div>
                <input
                  ref={proofInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleProofChange}
                />
                {proofImage && (
                  <div className="mt-3">
                    <img
                      src={proofImage}
                      alt="Delivery proof"
                      className="h-40 w-full rounded-lg object-cover"
                    />
                    {proofFilename && (
                      <p className="mt-2 text-xs text-slate-500">{proofFilename}</p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
          <DialogFooter className="flex flex-col gap-3 sm:flex-row sm:gap-2">
            <Button
              variant="outline"
              onClick={() => setIsUnloadingOpen(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={
                getStopStatus(selectedStop) === 'Unloading'
                  ? handleCompleteWithProof
                  : handleStartUnloading
              }
              disabled={
                isUnloadingSubmitting ||
                getStopStatus(selectedStop) === 'Completed' ||
                !hasStopCoordinates(selectedStop) ||
                !radiusCheck.allowed
              }
              className="w-full sm:w-auto"
            >
              {isUnloadingSubmitting
                ? 'Saving...'
                : getStopStatus(selectedStop) === 'Unloading'
                  ? proofImage
                    ? 'Submit & Complete'
                    : 'Done'
                  : getStopStatus(selectedStop) === 'Completed'
                    ? 'Completed'
                    : 'Unloading'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DeliveryPage;

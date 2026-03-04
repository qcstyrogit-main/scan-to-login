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

type PendingDeliveryAction = {
  id: string;
  employeeId: string;
  tripName: string;
  stopName: string;
  status: 'Unloading' | 'Completed';
  payload: Record<string, unknown>;
  timestamp: string;
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
const DELIVERY_PENDING_KEY = 'pending_delivery_actions_v1';

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

const loadPendingDeliveryActions = (): PendingDeliveryAction[] => {
  try {
    const raw = localStorage.getItem(DELIVERY_PENDING_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as PendingDeliveryAction[]) : [];
  } catch {
    return [];
  }
};

const savePendingDeliveryActions = (items: PendingDeliveryAction[]) => {
  try {
    localStorage.setItem(DELIVERY_PENDING_KEY, JSON.stringify(items));
  } catch {
    // ignore storage failures
  }
};

const compressImageDataUrl = async (dataUrl: string, maxWidth = 1600, quality = 0.85) => {
  return new Promise<string>((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const out = canvas.toDataURL('image/jpeg', quality);
        resolve(out || dataUrl);
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    } catch {
      resolve(dataUrl);
    }
  });
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
  const [isOnline, setIsOnline] = useState(true);
  const [syncBanner, setSyncBanner] = useState<string | null>(null);
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
  const syncingRef = useRef(false);

  const stopKey = (stop?: DeliveryStop | null) =>
    stop?.name || `${stop?.customer || ''}||${normalizeAddress(stop?.customer_address || stop?.address || '')}`;

  const getStopStatus = React.useCallback(
    (stop?: DeliveryStop | null) => statusByStop.get(stopKey(stop)) || '',
    [statusByStop]
  );

  const getStatusBadge = (stop?: DeliveryStop | null) => {
    const status = getStopStatus(stop);
    if (status === 'Completed') {
      return { label: 'Completed', className: 'delivery-pill completed' };
    }
    if (status === 'Unloading') {
      return { label: 'Unloading', className: 'delivery-pill unloading' };
    }
    const fallback = getVisitLabel(stop?.visited);
    return { label: fallback, className: 'delivery-pill pending' };
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
        if (alive) {
          const pending = loadPendingDeliveryActions()
            .filter((item) => item.employeeId === employeeId && item.tripName === trip.name);
          pending.forEach((item) => map.set(item.stopName, item.status));
          setStatusByStop(map);
        }
      } catch {
        if (alive) setStatusByStop(new Map());
      }
    };
    loadMonitoringStatuses();
    return () => {
      alive = false;
    };
  }, [trip?.name]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const updateOnline = () => setIsOnline(navigator.onLine);
    updateOnline();
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  const syncPendingDeliveryActions = React.useCallback(async () => {
    if (!isOnline || syncingRef.current) return;
    syncingRef.current = true;
    try {
      const pending = loadPendingDeliveryActions();
      if (pending.length === 0) return;
      setSyncBanner(`Syncing ${pending.length} delivery update${pending.length === 1 ? '' : 's'}...`);
      const remaining: PendingDeliveryAction[] = [];
      let syncedCount = 0;
      for (const action of pending) {
        try {
          if (action.status === 'Unloading') {
            await erpRequest(
              '/api/method/route_optimizer.api.delivery_monitoring.create_delivery_monitoring',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: action.payload,
              }
            );
          } else {
            await erpRequest(
              '/api/method/route_optimizer.api.delivery_monitoring.complete_delivery_with_proof',
              {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: action.payload,
              }
            );
          }
          syncedCount += 1;
        } catch {
          remaining.push(action);
        }
      }
      savePendingDeliveryActions(remaining);
      if (syncedCount > 0) {
        setSyncBanner(`Synced ${syncedCount} delivery update${syncedCount === 1 ? '' : 's'}.`);
        setTimeout(() => setSyncBanner(null), 2000);
      } else {
        setSyncBanner(null);
      }
    } finally {
      syncingRef.current = false;
    }
  }, [isOnline]);

  useEffect(() => {
    void syncPendingDeliveryActions();
  }, [syncPendingDeliveryActions]);

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
      const payload = {
        delivery_trip: trip.name,
        delivery_stop: selectedStop.name,
        status: 'Unloading',
        driver: trip.driver,
        vehicle: trip.vehicle,
        customer: selectedStop.customer,
        address,
        latitude,
        longitude,
      };

      if (!isOnline) {
        const pendingItem: PendingDeliveryAction = {
          id: `DELIV-${Date.now()}`,
          employeeId,
          tripName: trip.name || '',
          stopName: selectedStop.name,
          status: 'Unloading',
          payload,
          timestamp: new Date().toISOString(),
        };
        const pending = loadPendingDeliveryActions();
        savePendingDeliveryActions([pendingItem, ...pending]);

        const updated = new Map(statusByStop);
        updated.set(stopKey(selectedStop), 'Unloading');
        setStatusByStop(updated);
        toast.success('Marked as unloading offline. Will sync when online.');
        return;
      }

      const res = await erpRequest(
        '/api/method/route_optimizer.api.delivery_monitoring.create_delivery_monitoring',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }
      );

      const responsePayload = res.data?.message ?? res.data;
      if (!res.ok || responsePayload?.success === false) {
        throw new Error(extractErrorMessage(responsePayload, 'Unable to save delivery log'));
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
      const compressedProof = proofImage
        ? await compressImageDataUrl(proofImage)
        : proofImage;
      const payload = {
        delivery_trip: trip.name,
        delivery_stop: selectedStop.name,
        status: 'Completed',
        driver: trip.driver,
        vehicle: trip.vehicle,
        customer: selectedStop.customer,
        address,
        latitude,
        longitude,
        proof_image: compressedProof,
        proof_filename: proofFilename,
      };

      if (!isOnline) {
        const pendingItem: PendingDeliveryAction = {
          id: `DELIV-${Date.now()}`,
          employeeId,
          tripName: trip.name || '',
          stopName: selectedStop.name,
          status: 'Completed',
          payload,
          timestamp: new Date().toISOString(),
        };
        const pending = loadPendingDeliveryActions();
        savePendingDeliveryActions([pendingItem, ...pending]);

        const updated = new Map(statusByStop);
        updated.set(stopKey(selectedStop), 'Completed');
        setStatusByStop(updated);
        toast.success('Delivery completed offline. Will sync when online.');
        setIsUnloadingOpen(false);
        setProofImage(null);
        setProofFilename(null);
        return;
      }

      const res = await erpRequest(
        '/api/method/route_optimizer.api.delivery_monitoring.complete_delivery_with_proof',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: payload,
        }
      );

      const responsePayload = res.data?.message ?? res.data;
      if (!res.ok || responsePayload?.success === false) {
        throw new Error(extractErrorMessage(responsePayload, 'Unable to complete delivery'));
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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .delivery-page-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          min-height: 100vh;
          padding: 0;
          color: hsl(var(--foreground));
          position: relative;
          overflow-x: hidden;
        }
        .delivery-sync-banner {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          height: 32px;
          background: #2563eb;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 600;
          z-index: 80;
          letter-spacing: 0.02em;
        }
        .delivery-sync-spacer { height: 32px; }

        .delivery-page-root::before {
          content: '';
          position: fixed;
          top: -200px;
          right: -200px;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.12) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .delivery-page-root::after {
          content: '';
          position: fixed;
          bottom: -150px;
          left: -150px;
          width: 500px;
          height: 500px;
          background: radial-gradient(circle, hsl(var(--primary) / 0.08) 0%, transparent 70%);
          pointer-events: none;
          z-index: 0;
        }

        .delivery-page-content { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }

        .delivery-hero {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
          opacity: 0;
          transform: translateY(16px);
          animation: deliveryPageFadeUp 0.5s ease forwards;
        }

        .delivery-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }

        .delivery-hero-tag { color: hsl(var(--muted-foreground)); font-size: 12px; margin-bottom: 4px; }
        .delivery-hero-title { font-size: 22px; font-weight: 700; color: hsl(var(--foreground)); margin-bottom: 6px; }
        .delivery-hero-sub { font-size: 12px; color: hsl(var(--muted-foreground)); }

        .delivery-hero-icon {
          width: 56px;
          height: 56px;
          border-radius: 14px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .delivery-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 14px;
          margin-bottom: 18px;
        }
        @media (max-width: 1024px) { .delivery-stats-grid { grid-template-columns: 1fr; } }

        .delivery-stat-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 20px;
          opacity: 0;
          transform: translateY(12px);
          animation: deliveryPageFadeUp 0.5s ease 0.1s forwards;
        }
        .delivery-stat-card:nth-child(2) { animation-delay: 0.15s; }
        .delivery-stat-card:nth-child(3) { animation-delay: 0.2s; }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: hsl(var(--foreground) / 0.06);
          border: 1px solid hsl(var(--border));
          flex-shrink: 0;
        }

        .stat-label { font-size: 12px; color: hsl(var(--muted-foreground)); }
        .stat-value { font-size: 16px; font-weight: 600; color: hsl(var(--foreground)); margin-top: 4px; }
        .stat-sub { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 8px; }

        .stat-btn {
          margin-top: 12px;
          width: 100%;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          color: white;
          border: none;
          border-radius: 10px;
          padding: 10px 12px;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s;
        }
        .stat-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .stat-btn:hover { opacity: 0.9; transform: translateY(-1px); }

        .delivery-list-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(12px);
          animation: deliveryPageFadeUp 0.5s ease 0.25s forwards;
        }

        .delivery-list-header {
          padding: 16px 20px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .delivery-list-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .delivery-list-count { font-size: 12px; color: hsl(var(--muted-foreground)); }

        .delivery-row {
          width: 100%;
          text-align: left;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 14px;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
          transition: background 0.15s;
        }
        .delivery-row:hover { background: hsl(var(--foreground) / 0.02); }
        .delivery-row:last-child { border-bottom: none; }

        .delivery-index {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: hsl(var(--foreground) / 0.06);
          border: 1px solid hsl(var(--border));
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--muted-foreground));
          font-size: 12px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .delivery-name { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); }
        .delivery-text { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 3px; }
        .delivery-sub { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .delivery-pill {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 2px 8px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid transparent;
        }
        .delivery-pill.completed { background: hsl(var(--primary) / 0.12); color: hsl(var(--primary)); border-color: hsl(var(--primary) / 0.25); }
        .delivery-pill.unloading { background: hsl(var(--destructive) / 0.12); color: hsl(var(--destructive)); border-color: hsl(var(--destructive) / 0.25); }
        .delivery-pill.pending { background: hsl(var(--muted-foreground) / 0.12); color: hsl(var(--muted-foreground)); border-color: hsl(var(--muted-foreground) / 0.25); }

        .delivery-empty {
          padding: 32px 20px;
          text-align: center;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
        }

        @keyframes deliveryPageFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="delivery-page-root">
        {syncBanner && (
          <>
            <div className="delivery-sync-banner">{syncBanner}</div>
            <div className="delivery-sync-spacer" />
          </>
        )}
        <div className="delivery-page-content space-y-6">
          <div className="delivery-hero">
            <div>
              <div className="delivery-hero-tag">Welcome,</div>
              <div className="delivery-hero-title">{fullName}</div>
              <div className="delivery-hero-sub">
                {department || 'Delivery'} - {designation || 'Delivery Driver'}
              </div>
            </div>
            <div className="delivery-hero-icon">
              <Truck className="w-6 h-6 text-white" />
            </div>
          </div>

          <div className="delivery-stats-grid">
            <div className="delivery-stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="stat-icon">
                  <Route className="w-4 h-4 text-emerald-400" />
                </div>
                <div>
                  <div className="stat-label">Today's Route</div>
                  <div className="stat-value">{loading ? 'Loading...' : displayTripName}</div>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Stops: {loading ? '--' : displayTotalStops}</span>
                <span>Completed: {loading ? '--' : displayCompletedStops}</span>
              </div>
              <div className="stat-sub">
                Shift: {showData ? (trip?.departure_time || '--:--') : '--:--'} to --:--
              </div>
            </div>

            <div className="delivery-stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="stat-icon">
                  <MapPin className="w-4 h-4 text-blue-400" />
                </div>
                <div>
                  <div className="stat-label">Next Stop</div>
                  <div className="stat-value">
                    {loading
                      ? 'Loading...'
                      : displayNextStop?.customer || displayNextStop?.address || 'No upcoming stop'}
                  </div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                Address: {loading ? '--' : displayNextStop?.address || '--'}
              </div>
              <div className="text-xs text-muted-foreground">
                ETA: {loading ? '--' : displayNextStop?.estimated_arrival || '--'}
              </div>
              <button
                type="button"
                disabled={displayStops.length === 0}
                onClick={handleNavigate}
                className="stat-btn"
              >
                Navigate
              </button>
            </div>

            <div className="delivery-stat-card">
              <div className="flex items-center gap-3 mb-3">
                <div className="stat-icon">
                  <Package className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <div className="stat-label">Assigned Deliveries</div>
                  <div className="stat-value">{loading ? '--' : displayTotalStops} packages</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground">
                {displayCompany} - {displayLocation}
              </div>
              <div className="stat-sub">
                {loading ? 'Loading assignments...' : displayTotalStops ? 'Assignments loaded.' : 'Awaiting assignments.'}
              </div>
            </div>
          </div>

          <div className="delivery-list-card">
            <div className="delivery-list-header">
              <div className="delivery-list-title">
                <Package className="w-4 h-4 text-muted-foreground" />
                Assigned Deliveries
              </div>
              <span className="delivery-list-count">{loading ? '--' : displayTotalStops} total</span>
            </div>
            {error ? (
              <div className="delivery-empty" style={{ color: 'hsl(var(--destructive))' }}>{error}</div>
            ) : loading ? (
              <div className="delivery-empty">Loading deliveries...</div>
            ) : displayTotalStops === 0 ? (
              <div className="delivery-empty">No deliveries assigned yet.</div>
            ) : (
              <div>
                {displayStops.map((stop, index) => (
                  <button
                    key={stop.name}
                    type="button"
                    onClick={() => openUnloadingModal(stop)}
                    className="delivery-row"
                  >
                    <div className="delivery-index">{index + 1}</div>
                    <div style={{ flex: 1 }}>
                      <div className="delivery-name">{stop.customer || stop.address || 'Delivery Stop'}</div>
                      <div className="delivery-text">{stop.address || '--'}</div>
                      {stop.customer_address && (
                        <div className="delivery-sub">
                          {truncateText(normalizeAddress(stop.customer_address), 90)}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <span className={getStatusBadge(stop).className}>
                        {getStatusBadge(stop).label}
                      </span>
                      <div className="delivery-sub">ETA {stop.estimated_arrival || '--'}</div>
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
        </div>
      </div>

      <Dialog open={isUnloadingOpen} onOpenChange={setIsUnloadingOpen}>
        <DialogContent className="w-[92vw] max-w-sm bg-card text-foreground border border-border rounded-2xl shadow-2xl p-5">
          <DialogHeader>
            <DialogTitle className="text-foreground">Unload Delivery</DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {selectedStop?.customer || selectedStop?.address || 'Delivery Stop'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
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
            <p className={`text-xs ${radiusCheck.allowed ? 'text-foreground' : 'text-destructive'}`}>
              {radiusCheck.checking
                ? 'Checking distance...'
                : radiusCheck.message || 'Location check required.'}
            </p>
            {getStopStatus(selectedStop) === 'Unloading' && (
              <div className="mt-4 rounded-xl border border-border bg-muted p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-foreground">Delivery proof</p>
                    <p className="text-xs text-muted-foreground">Capture a photo before completing.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleProofCapture}
                    className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-xs font-semibold text-foreground shadow-sm ring-1 ring-border hover:bg-secondary/80"
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
                      <p className="mt-2 text-xs text-muted-foreground">{proofFilename}</p>
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
              className="w-full sm:w-auto rounded-xl border border-border bg-secondary text-foreground hover:bg-secondary/80"
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
              className="w-full sm:w-auto rounded-xl border border-destructive/30 bg-destructive/15 text-destructive hover:bg-destructive/25"
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
    </>
  );
};

export default DeliveryPage;

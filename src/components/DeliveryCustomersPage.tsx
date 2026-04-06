import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Users, RefreshCw } from 'lucide-react';
import { erpRequest, extractErrorMessage } from '@/lib/erpApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Circle, MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import { getAddressDetailsFromCoordinates, getCurrentLocation } from '@/lib/location';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

const LOCATION_API_PREFIX = '/api/method/qcmc_logic.api.locations';

const cleanPayload = (payload: Record<string, unknown>) => {
  const cleaned: Record<string, unknown> = {};
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    if (typeof value === 'number' && !Number.isFinite(value)) return;
    if (typeof value === 'string' && value.trim() === '') return;
    cleaned[key] = value;
  });
  return cleaned;
};

type LocationRecord = {
  name: string;
  location_name?: string;
  is_group?: number | boolean;
  is_container?: number | boolean;
  custom_is_customer?: number | boolean;
  latitude?: number;
  longitude?: number;
  area?: string;
  area_uom?: string;
  custom_search?: string;
  location?: string;
  address_id?: string;
  address_type?: string;
};

type CustomerRecord = {
  name: string;
  customer_name?: string;
};

type CustomerListResponse = {
  items: CustomerRecord[];
};

type AddressForm = {
  email_id: string;
  address_type: string;
  address_line2: string;
  city: string;
  country: string;
};

type LocationListResponse = {
  count: number;
  start: number;
  limit: number;
  items: LocationRecord[];
};

const getFriendlyError = (err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err || '');
  const lower = msg.toLowerCase();
  const isPermission =
    lower.includes('permission') || lower.includes('not permitted') || lower.includes('access denied');
  return {
    message: isPermission
      ? 'Access denied. Please contact your administrator to allow Location access.'
      : msg || 'Unable to load addresses.',
    isPermission,
  };
};

const isLikelyJson = (value?: string) => {
  if (!value) return false;
  const trimmed = value.trim();
  return trimmed.startsWith('{') || trimmed.startsWith('[');
};

const summarizeLocation = (value?: string) => {
  if (!value) return '--';
  if (isLikelyJson(value)) {
    try {
      JSON.parse(value);
      return 'Map coordinates saved';
    } catch {
      return 'Map coordinates (invalid JSON)';
    }
  }
  return value;
};

const extractFirstCoordinate = (value?: string): [number, number] | null => {
  if (!value || !isLikelyJson(value)) return null;
  try {
    const parsed = JSON.parse(value);
    const asArray = (input: unknown): unknown[] => (Array.isArray(input) ? input : []);
    const maybePoint = (coords: unknown): [number, number] | null => {
      if (!Array.isArray(coords) || coords.length < 2) return null;
      const [lng, lat] = coords;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return [Number(lat), Number(lng)];
      }
      return null;
    };
    if (parsed?.type === 'FeatureCollection') {
      const features = asArray(parsed.features);
      for (const feature of features) {
        const coords = feature?.geometry?.coordinates;
        const point = maybePoint(coords);
        if (point) return point;
      }
    }
    if (parsed?.type === 'Feature') {
      return maybePoint(parsed?.geometry?.coordinates);
    }
    if (parsed?.type === 'Point') {
      return maybePoint(parsed?.coordinates);
    }
  } catch {
    return null;
  }
  return null;
};

const toFiniteNumber = (value: unknown): number | undefined => {
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const radiusFromArea = (areaSqMeters?: unknown): number | undefined => {
  const area = toFiniteNumber(areaSqMeters);
  if (!area || area <= 0) return undefined;
  return Math.sqrt(area / Math.PI);
};

const buildLocationGeoJson = (latitude?: number, longitude?: number, radiusMeters?: number) => {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return undefined;
  const hasRadius = Number.isFinite(radiusMeters) && (radiusMeters as number) > 0;
  return JSON.stringify({
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
      },
      ...(hasRadius
        ? [
            {
              type: 'Feature',
              properties: {
                point_type: 'circle',
                radius: radiusMeters,
              },
              geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
            },
          ]
        : []),
    ],
  });
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== 'object') return null;
  return value as Record<string, unknown>;
};

const pickString = (source: unknown, keys: string[]): string | undefined => {
  const record = asRecord(source);
  if (!record) return undefined;
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
};

const extractDocName = (payload: unknown, keys: string[]): string | undefined => {
  const direct = pickString(payload, keys);
  if (direct) return direct;
  const record = asRecord(payload);
  if (!record) return undefined;
  for (const key of keys) {
    const nested = record[key];
    const nestedDirect = pickString(nested, ['name', ...keys]);
    if (nestedDirect) return nestedDirect;
  }
  const message = record.message;
  const nestedMessage = pickString(message, keys);
  if (nestedMessage) return nestedMessage;
  return undefined;
};

const isDuplicateLocationError = (payload: unknown) => {
  const msg = extractErrorMessage(payload, '').toLowerCase();
  return (
    msg.includes('duplicate') ||
    msg.includes('already exists') ||
    msg.includes('duplicate entry')
  );
};

const ADDRESS_TYPE_OPTIONS = [
  'Billing',
  'Shipping',
  'Office',
  'Personal',
  'Plant',
  'Postal',
  'Shop',
  'Subsidiary',
  'Warehouse',
  'Current',
  'Permanent',
  'Other',
];

const locationMarkerIcon = L.icon({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const DeliveryCustomersPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(0);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isMapOpen, setIsMapOpen] = useState(false);
  const [mapCoords, setMapCoords] = useState<[number, number] | null>(null);
  const [mapLabel, setMapLabel] = useState<string>('Location');
  const [locationInput, setLocationInput] = useState('');
  const [reverseGeocodeLoading, setReverseGeocodeLoading] = useState(false);
  const [geoFillLoading, setGeoFillLoading] = useState(false);
  const [showAddressField, setShowAddressField] = useState(false);
  const [customerInput, setCustomerInput] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomerName, setSelectedCustomerName] = useState('');
  const customerInputRef = useRef<HTMLInputElement | null>(null);
  const addressInputRef = useRef<HTMLTextAreaElement | null>(null);
  const [searchCustomerInput, setSearchCustomerInput] = useState('');
  const [searchCustomerQuery, setSearchCustomerQuery] = useState('');
  const [showSearchDropdown, setShowSearchDropdown] = useState(false);
  const [selectedSearchCustomerId, setSelectedSearchCustomerId] = useState('');
  const [addressTypeOpen, setAddressTypeOpen] = useState(false);
  const addressTypeRef = useRef<HTMLDivElement | null>(null);
  const [showGeoFields, setShowGeoFields] = useState(false);
  const [autoLocationName, setAutoLocationName] = useState(true);
  const [form, setForm] = useState<LocationRecord>({
    name: '',
    location_name: '',
    area: '',
    location: '',
    latitude: undefined,
    longitude: undefined,
    custom_is_customer: 1,
    address_type: 'Shipping',
    area_uom: 'Square Meter',
  });
  const [addressForm, setAddressForm] = useState<AddressForm>({
    email_id: '',
    address_type: 'Shipping',
    address_line2: '',
    city: '',
    country: '',
  });

  const limit = 20;

  const listQuery = useQuery({
    queryKey: ['delivery-locations', { search, page, selectedSearchCustomerId }],
    queryFn: async (): Promise<LocationListResponse> => {
      if (!selectedSearchCustomerId) {
        return { count: 0, start: 0, limit, items: [] };
      }
      const endpoint = `${LOCATION_API_PREFIX}.list_locations_by_customer`;
      const res = await erpRequest(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: {
          limit,
          start: page * limit,
          customer: selectedSearchCustomerId,
          custom_is_customer: 1,
          is_group: 0,
          is_container: 0,
        },
      });
      const payload = res.data?.message ?? res.data;
      if (!res.ok || payload?.success === false) {
        throw new Error(extractErrorMessage(payload, 'Unable to load addresses'));
      }
      return {
        count: Number(payload?.count) || 0,
        start: Number(payload?.start) || 0,
        limit: Number(payload?.limit) || limit,
        items: Array.isArray(payload?.items) ? payload.items : [],
      };
    },
    staleTime: 15000,
    retry: 1,
    enabled: !!selectedSearchCustomerId,
  });

  useEffect(() => {
    if (!addressTypeOpen) return;
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!target || !addressTypeRef.current) return;
      if (addressTypeRef.current.contains(target)) return;
      setAddressTypeOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [addressTypeOpen]);

  const searchCustomerLookup = useQuery({
    queryKey: ['customer-search-main', searchCustomerQuery],
    queryFn: async (): Promise<CustomerListResponse> => {
      if (!(searchCustomerQuery ?? '').trim()) return { items: [] };
      try {
        const res = await erpRequest('/api/method/qcmc_logic.api.customers.list_customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            limit: 20,
            start: 0,
            search: (searchCustomerQuery ?? '').trim(),
            include_disabled: 0,
          },
        });
        const payload = res.data?.message ?? res.data;
        if (!res.ok || payload?.success === false) {
          throw new Error(extractErrorMessage(payload, 'Unable to load customers'));
        }
        return {
          items: Array.isArray(payload?.items) ? payload.items : [],
        };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to load customers');
        return { items: [] };
      }
    },
    enabled: (searchCustomerQuery ?? '').trim().length >= 2,
    staleTime: 15000,
    retry: 0,
  });

  const customerQuery = useQuery({
    queryKey: ['customer-search', customerSearch],
    queryFn: async (): Promise<CustomerListResponse> => {
      if (!(customerSearch ?? '').trim()) return { items: [] };
      try {
        const res = await erpRequest('/api/method/qcmc_logic.api.customers.list_customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            limit: 20,
            start: 0,
          search: (customerSearch ?? '').trim(),
            include_disabled: 0,
          },
        });
        const payload = res.data?.message ?? res.data;
        if (!res.ok || payload?.success === false) {
          throw new Error(extractErrorMessage(payload, 'Unable to load customers'));
        }
        return {
          items: Array.isArray(payload?.items) ? payload.items : [],
        };
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Unable to load customers');
        return { items: [] };
      }
    },
    enabled: isCreateOpen && (customerSearch ?? '').trim().length >= 2,
    staleTime: 15000,
    retry: 0,
  });


  const locations = useMemo(() => listQuery.data?.items ?? [], [listQuery.data?.items]);
  const loadedCount = locations.length;
  const hasNextPage = loadedCount === limit;

  const handleSearchChange = (value: string) => {
    setSearch(value);
    setPage(0);
    if (!value.trim()) {
      setSelectedSearchCustomerId('');
    }
  };

  const headerSubtitle = listQuery.isFetching
    ? 'Syncing address list'
    : `${loadedCount} addresses loaded`;
  const listError = listQuery.isError ? getFriendlyError(listQuery.error) : null;

  const handleFormChange = (field: keyof LocationRecord, value: string | number) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const openCreate = () => {
    setForm({
      name: '',
      location_name: '',
      area: '',
      location: '',
      latitude: undefined,
      longitude: undefined,
      custom_is_customer: 1,
      address_type: 'Shipping',
      area_uom: 'Square Meter',
    });
    setAddressForm({
      email_id: '',
      address_type: 'Shipping',
      address_line2: '',
      city: '',
      country: '',
    });
    setLocationInput('');
    setShowAddressField(false);
    setCustomerInput('');
    setCustomerSearch('');
    setShowCustomerDropdown(false);
    setSelectedCustomerId('');
    setSelectedCustomerName('');
    setAutoLocationName(true);
    setShowGeoFields(false);
    setIsCreateOpen(true);
  };

  const resolveCustomerName = () => {
    const input = (selectedCustomerName || customerInput || customerSearch || '').trim();
    if (!input) return '';
    return input;
  };

  const buildLocationName = (customerName: string, count: number) => {
    const series = String(Math.max(1, count + 1)).padStart(3, '0');
    return `${customerName} ${series}`;
  };

  useEffect(() => {
    if (!isCreateOpen || !selectedCustomerId || !autoLocationName) return;
    const customerName = resolveCustomerName();
    if (!customerName) return;
    let active = true;
    const loadCount = async () => {
      try {
        const res = await erpRequest(`${LOCATION_API_PREFIX}.list_locations_by_customer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            limit: 1,
            start: 0,
            customer: selectedCustomerId,
            custom_is_customer: 1,
            is_group: 0,
            is_container: 0,
          },
        });
        const payload = res.data?.message ?? res.data;
        if (!res.ok || payload?.success === false) return;
        const count = Number(payload?.count) || 0;
        if (!active) return;
        setForm((prev) => {
          if (!autoLocationName || prev.location_name?.trim()) return prev;
          return { ...prev, location_name: buildLocationName(customerName, count) };
        });
      } catch {
        // ignore auto-name failures
      }
    };
    loadCount();
    return () => {
      active = false;
    };
  }, [isCreateOpen, selectedCustomerId, autoLocationName]);


  useEffect(() => {
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: markerIcon2x,
      iconUrl: markerIcon,
      shadowUrl: markerShadow,
    });
  }, []);

  const openMapFor = (coords: [number, number], label: string) => {
    setMapCoords(coords);
    setMapLabel(label || 'Location');
    setIsMapOpen(true);
  };
  const createMutation = useMutation({
    mutationFn: async () => {
      const resolvedCustomer = selectedCustomerId.trim();
      if (!resolvedCustomer) {
        throw new Error('Please select a customer from the suggestions before saving.');
      }
      if (!form.location_name?.trim()) {
        throw new Error('Location Name is required');
      }
      const fallbackAddressInput =
        addressInputRef.current?.value ||
        (typeof document !== 'undefined'
          ? (document.getElementById('address-input') as HTMLTextAreaElement | null)?.value
          : '') ||
        '';
      const resolvedAddressInput = (
        fallbackAddressInput ||
        locationInput ||
        addressForm.address_line2 ||
        form.location ||
        ''
      ).trim();
      if (!resolvedAddressInput) {
        throw new Error('Address is required');
      }
      const locationPayload = cleanPayload({
        location_name: form.location_name,
        custom_is_customer: 1,
        latitude: form.latitude,
        longitude: form.longitude,
        location:
          isLikelyJson(form.location)
            ? form.location
            : buildLocationGeoJson(
                form.latitude,
                form.longitude,
                radiusFromArea(form.area)
              ),
        custom_search: resolvedAddressInput,
        area: form.area,
        area_uom: form.area_uom,
      });
      const locationRes = await erpRequest(`${LOCATION_API_PREFIX}.create_location`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { data: locationPayload },
      });
      const locationData = locationRes.data?.message ?? locationRes.data;
      let locationDocName =
        extractDocName(locationData, ['name', 'location', 'location_name', 'location_id']) ||
        extractDocName(locationData?.message ?? locationData, ['name', 'location', 'location_name', 'location_id']);

      if (!locationRes.ok || locationData?.success === false) {
        if (!isDuplicateLocationError(locationData)) {
          throw new Error(extractErrorMessage(locationData, 'Unable to create location'));
        }
      }

      if (!locationDocName) {
        // If duplicate, fetch existing location doc by name (location_name is the doc name in this setup).
        const lookupName = form.location_name?.trim();
        if (lookupName) {
          const getRes = await erpRequest(`${LOCATION_API_PREFIX}.get_location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: { name: lookupName },
          });
          const getData = getRes.data?.message ?? getRes.data;
          if (getRes.ok && getData) {
            locationDocName =
              extractDocName(getData, ['name', 'location', 'location_name', 'location_id']) ||
              extractDocName(getData?.message ?? getData, ['name', 'location', 'location_name', 'location_id']) ||
              lookupName;
          }
        }
      }

      if (!locationDocName) {
        throw new Error('Location was created, but no Location ID was returned.');
      }

      if (locationDocName) {
        const updateRes = await erpRequest(`${LOCATION_API_PREFIX}.update_location`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: {
            name: locationDocName,
            data: cleanPayload({
              custom_search: resolvedAddressInput,
              area: form.area,
              area_uom: form.area_uom,
              latitude: form.latitude,
              longitude: form.longitude,
              location:
                isLikelyJson(form.location)
                  ? form.location
                  : buildLocationGeoJson(
                      form.latitude,
                      form.longitude,
                      radiusFromArea(form.area)
                    ),
            }),
          },
        });
        const updateData = updateRes.data?.message ?? updateRes.data;
        if (!updateRes.ok || updateData?.success === false) {
          const msg = extractErrorMessage(updateData, 'Unable to update location address');
          toast.warning(`Location saved, but address label update failed: ${msg}`);
        }
      }

      const addressPayload = cleanPayload({
        customer: resolvedCustomer,
        address_title: form.location_name,
        email_id: addressForm.email_id,
        address_type: addressForm.address_type || 'Shipping',
        address_line1: resolvedAddressInput,
        city: addressForm.city,
        country: addressForm.country,
        custom_location: locationDocName,
        location_name: form.location_name,
        latitude: form.latitude,
        longitude: form.longitude,
        area: form.area,
        area_uom: form.area_uom,
      });
      const addressRes = await erpRequest(`${LOCATION_API_PREFIX}.create_customer_address`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { data: addressPayload },
      });
      const addressData = addressRes.data?.message ?? addressRes.data;
      if (!addressRes.ok || addressData?.success === false) {
        throw new Error(extractErrorMessage(addressData, 'Unable to create address'));
      }

      return addressData;
    },
    onSuccess: () => {
      toast.success('Address created');
      setIsCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ['delivery-locations'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Unable to create address');
    },
  });

  useEffect(() => {
    if (!isCreateOpen) return;
    if (locationInput.trim()) return;
    if (!form.latitude || !form.longitude) return;
    if (!isLikelyJson(form.location)) return;

    let alive = true;
    const loadAddress = async () => {
      setReverseGeocodeLoading(true);
      try {
        const addr = await getAddressDetailsFromCoordinates(form.latitude as number, form.longitude as number);
        if (alive && addr?.displayName) {
          setLocationInput(addr.displayName);
          setForm((prev) => ({ ...prev, location: addr.displayName }));
        }
      } finally {
        if (alive) setReverseGeocodeLoading(false);
      }
    };
    loadAddress();
    return () => {
      alive = false;
    };
  }, [isCreateOpen, form.latitude, form.longitude, form.location, locationInput]);

  const handleUseCurrentLocation = async () => {
    setGeoFillLoading(true);
    setShowAddressField(true);
    try {
      const radiusMeters = 50;
      const areaSqMeters = Math.PI * radiusMeters * radiusMeters;
      const { latitude, longitude } = await getCurrentLocation('checkin');
      const geoJson = buildLocationGeoJson(
        latitude,
        longitude,
        radiusFromArea(areaSqMeters)
      );
      setForm((prev) => ({
        ...prev,
        latitude,
        longitude,
        area: areaSqMeters.toFixed(2),
        area_uom: 'Square Meter',
        location: geoJson ?? prev.location,
      }));
      const addr = await getAddressDetailsFromCoordinates(latitude, longitude);
      if (addr?.displayName) {
        setLocationInput(addr.displayName);
        setForm((prev) => ({ ...prev, location: addr.displayName }));
        setAddressForm((prev) => ({
          ...prev,
          city: prev.city || addr.city || '',
          country: prev.country || addr.country || '',
        }));
        setShowGeoFields(true);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Unable to get current location');
    } finally {
      setGeoFillLoading(false);
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .cust-root {
          font-family: 'Sora', sans-serif;
          animation: fadeUp 0.4s ease both;
        }
        .cust-mono { font-family: 'JetBrains Mono', monospace; }
        .cust-root {
          font-family: 'Sora', sans-serif;
          animation: fadeUp 0.4s ease both;
          color: hsl(var(--foreground));
          min-height: 100vh;
          padding-bottom: calc(90px + env(safe-area-inset-bottom));
        }
        .cust-dialog-content {
          width: min(92vw, 360px);
          max-height: min(88vh, 760px);
          overflow-y: auto;
          padding: 18px;
          padding-bottom: calc(18px + env(safe-area-inset-bottom));
          border-radius: 24px;
        }
        .cust-dialog-header {
          display: none;
        }
        .cust-dialog-body {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }
        .cust-dialog-content .cust-form-input,
        .cust-dialog-content .cust-select-btn,
        .cust-dialog-content .cust-textarea,
        .cust-dialog-content button {
          border-radius: 12px;
        }
        .cust-dialog-content .cust-form-input,
        .cust-dialog-content .cust-select-btn {
          min-height: 46px;
          border-color: hsl(var(--border) / 0.9);
          background: hsl(var(--background));
          box-shadow: inset 0 1px 2px hsl(var(--foreground) / 0.03);
        }
        .cust-dialog-content .cust-form-input[readonly],
        .cust-dialog-content .cust-textarea[readonly] {
          color: hsl(var(--foreground));
          opacity: 1;
        }
        .cust-hero {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.18);
          border-radius: 20px;
          padding: 24px 26px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 16px;
          position: relative;
          overflow: hidden;
        }
        .cust-hero::after {
          content: '';
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at 20% 0%, hsl(var(--primary) / 0.18), transparent 55%);
          pointer-events: none;
        }
        .cust-hero-title { font-size: 22px; font-weight: 700; }
        .cust-hero-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 6px; }
        .cust-hero-icon {
          width: 52px; height: 52px; border-radius: 14px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          display: flex; align-items: center; justify-content: center; color: white;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .cust-toolbar {
          margin-top: 18px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          padding: 14px 16px;
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          align-items: center;
          justify-content: space-between;
        }

        .cust-search {
          display: flex;
          align-items: center;
          gap: 10px;
          flex: 1;
          min-width: 240px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          padding: 10px 14px;
        }
        .cust-search-wrap {
          position: relative;
          flex: 1;
          min-width: 240px;
        }
        .cust-search input {
          border: none;
          background: transparent;
          outline: none;
          font-size: 13px;
          color: hsl(var(--foreground));
          width: 100%;
        }
        .cust-textarea {
          width: 100%;
          min-height: 112px;
          resize: vertical;
          padding: 12px 14px;
          border-radius: 12px;
          background: hsl(var(--background));
          border: 1px solid hsl(var(--border) / 0.9);
          color: hsl(var(--foreground));
          font-size: 14px;
          line-height: 1.45;
          outline: none;
          font-family: 'Sora', sans-serif;
          transition: border-color 0.2s, background 0.2s;
          box-shadow: inset 0 1px 2px hsl(var(--foreground) / 0.03);
        }
        .cust-textarea:focus {
          border-color: hsl(var(--primary) / 0.4);
          background: hsl(var(--primary) / 0.05);
        }

        .cust-actions {
        .cust-btn {
          padding: 11px 18px;
          border-radius: 11px;
          cursor: pointer;
          border: none;
          font-family: 'Sora', sans-serif;
          font-size: 13px;
          font-weight: 600;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
        }
        .cust-btn-primary {
          color: white;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.85));
          box-shadow: 0 4px 14px rgba(99,102,241,0.25);
        }
        .cust-btn-primary:hover {
          opacity: 0.9;
          transform: translateY(-1px);
        }
        .cust-btn-secondary {
          background: hsl(var(--foreground) / 0.05);
          border: 1px solid hsl(var(--foreground) / 0.08);
          color: hsl(var(--muted-foreground));
        }
        .cust-btn-secondary:hover {
          background: hsl(var(--primary) / 0.12);
          color: hsl(var(--primary));
          border-color: hsl(var(--primary) / 0.3);
        }
        .cust-btn-secondary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
        }
        .cust-field-hint {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
          line-height: 1.35;
          margin-top: 2px;
        }
        .cust-dropdown-wrap {
          position: relative;
        }
        .cust-dropdown-list {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          box-shadow: 0 18px 40px -24px hsl(var(--foreground) / 0.4);
          padding: 6px;
          z-index: 20;
          max-height: 220px;
          overflow-y: auto;
        }
        .cust-dropdown-item {
          padding: 8px 10px;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          gap: 2px;
          cursor: pointer;
          transition: background 0.15s;
        }
        .cust-dropdown-item:hover {
          background: hsl(var(--primary) / 0.08);
        }
        .cust-dropdown-title {
          font-size: 12px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }
        .cust-dropdown-sub {
          font-size: 11px;
          color: hsl(var(--muted-foreground));
        }
        .cust-select {
          appearance: none;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
        }
        .cust-select-btn {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          width: 100%;
          background: hsl(var(--background));
          color: hsl(var(--foreground));
          border: 1px solid hsl(var(--border) / 0.9);
          border-radius: 12px;
          padding: 11px 14px;
          font-size: 14px;
          cursor: pointer;
          min-height: 46px;
        }
        .cust-type-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          right: 0;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 12px;
          box-shadow: 0 18px 40px -24px hsl(var(--foreground) / 0.4);
          padding: 6px;
          z-index: 30;
          max-height: 260px;
          overflow-y: auto;
        }
        .cust-type-item {
          padding: 10px 12px;
          border-radius: 8px;
          display: flex;
          align-items: center;
          cursor: pointer;
          font-size: 14px;
          color: hsl(var(--foreground));
        }
        .cust-type-item:hover { background: hsl(var(--primary) / 0.08); }

        .cust-banner {
          margin-top: 16px;
          padding: 12px 14px;
          border-radius: 14px;
          border: 1px solid hsl(var(--destructive) / 0.35);
          background: hsl(var(--destructive) / 0.1);
          color: hsl(var(--destructive));
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          font-size: 12px;
        }
        .cust-banner-actions {
          display: flex;
          gap: 8px;
        }

        .cust-card {
          margin-top: 16px;
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
        }
        .cust-card-header {
          padding: 16px 18px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
        .cust-card-title { font-size: 14px; font-weight: 600; }
        .cust-card-body { padding: 8px 0; }

        .cust-row {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr auto;
          gap: 12px;
          padding: 14px 18px;
          border-bottom: 1px solid hsl(var(--border) / 0.7);
          align-items: center;
        }
        .cust-row:last-child { border-bottom: none; }
        .cust-name { font-weight: 600; font-size: 14px; }
        .cust-meta { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }
        .cust-meta-wrap { word-break: break-word; }
        .cust-inline-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 6px;
        }
        .cust-map-btn {
          border: 1px solid hsl(var(--border));
          background: hsl(var(--background));
          padding: 4px 8px;
          border-radius: 999px;
          font-size: 11px;
          color: hsl(var(--foreground));
          transition: background 0.15s, color 0.15s, border-color 0.15s;
        }
        .cust-map-btn:hover {
          background: hsl(var(--primary) / 0.12);
          border-color: hsl(var(--primary) / 0.3);
          color: hsl(var(--primary));
        }
        .cust-map-dialog .leaflet-container {
          height: 240px;
          border-radius: 12px;
        }
        .cust-map-dialog .leaflet-control-attribution {
          font-size: 10px;
        }
        .cust-pill {
          display: inline-flex;
          align-items: center;
          padding: 2px 8px;
          border-radius: 999px;
          font-size: 11px;
          font-weight: 600;
          border: 1px solid hsl(var(--border));
          color: hsl(var(--muted-foreground));
        }
        .cust-pill.active {
          background: hsl(var(--primary) / 0.12);
          color: hsl(var(--primary));
          border-color: hsl(var(--primary) / 0.2);
        }

        .cust-empty {
          padding: 32px 18px;
          text-align: center;
          color: hsl(var(--muted-foreground));
          font-size: 13px;
          word-break: break-word;
        }

        .cust-pagination {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 18px 16px;
          font-size: 12px;
          color: hsl(var(--muted-foreground));
        }

        .cust-form-grid {
          display: grid;
          gap: 14px;
          grid-template-columns: 1fr;
        }

        .cust-form-field {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }
        .cust-form-field label {
          font-size: 14px;
          font-weight: 600;
        }
        .cust-form-input {
          height: 46px;
          padding: 11px 14px;
          font-size: 14px;
        }
        .cust-form-span-2 {
          grid-column: 1 / -1;
        }
        .cust-form-split {
          display: grid;
          gap: 12px;
          grid-template-columns: minmax(0, 1fr) minmax(0, 0.72fr);
          align-items: start;
        }
        .cust-dialog-actions {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-top: 4px;
        }
        .cust-dialog-actions button {
          width: 100%;
          min-height: 46px;
          font-size: 15px;
          font-weight: 600;
        }
        .cust-dialog-actions .cust-save-btn {
          background: #3f73ea;
          color: white;
        }
        .cust-dialog-actions .cust-save-btn:hover {
          background: #3568dd;
        }

        .cust-id {
          padding: 8px 10px;
          border-radius: 10px;
          background: hsl(var(--muted) / 0.4);
          border: 1px solid hsl(var(--border));
          font-size: 12px;
        }

        @media (max-width: 720px) {
          .cust-hero {
            flex-direction: column;
            align-items: flex-start;
          }
          .cust-toolbar {
            gap: 10px;
          }
          .cust-search {
            min-width: 100%;
          }
          .cust-actions {
            width: 100%;
            flex-direction: column;
            align-items: stretch;
          }
          .cust-actions > * { width: 100%; }
          .cust-row {
            grid-template-columns: 1fr;
          }
          .cust-dialog-content {
            width: min(95vw, 360px);
            padding: 16px;
            padding-bottom: calc(16px + env(safe-area-inset-bottom));
          }
        }

        @media (max-width: 380px) {
          .cust-actions button .cust-btn-label {
            display: inline;
            font-size: 11px;
          }
          .cust-actions button .cust-btn-icon {
            margin-right: 6px;
          }
        }
      `}</style>

      <div className="cust-root space-y-6">
        <div className="cust-hero">
          <div>
            <div className="cust-hero-title">Customer Address Directory</div>
            <div className="cust-hero-sub">Manage customer delivery addresses.</div>
            <div className="cust-hero-sub">{headerSubtitle}</div>
          </div>
          <div className="cust-hero-icon">
            <Users size={20} />
          </div>
        </div>

        <div className="cust-toolbar">
          <div className="cust-search-wrap">
            <div className="cust-search">
              <Search size={16} className="text-muted-foreground" />
              <input
                autoComplete="off"
                value={searchCustomerInput}
                onChange={(e) => {
                  const nextValue = e.target.value ?? '';
                  setSearchCustomerInput(nextValue);
                  setSearchCustomerQuery(nextValue);
                  setShowSearchDropdown(true);
                  handleSearchChange(nextValue);
                }}
                onFocus={() => setShowSearchDropdown(true)}
                onBlur={() => setTimeout(() => setShowSearchDropdown(false), 150)}
                placeholder="Search by customer name or ID"
                aria-label="Search addresses"
              />
            </div>
            {showSearchDropdown && (searchCustomerLookup.data?.items?.length || 0) > 0 && (
              <div className="cust-dropdown-list">
                {(searchCustomerLookup.data?.items ?? []).map((customer, idx) => (
                  <div
                    key={customer.name || `${customer.customer_name || 'customer'}-${idx}`}
                    className="cust-dropdown-item"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const selected = customer.name || customer.customer_name || '';
                      setSearchCustomerInput(selected);
                      setSearchCustomerQuery(selected);
                      setSelectedSearchCustomerId(customer.name || '');
                      setShowSearchDropdown(false);
                      handleSearchChange(selected);
                    }}
                  >
                    <span className="cust-dropdown-title">
                      {customer.customer_name || customer.name}
                    </span>
                    <span className="cust-dropdown-sub">ID: {customer.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="cust-actions">
            <Button
              variant="outline"
              size="sm"
              className="rounded-lg"
              onClick={() => listQuery.refetch()}
              disabled={listQuery.isFetching}
              aria-label="Refresh"
            >
              <RefreshCw
                className={[
                  'cust-btn-icon',
                  listQuery.isFetching ? 'mr-2 h-4 w-4 animate-spin' : 'mr-2 h-4 w-4',
                ].join(' ')}
              />
              <span className="cust-btn-label">Refresh</span>
            </Button>
            <Button size="sm" className="rounded-lg" onClick={openCreate} aria-label="Add Address">
              <Plus className="cust-btn-icon mr-2 h-4 w-4" />
              <span className="cust-btn-label">Add Address</span>
            </Button>
          </div>
        </div>

        {listError?.isPermission && (
          <div className="cust-banner">
            <div>
              <div className="font-semibold">Permission required</div>
              <div>{listError.message}</div>
            </div>
            <div className="cust-banner-actions">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => listQuery.refetch()}
              >
                Retry
              </Button>
            </div>
          </div>
        )}

        <div className="cust-card">
          <div className="cust-card-header">
            <div>
              <div className="cust-card-title">Customer Address Directory</div>
              <div className="cust-meta">Showing page {page + 1}</div>
            </div>
            <div className="cust-pill active">{loadedCount} loaded</div>
          </div>
          <div className="cust-card-body">
            {!selectedSearchCustomerId ? (
              <div className="cust-empty">Select a customer to view addresses.</div>
            ) : listQuery.isError ? (
              <div className="cust-empty" style={{ color: 'hsl(var(--destructive))' }}>
                {listError?.message || 'Unable to load addresses.'}
              </div>
            ) : listQuery.isLoading ? (
              <div className="cust-empty">Loading addresses...</div>
            ) : locations.length === 0 ? (
              <div className="cust-empty">No addresses found.</div>
            ) : (
              locations.map((loc, idx) => {
                const coordFromField = extractFirstCoordinate(loc.location);
                const lat = Number.isFinite(loc.latitude) ? Number(loc.latitude) : undefined;
                const lng = Number.isFinite(loc.longitude) ? Number(loc.longitude) : undefined;
                const resolvedLat = lat ?? coordFromField?.[0];
                const resolvedLng = lng ?? coordFromField?.[1];
                const hasCoords =
                  Number.isFinite(resolvedLat) && Number.isFinite(resolvedLng);
                const rowKey = loc.name || `${loc.location_name || 'loc'}-${idx}`;
                return (
                <div key={rowKey} className="cust-row">
                  <div>
                    <div className="cust-name">{loc.location_name || loc.name}</div>
                    <div className="cust-meta">ID: {loc.name}</div>
                    {loc.address_id && (
                      <div className="cust-meta">Address ID: {loc.address_id}</div>
                    )}
                    {loc.address_type && (
                      <div className="cust-meta">Type: {loc.address_type}</div>
                    )}
                  </div>
                  <div>
                    <div className="cust-meta">Address</div>
                    <div className="cust-name" style={{ fontSize: 13 }}>
                      {summarizeLocation(loc.location)}
                    </div>
                    <div className="cust-inline-actions">
                      {hasCoords && (
                        <button type="button" className="cust-map-btn" onClick={() => openMapFor([resolvedLat!, resolvedLng!], loc.location_name || loc.name)}>
                          View Map
                        </button>
                      )}
                    </div>
                  </div>
                  <div>
                    <div className="cust-meta">Search Tag</div>
                    <div className="cust-name cust-meta-wrap" style={{ fontSize: 13 }}>
                      {loc.custom_search || '--'}
                    </div>
                  </div>
                  <div />
                </div>
              );
            })
            )}
          </div>
          <div className="cust-pagination">
            <span>
              Showing {loadedCount} addresses
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                Prev
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="rounded-lg"
                onClick={() => setPage((p) => p + 1)}
                disabled={!hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="cust-dialog-content bg-card text-foreground border border-border shadow-2xl [&>button]:hidden">
          <DialogHeader className="cust-dialog-header">
            <DialogTitle>Add Address</DialogTitle>
            <DialogDescription>Create a customer address record.</DialogDescription>
          </DialogHeader>
          <div className="cust-dialog-body">
            <div className="cust-form-grid">
            <div className="cust-form-field cust-form-span-2">
              <Label>Customer</Label>
              <div className="cust-dropdown-wrap">
                  <Input
                    className="cust-form-input"
                    ref={customerInputRef}
                    id="customer-input"
                    autoComplete="off"
                    value={customerInput}
                    onChange={(e) => {
                      const nextValue = e.target.value ?? '';
                      setCustomerInput(nextValue);
                      setCustomerSearch(nextValue);
                      setShowCustomerDropdown(true);
                      setSelectedCustomerName(nextValue);
                      if (!nextValue.trim()) {
                        setSelectedCustomerId('');
                        setSelectedCustomerName('');
                      } else if (
                        selectedCustomerId &&
                        nextValue.trim() !== selectedCustomerName &&
                        nextValue.trim() !== selectedCustomerId
                      ) {
                        setSelectedCustomerId('');
                      }
                    }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  onBlur={() => {
                    setTimeout(() => setShowCustomerDropdown(false), 150);
                  }}
                  placeholder="Type customer name or ID"
                />
                {showCustomerDropdown && (customerQuery.data?.items?.length || 0) > 0 && (
                  <div className="cust-dropdown-list">
                    {(customerQuery.data?.items ?? []).map((customer, idx) => (
                      <div
                        key={customer.name || `${customer.customer_name || 'customer'}-${idx}`}
                        className="cust-dropdown-item"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          const selectedId = customer.name || '';
                          const selectedLabel = customer.customer_name || customer.name || '';
                          setCustomerInput(selectedLabel || selectedId);
                          setCustomerSearch(selectedLabel || selectedId);
                          setSelectedCustomerId(selectedId);
                          setSelectedCustomerName(selectedLabel);
                          setAutoLocationName(true);
                          setShowCustomerDropdown(false);
                        }}
                      >
                        <span className="cust-dropdown-title">
                          {customer.customer_name || customer.name}
                        </span>
                        <span className="cust-dropdown-sub">ID: {customer.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <span className="cust-field-hint">
                Start typing (min 2 chars) and select the customer from the suggestions.
              </span>
            </div>
            <div className="cust-form-field cust-form-span-2">
              <Label>Location Name</Label>
              <Input
                className="cust-form-input"
                value={form.location_name || ''}
                autoComplete="off"
                readOnly
                placeholder="Customer Address Name"
              />
            </div>
            <div className="cust-form-field cust-form-span-2">
              {showAddressField && (
                <>
                  <Label>Address</Label>
                  <textarea
                    id="address-input"
                    ref={addressInputRef as unknown as React.RefObject<HTMLTextAreaElement>}
                    autoComplete="off"
                    value={locationInput}
                    readOnly
                    onChange={(e) => {
                      setLocationInput(e.target.value);
                      handleFormChange('location', e.target.value);
                    }}
                    placeholder="Full address"
                    rows={4}
                    className="cust-textarea"
                  />
                  {isLikelyJson(form.location) && !locationInput && (
                    <span className="text-xs text-muted-foreground">Map coordinates saved.</span>
                  )}
                </>
              )}
            </div>
            {showGeoFields && (
              <div className="cust-form-split cust-form-span-2">
                <div className="cust-form-field">
                  <Label>Address Type</Label>
                  <div className="cust-dropdown-wrap" ref={addressTypeRef}>
                    <button
                      type="button"
                      className="cust-select-btn"
                      onClick={() => setAddressTypeOpen((prev) => !prev)}
                    >
                      <span>{addressForm.address_type || 'Shipping'}</span>
                      <span aria-hidden="true">▾</span>
                    </button>
                    {addressTypeOpen && (
                      <div className="cust-type-menu" role="listbox">
                        {ADDRESS_TYPE_OPTIONS.map((option) => (
                          <button
                            key={option}
                            type="button"
                            className="cust-type-item"
                            onClick={() => {
                              setAddressForm((prev) => ({ ...prev, address_type: option }));
                              setAddressTypeOpen(false);
                            }}
                          >
                            <span>{option}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="cust-form-field">
                  <Label>City</Label>
                  <Input
                    className="cust-form-input"
                    value={addressForm.city}
                    readOnly
                    placeholder="City"
                  />
                </div>
              </div>
            )}
            {showGeoFields && (
              <div className="cust-form-field cust-form-span-2">
                <Label>Country</Label>
                <Input
                  className="cust-form-input"
                  value={addressForm.country}
                  readOnly
                  placeholder="Country"
                />
              </div>
            )}
            <div className="cust-form-field cust-form-span-2">
              <Label>Email</Label>
              <Input
                className="cust-form-input"
                value={addressForm.email_id}
                onChange={(e) => setAddressForm((prev) => ({ ...prev, email_id: e.target.value }))}
                placeholder="email@example.com"
              />
            </div>
            <div className="cust-form-field cust-form-span-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-lg"
                onClick={handleUseCurrentLocation}
                disabled={geoFillLoading}
              >
                {geoFillLoading ? 'Getting location…' : 'Use Current Location'}
              </Button>
            </div>
          </div>
            <DialogFooter className="cust-dialog-actions">
              <Button
                variant="outline"
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg"
              >
                Cancel
              </Button>
              <Button
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending}
                className="cust-save-btn rounded-lg"
              >
                {createMutation.isPending ? 'Saving...' : 'Save Address'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      

      <Dialog open={isMapOpen} onOpenChange={setIsMapOpen}>
        <DialogContent className="cust-map-dialog w-[94vw] max-w-lg bg-card text-foreground border border-border rounded-2xl shadow-2xl">
          <DialogHeader>
            <DialogTitle>Location Map</DialogTitle>
            <DialogDescription>{mapLabel}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {mapCoords ? (
              <MapContainer center={mapCoords} zoom={16} scrollWheelZoom={false} className="w-full">
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <Marker position={mapCoords} icon={locationMarkerIcon}>
                  <Popup>{mapLabel}</Popup>
                </Marker>
                {Number.isFinite(Number(form.area)) && Number(form.area) > 0 && (
                  <Circle
                    center={mapCoords}
                    radius={Math.sqrt(Number(form.area) / Math.PI)}
                    pathOptions={{ color: '#2563eb', fillColor: '#60a5fa', fillOpacity: 0.25 }}
                  />
                )}
              </MapContainer>
            ) : (
              <div className="cust-empty">No coordinates available.</div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMapOpen(false)} className="rounded-lg">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DeliveryCustomersPage;









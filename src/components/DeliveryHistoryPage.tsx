import React, { useEffect, useState } from 'react';
import { CheckCircle, Package } from 'lucide-react';
import { erpRequest, extractErrorMessage } from '@/lib/erpApi';

type DeliveryLog = {
  name: string;
  delivery_trip?: string;
  date_and_time?: string;
  unloading_time?: string;
  completed_time?: string;
  total_time_of_completion?: string;
  status?: string;
  driver?: string;
  vehicle?: string;
  customer?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
};

type TripStop = {
  name: string;
  customer?: string;
  address?: string;
  customer_address?: string;
  visited?: number | boolean;
  estimated_arrival?: string;
  status?: string;
};

type CompletedTrip = {
  name: string;
  company?: string;
  custom_location?: string;
  driver?: string;
  driver_name?: string;
  total_distance?: number;
  vehicle?: string;
  departure_time?: string;
  employee?: string;
  modified?: string;
};

type DeliveryHistoryPageProps = {
  employeeId?: string;
  driverId?: string;
};

const formatDateTime = (value?: string) => {
  if (!value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const DeliveryHistoryPage: React.FC<DeliveryHistoryPageProps> = ({ employeeId, driverId }) => {
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<DeliveryLog[]>([]);
  const [completedTrips, setCompletedTrips] = useState<CompletedTrip[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<{
    resolvedDriver?: string | null;
    resolvedTrip?: string | null;
    stopsCount?: number;
    completedStops?: number;
  }>({});

  useEffect(() => {
    let alive = true;
    const loadHistory = async () => {
      setLoading(true);
      setError(null);
      try {
        let resolvedDriver = driverId || null;
        let resolvedTripName: string | null = null;
        let deliveryStops: TripStop[] = [];
        if (!resolvedDriver && employeeId) {
          const tripRes = await erpRequest(
            '/api/method/route_optimizer.api.delivery_trip.get_delivery_trip_by_employee',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: { employee: employeeId },
            }
          );
          const tripPayload = tripRes.data?.message ?? tripRes.data;
          if (!tripRes.ok || tripPayload?.success === false) {
            throw new Error(extractErrorMessage(tripPayload, 'Unable to load delivery trip'));
          }
          const header = tripPayload?.header || {};
          if (header?.driver) {
            resolvedDriver = header.driver;
          }
          if (header?.name) {
            resolvedTripName = header.name;
          }
          deliveryStops = Array.isArray(tripPayload?.delivery_stops) ? tripPayload.delivery_stops : [];
        }

        const res = await erpRequest(
          '/api/method/route_optimizer.api.delivery_monitoring.get_completed_delivery_logs',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: {
              driver: resolvedDriver,
              delivery_trip: resolvedTripName,
              employee: employeeId || null,
            },
          }
        );
        const payload = res.data?.message ?? res.data;
        if (!res.ok || payload?.success === false) {
          throw new Error(extractErrorMessage(payload, 'Unable to load delivery history'));
        }
        const rows = Array.isArray(payload?.logs) ? payload.logs : [];
        const completedStopsCount = deliveryStops.filter((stop) => {
          if (!stop) return false;
          if (stop.status && String(stop.status).toLowerCase() === 'completed') return true;
          return stop.visited === true || stop.visited === 1;
        }).length;

        if (alive) {
          setDebugInfo({
            resolvedDriver,
            resolvedTrip: resolvedTripName,
            stopsCount: deliveryStops.length,
            completedStops: completedStopsCount,
          });
        }
        if (rows.length > 0) {
          if (alive) {
            setLogs(rows);
            setCompletedTrips([]);
          }
          return;
        }

        if (deliveryStops.length > 0) {
          const completedStops = deliveryStops.filter((stop) => {
            if (!stop) return false;
            if (stop.status && String(stop.status).toLowerCase() === 'completed') return true;
            return stop.visited === true || stop.visited === 1;
          });
          const fallbackLogs: DeliveryLog[] = completedStops.map((stop) => ({
            name: stop.name,
            customer: stop.customer,
            address: stop.customer_address || stop.address,
            date_and_time: stop.estimated_arrival,
            status: 'Completed',
            delivery_trip: resolvedTripName || undefined,
          }));
          if (alive) {
            setLogs(fallbackLogs);
            setCompletedTrips([]);
          }
          return;
        }

        if (employeeId) {
          const tripsRes = await erpRequest(
            '/api/method/route_optimizer.api.delivery_trip.get_completed_delivery_trips_by_employee',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: { employee: employeeId },
            }
          );
          const tripsPayload = tripsRes.data?.message ?? tripsRes.data;
          if (!tripsRes.ok || tripsPayload?.success === false) {
            throw new Error(extractErrorMessage(tripsPayload, 'Unable to load completed trips'));
          }
          const trips = Array.isArray(tripsPayload?.trips) ? tripsPayload.trips : [];
          if (alive) {
            setLogs(rows);
            setCompletedTrips(trips);
          }
          return;
        }

        if (alive) {
          setLogs(rows);
          setCompletedTrips([]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unable to load delivery history';
        if (alive) setError(msg);
      } finally {
        if (alive) setLoading(false);
      }
    };

    loadHistory();
    return () => {
      alive = false;
    };
  }, [driverId, employeeId]);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-6 h-6 text-green-600" />
          <div>
            <h2 className="text-xl font-bold text-slate-800">Completed Deliveries</h2>
            <p className="text-slate-500 text-sm">History of completed delivery logs</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Package className="w-5 h-5 text-slate-400" />
            <h3 className="font-semibold text-slate-800">Completed Logs</h3>
          </div>
          <span className="text-sm text-slate-500">
            {loading ? '--' : logs.length ? logs.length : completedTrips.length} total
          </span>
        </div>
        {error ? (
          <div className="px-6 py-10 text-center text-red-600 text-sm">{error}</div>
        ) : loading ? (
          <div className="px-6 py-10 text-center text-slate-500 text-sm">Loading history...</div>
        ) : logs.length === 0 && completedTrips.length === 0 ? (
          <div className="px-6 py-10 text-center text-slate-500 text-sm">
            No completed deliveries yet.
            <div className="mt-4 text-xs text-slate-400 space-y-1">
              <div>Driver: {debugInfo.resolvedDriver || '--'}</div>
              <div>Trip: {debugInfo.resolvedTrip || '--'}</div>
              <div>Stops: {debugInfo.stopsCount ?? '--'}</div>
              <div>Completed Stops: {debugInfo.completedStops ?? '--'}</div>
            </div>
          </div>
        ) : logs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {logs.map((log) => (
              <div key={log.name} className="px-6 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 text-sm font-semibold">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{log.customer || 'Customer'}</p>
                  <p className="text-sm text-slate-500">{log.address || '--'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Trip: {log.delivery_trip || '--'} Â· Vehicle: {log.vehicle || '--'}
                  </p>
                  {log.total_time_of_completion && (
                    <p className="text-xs text-slate-400 mt-1">
                      Duration: {log.total_time_of_completion}
                    </p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">Completed</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(log.completed_time || log.unloading_time || log.date_and_time)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {completedTrips.map((trip) => (
              <div key={trip.name} className="px-6 py-4 flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center text-green-700 text-sm font-semibold">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium text-slate-800">{trip.name}</p>
                  <p className="text-sm text-slate-500">{trip.company || '--'}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    Vehicle: {trip.vehicle || '--'} Â· Driver: {trip.driver_name || trip.driver || '--'}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold text-green-700">Completed</p>
                  <p className="text-xs text-slate-400">
                    {formatDateTime(trip.departure_time || trip.modified)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default DeliveryHistoryPage;


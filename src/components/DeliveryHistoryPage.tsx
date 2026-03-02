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
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Sora:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap');

        .delivery-root {
          font-family: 'Sora', sans-serif;
          background: hsl(var(--background));
          min-height: 100vh;
          padding: 0;
          color: hsl(var(--foreground));
          position: relative;
          overflow-x: hidden;
        }

        .delivery-root::before {
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

        .delivery-root::after {
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

        .delivery-content { position: relative; z-index: 1; max-width: 960px; margin: 0 auto; }

        .delivery-hero {
          background: linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--secondary)) 100%);
          border: 1px solid hsl(var(--primary) / 0.2);
          border-radius: 20px;
          padding: 24px;
          display: flex;
          align-items: center;
          gap: 16px;
          position: relative;
          overflow: hidden;
          margin-bottom: 16px;
          opacity: 0;
          transform: translateY(16px);
          animation: deliveryFadeUp 0.5s ease forwards;
        }

        .delivery-hero::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0;
          height: 1px;
          background: linear-gradient(90deg, transparent, hsl(var(--primary) / 0.5), transparent);
        }

        .delivery-icon {
          width: 46px;
          height: 46px;
          border-radius: 12px;
          background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary) / 0.8));
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 3px hsl(var(--primary) / 0.25);
          flex-shrink: 0;
        }

        .delivery-title { font-size: 20px; font-weight: 700; color: hsl(var(--foreground)); }
        .delivery-sub { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .delivery-card {
          background: hsl(var(--card));
          border: 1px solid hsl(var(--border));
          border-radius: 16px;
          overflow: hidden;
          opacity: 0;
          transform: translateY(14px);
          animation: deliveryFadeUp 0.5s ease 0.1s forwards;
        }

        @keyframes deliveryFadeUp {
          to { opacity: 1; transform: translateY(0); }
        }

        .delivery-header {
          padding: 16px 20px;
          border-bottom: 1px solid hsl(var(--border));
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .delivery-header-title {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 14px;
          font-weight: 600;
          color: hsl(var(--foreground));
        }

        .delivery-count { font-size: 12px; color: hsl(var(--muted-foreground)); }

        .delivery-row {
          padding: 16px 20px;
          display: flex;
          align-items: flex-start;
          gap: 14px;
          border-bottom: 1px solid hsl(var(--border) / 0.6);
        }
        .delivery-row:last-child { border-bottom: none; }

        .delivery-badge {
          width: 38px;
          height: 38px;
          border-radius: 10px;
          background: hsl(var(--primary) / 0.12);
          border: 1px solid hsl(var(--primary) / 0.25);
          display: flex;
          align-items: center;
          justify-content: center;
          color: hsl(var(--primary));
          flex-shrink: 0;
        }

        .delivery-name { font-size: 14px; font-weight: 600; color: hsl(var(--foreground)); }
        .delivery-text { font-size: 12px; color: hsl(var(--muted-foreground)); margin-top: 2px; }
        .delivery-meta { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .delivery-right { margin-left: auto; text-align: right; }
        .delivery-status { font-size: 12px; font-weight: 600; color: hsl(var(--primary)); }
        .delivery-time { font-size: 11px; color: hsl(var(--muted-foreground)); margin-top: 4px; }

        .delivery-empty {
          padding: 40px 20px;
          text-align: center;
          color: hsl(var(--muted-foreground));
          font-size: 12px;
        }
        .delivery-debug { margin-top: 12px; font-size: 11px; color: hsl(var(--muted-foreground)); }
      `}</style>

      <div className="delivery-root">
        <div className="delivery-content">
          <div className="delivery-hero">
            <div className="delivery-icon">
              <CheckCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="delivery-title">Completed Deliveries</div>
              <div className="delivery-sub">History of completed delivery logs</div>
            </div>
          </div>

          <div className="delivery-card">
            <div className="delivery-header">
              <div className="delivery-header-title">
                <Package className="w-4 h-4 text-muted-foreground" />
                Completed Logs
              </div>
              <span className="delivery-count">
                {loading ? '--' : logs.length ? logs.length : completedTrips.length} total
              </span>
            </div>

            {error ? (
              <div className="delivery-empty" style={{ color: 'hsl(var(--destructive))' }}>{error}</div>
            ) : loading ? (
              <div className="delivery-empty">Loading history...</div>
            ) : logs.length === 0 && completedTrips.length === 0 ? (
              <div className="delivery-empty">
                No completed deliveries yet.
                <div className="delivery-debug">
                  <div>Driver: {debugInfo.resolvedDriver || '--'}</div>
                  <div>Trip: {debugInfo.resolvedTrip || '--'}</div>
                  <div>Stops: {debugInfo.stopsCount ?? '--'}</div>
                  <div>Completed Stops: {debugInfo.completedStops ?? '--'}</div>
                </div>
              </div>
            ) : logs.length > 0 ? (
              <div>
                {logs.map((log) => (
                  <div key={log.name} className="delivery-row">
                    <div className="delivery-badge">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="delivery-name">{log.customer || 'Customer'}</div>
                      <div className="delivery-text">{log.address || '--'}</div>
                      <div className="delivery-meta">
                        Trip: {log.delivery_trip || '--'} - Vehicle: {log.vehicle || '--'}
                      </div>
                      {log.total_time_of_completion && (
                        <div className="delivery-meta">Duration: {log.total_time_of_completion}</div>
                      )}
                    </div>
                    <div className="delivery-right">
                      <div className="delivery-status">Completed</div>
                      <div className="delivery-time">
                        {formatDateTime(log.completed_time || log.unloading_time || log.date_and_time)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div>
                {completedTrips.map((trip) => (
                  <div key={trip.name} className="delivery-row">
                    <div className="delivery-badge">
                      <CheckCircle className="w-4 h-4" />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div className="delivery-name">{trip.name}</div>
                      <div className="delivery-text">{trip.company || '--'}</div>
                      <div className="delivery-meta">
                        Vehicle: {trip.vehicle || '--'} - Driver: {trip.driver_name || trip.driver || '--'}
                      </div>
                    </div>
                    <div className="delivery-right">
                      <div className="delivery-status">Completed</div>
                      <div className="delivery-time">
                        {formatDateTime(trip.departure_time || trip.modified)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default DeliveryHistoryPage;


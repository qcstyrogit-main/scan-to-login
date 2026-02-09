import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";
import { erpRequest } from "@/lib/erpApi";

type LocationUsage = "login" | "checkin";

const usageLabel = (usage: LocationUsage) =>
  usage === "login" ? "login" : "check in";

const ensureLocationPermission = async (usage: LocationUsage) => {
  const platform = Capacitor.getPlatform();
  const isNative = platform === "android" || platform === "ios";

  if (isNative) {
    const current = await Geolocation.checkPermissions();
    const hasPermission =
      current.location === "granted" || (current as any).coarseLocation === "granted";

    if (hasPermission) return;

    const requested = await Geolocation.requestPermissions();
    const granted =
      requested.location === "granted" || (requested as any).coarseLocation === "granted";

    if (!granted) {
      throw new Error(
        `Location permission is required to ${usageLabel(
          usage
        )}. Please enable location in app settings.`
      );
    }
    return;
  }

  if (typeof navigator !== "undefined" && "permissions" in navigator) {
    try {
      const permission = await navigator.permissions.query({ name: "geolocation" });
      if (permission.state === "denied") {
        throw new Error(
          `Location permission is blocked in your browser. Please enable it to ${usageLabel(
            usage
          )}.`
        );
      }
    } catch {
      // Browser may not support permissions query.
    }
  }
};

export const getCurrentLocation = async (
  usage: LocationUsage = "checkin"
): Promise<{ latitude: number; longitude: number }> => {
  await ensureLocationPermission(usage);

  const platform = Capacitor.getPlatform();
  const isNative = platform === "android" || platform === "ios";

  if (isNative) {
    const position = await Geolocation.getCurrentPosition({
      enableHighAccuracy: true,
      timeout: 10000,
    });
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }

  if (!navigator.geolocation) {
    throw new Error("Geolocation not supported");
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 10000,
    });
  });

  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
  };
};

const fallbackCoordsLabel = (latitude: number, longitude: number) =>
  `Lat ${latitude.toFixed(6)}, Lng ${longitude.toFixed(6)}`;

export const getAddressFromCoordinates = async (
  latitude: number,
  longitude: number
): Promise<string> => {
  try {
    const res = await erpRequest("/api/method/qcmc_logic.api.login_scan.reverse_geocode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        latitude,
        longitude,
        zoom: 18,
      },
    });

    const payload = res.data?.message ?? res.data ?? {};
    if (!res.ok || payload?.success === false) {
      return "";
    }

    const data = payload;

    const displayName =
      typeof data?.display_name === "string" ? data.display_name.trim() : "";
    if (displayName) {
      return displayName;
    }

    const address = data?.address || {};
    const parts = [
      data?.name,
      address?.building,
      address?.house_number && address?.road
        ? `${address.house_number} ${address.road}`
        : address?.road,
      address?.neighbourhood,
      address?.suburb,
      address?.city || address?.town || address?.village,
      address?.state,
      address?.postcode,
      address?.country,
    ].filter(Boolean);

    if (parts.length > 0) {
      return parts.join(", ");
    }
  } catch {
    // Reverse geocoding is best-effort only.
  }

  return "";
};

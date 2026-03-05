import type { Checkin, Employee } from "@/types";
import { erpRequest, extractErrorMessage, setErpSid } from "@/lib/erpApi";

const mapErpCheckType = (value: unknown): Checkin["check_type"] => {
  const text = String(value || "")
    .trim()
    .toLowerCase();

  if (!text) return "out";
  if (text === "in" || text === "check in") return "in";
  if (text === "out" || text === "check out") return "out";
  if (text.includes("break") && (text.includes("start") || text.includes("out"))) {
    return "break_start";
  }
  if (text.includes("break") && (text.includes("end") || text.includes("in"))) {
    return "break_end";
  }
  return "out";
};

const toNumber = (value: unknown) => {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
};

const asRecord = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object") return {};
  return value as Record<string, unknown>;
};

const readString = (value: unknown): string | undefined =>
  typeof value === "string" ? value : undefined;

export const buildEmployeeFromErp = (
  user: unknown,
  loginEmail: string,
  context: Record<string, unknown> = {}
): Employee => {
  const userObj = asRecord(user);
  const source = { ...context, ...userObj };
  const fallbackId = typeof user === "string" ? user : undefined;
  const fallbackEmail = typeof user === "string" && user.includes("@") ? user : undefined;
  const userId =
    readString(source.name) ||
    readString(source.user) ||
    readString(source.email) ||
    fallbackId ||
    loginEmail;
  const userEmail = readString(source.email) || fallbackEmail || loginEmail;
  const employeeId =
    readString(source.employee) || readString(source.employee_id) || readString(source.employeeId);
  const baseName = typeof user === "string" ? user.split("@")[0] : undefined;
  const fullName =
    readString(source.full_name) ||
    readString(source.fullName) ||
    baseName ||
    loginEmail.split("@")[0] ||
    "Employee";
  const department = readString(source.department) || readString(source.dept) || "General";
  const company = readString(source.company) || "-";
  const customLocation = readString(source.custom_location) || "-";
  const designation = readString(source.designation) || "-";
  const isAdmin = userId === "Administrator" || readString(source.user_type) === "System User";

  return {
    id: userId,
    employee_id: employeeId,
    email: userEmail,
    full_name: fullName,
    department,
    company,
    custom_location: customLocation,
    designation,
    role: isAdmin ? "admin" : "employee",
  };
};

export const erpLogin = async (loginEmail: string, loginPassword: string): Promise<Employee> => {
  const loginRes = await erpRequest("/api/method/qcmc_logic.api.login_scan.login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: { username: loginEmail, password: loginPassword },
  });

  const loginData = loginRes.data;
  const payload = loginData?.message ?? loginData;
  if (!loginRes.ok) {
    throw new Error(extractErrorMessage(payload, `Login failed (HTTP ${loginRes.status})`));
  }
  if (!payload?.success) {
    throw new Error(extractErrorMessage(payload, "Invalid credentials or empty ERP response"));
  }
  await setErpSid(payload?.sid || loginData?.sid || "");

  const userSource = payload?.user || loginData?.user || loginEmail;
  const emp = buildEmployeeFromErp(userSource, loginEmail, { ...loginData, ...payload });
  const fullName = loginData?.full_name || payload?.full_name;
  if (fullName) {
    emp.full_name = fullName;
  }
  return emp;
};

export const fetchCheckins = async (employee?: Employee | null): Promise<Checkin[]> => {
  const res = await erpRequest("/api/method/qcmc_logic.api.login_scan.get_checkin_history", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: {},
  });

  const raw = res.data?.message ?? res.data;
  const list = Array.isArray(raw)
    ? raw
    : Array.isArray(raw?.data)
    ? raw.data
    : Array.isArray(raw?.checkins)
    ? raw.checkins
    : [];

  const normalized: Checkin[] = list.map((entry: unknown, idx: number) => {
    const item = asRecord(entry);
    return {
      id: readString(item.name) || readString(item.id) || `CHK-HIST-${idx}`,
      employee_id:
        readString(item.employee) || readString(item.employee_id) || employee?.id || "",
      check_type: mapErpCheckType(item.log_type || item.check_type || item.type),
      timestamp:
        readString(item.time) ||
        readString(item.timestamp) ||
        readString(item.creation) ||
        new Date().toISOString(),
      location:
        readString(item.custom_location_name) ||
        readString(item.location_name) ||
        readString(item.custom_location) ||
        readString(item.location) ||
        readString(item.branch) ||
        undefined,
      scan_code: readString(item.scan_code) || readString(item.name) || undefined,
      custom_activities: readString(item.custom_activities),
      latitude: toNumber(item.latitude ?? item.lat),
      longitude: toNumber(item.longitude ?? item.lng),
    };
  });

  return normalized.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );
};

export const createEmployeeCheckin = async (params: {
  employee: Employee;
  checkType: Checkin["check_type"];
  latitude: number;
  longitude: number;
  deviceId: string;
  customCustomer?: string;
  customActivities?: string;
}): Promise<Checkin> => {
  const { employee, checkType, latitude, longitude, deviceId, customCustomer, customActivities } = params;
  const logType = checkType === "out" || checkType === "break_start" ? "OUT" : "IN";

  const res = await erpRequest(
    "/api/method/qcmc_logic.api.login_scan.create_employee_checkin",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        log_type: logType,
        latitude,
        longitude,
        device_id: deviceId,
        custom_customer: customCustomer || undefined,
        custom_activities: customActivities || undefined,
        data: {
          custom_customer: customCustomer || undefined,
          custom_activities: customActivities || undefined,
        },
      },
    }
  );

  const data = res.data;
  const payload = data?.message ?? data;
  if (!res.ok) {
    throw new Error(extractErrorMessage(payload, `Check-in failed (HTTP ${res.status})`));
  }
  if (!payload?.success) {
    throw new Error(extractErrorMessage(payload, "Check-in failed or empty ERP response"));
  }

  return {
    id: payload?.checkin || `CHK-${Date.now()}`,
    employee_id: payload?.employee || employee.id,
    check_type: checkType,
    timestamp: payload?.time || new Date().toISOString(),
    location:
      payload?.custom_location_name ||
      payload?.location_name ||
      payload?.custom_location ||
      payload?.location ||
      payload?.branch ||
      undefined,
    scan_code: `SCAN-${Date.now()}`,
    latitude,
    longitude,
  };
};

export const validateCheckinRadius = async (params: {
  latitude: number;
  longitude: number;
  allowedRadiusMeters?: number;
}) => {
  const { latitude, longitude, allowedRadiusMeters = 50 } = params;
  const res = await erpRequest(
    "/api/method/qcmc_logic.api.login_scan.validate_checkin_radius",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        latitude,
        longitude,
        allowed_radius_meters: allowedRadiusMeters,
      },
    }
  );

  const data = res.data?.message ?? res.data;
  const rawAllowed = data?.allowed;
  const allowed =
    rawAllowed === true ||
    rawAllowed === "true" ||
    rawAllowed === 1 ||
    rawAllowed === "1";
  const distance = Number(data?.distance_meters);

  return {
    allowed,
    distanceMeters: Number.isFinite(distance) ? distance : undefined,
    message: allowed ? "Inside allowed area" : extractErrorMessage(data, "Outside allowed area"),
  };
};

export const updateCheckinActivities = async (
  checkinId: string,
  activities?: string
): Promise<{ success: boolean; message: string }> => {
  const res = await erpRequest(
    "/api/method/qcmc_logic.api.login_scan.update_checkin_activities",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: {
        checkin_id: checkinId,
        custom_activities: activities,
      },
    }
  );

  const data = res.data?.message ?? res.data;
  const success = data?.success === true;

  if (!success) {
    throw new Error(extractErrorMessage(data, "Failed to update activities"));
  }

  return {
    success: true,
    message: data?.message || "Activities updated successfully",
  };
};

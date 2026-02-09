import { Capacitor, CapacitorHttp } from "@capacitor/core";

const DEFAULT_ERP_BASE_URL = "https://erp.qcstyro.com"; // "http://qc-styro.local:8000"; //
const ERP_SID_KEY = "erp_sid";

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, "");

export const erpApiUrl = (endpoint: string) => {
  const normalizedEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;

  const configuredBase =
    import.meta.env.VITE_ERP_BASE_URL ||
    import.meta.env.VITE_ERP_TARGET ||
    DEFAULT_ERP_BASE_URL;

  const useProxy =
    import.meta.env.DEV || String(import.meta.env.VITE_ERP_USE_PROXY).toLowerCase() === "true";

  const base = configuredBase?.trim() || "";
  const isRelativeBase = base.startsWith("/");

  if (useProxy || isRelativeBase) {
    const proxyBase = trimTrailingSlash(base || "/erp");
    return `${proxyBase}${normalizedEndpoint}`;
  }

  return `${trimTrailingSlash(base)}${normalizedEndpoint}`;
};

export const parseJsonResponse = async (response: Response): Promise<any> => {
  const rawBody = await response.text();

  if (!rawBody.trim()) {
    return null;
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    const preview = rawBody.replace(/\s+/g, " ").trim().slice(0, 140);
    throw new Error(
      `Server returned non-JSON response (HTTP ${response.status})${preview ? `: ${preview}` : ""}`
    );
  }
};

type ErpRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: Record<string, any> | string | null;
};

type ErpRequestResult = {
  ok: boolean;
  status: number;
  data: any;
};

export const getErpSid = () => {
  try {
    return localStorage.getItem(ERP_SID_KEY) || "";
  } catch {
    return "";
  }
};

export const setErpSid = (sid?: string | null) => {
  try {
    if (sid && sid.trim()) {
      localStorage.setItem(ERP_SID_KEY, sid.trim());
      return;
    }
    localStorage.removeItem(ERP_SID_KEY);
  } catch {
    // Ignore storage errors on restricted contexts.
  }
};

const parsePossibleJson = (value: any) => {
  if (typeof value !== "string") {
    return value;
  }
  if (!value.trim()) {
    return null;
  }
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
};

export const erpRequest = async (
  endpoint: string,
  options: ErpRequestOptions = {}
): Promise<ErpRequestResult> => {
  const method = options.method ?? "GET";
  const headers = options.headers ?? { "Content-Type": "application/json" };
  const body = options.body ?? null;

  const platform = Capacitor.getPlatform();
  const isNative = platform === "android" || platform === "ios";
  const url = erpApiUrl(endpoint);

  if (isNative) {
    try {
      const sid = getErpSid();
      const nativeHeaders = { ...headers };
      if (sid && !nativeHeaders.Cookie) {
        nativeHeaders.Cookie = `sid=${sid}`;
      }

      const nativeResponse = await CapacitorHttp.request({
        url,
        method,
        headers: nativeHeaders,
        data: body,
      });
      return {
        ok: nativeResponse.status >= 200 && nativeResponse.status < 300,
        status: nativeResponse.status,
        data: parsePossibleJson(nativeResponse.data),
      };
    } catch {
      throw new Error(
        "Cannot reach ERP server from app. Check internet/SSL or ERP host availability."
      );
    }
  }

  try {
    const response = await fetch(url, {
      method,
      headers,
      credentials: "include",
      body: body == null ? undefined : typeof body === "string" ? body : JSON.stringify(body),
    });
    return {
      ok: response.ok,
      status: response.status,
      data: await parseJsonResponse(response),
    };
  } catch {
    throw new Error(
      "Network request failed. If this is a browser build, verify CORS and ERP URL."
    );
  }
};

export const extractErrorMessage = (data: any, fallback: string) => {
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  if (typeof data?.message === "string" && data.message.trim()) {
    return data.message;
  }
  if (typeof data?.exception === "string" && data.exception.trim()) {
    return data.exception;
  }
  if (typeof data?.exc === "string" && data.exc.trim()) {
    return data.exc;
  }
  if (typeof data?._server_messages === "string" && data._server_messages.trim()) {
    return data._server_messages;
  }
  return fallback;
};

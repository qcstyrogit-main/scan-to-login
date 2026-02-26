import { Capacitor, CapacitorHttp } from "@capacitor/core";
import { getErpSid, setErpSid } from "@/lib/erpSession";

const DEFAULT_ERP_BASE_URL = "https://erp.qcstyro.com"; // "http://qc-styro.local:8000"; //

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

export const parseJsonResponse = async (response: Response): Promise<unknown> => {
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
  body?: Record<string, unknown> | string | null;
};

type ErpRequestResult = {
  ok: boolean;
  status: number;
  data: unknown;
};

export { getErpSid, setErpSid };

const parsePossibleJson = (value: unknown): unknown => {
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
      const sid = await getErpSid();
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

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
};

export const extractErrorMessage = (data: unknown, fallback: string) => {
  if (typeof data === "string" && data.trim()) {
    return data;
  }
  const record = asRecord(data);
  const message = record && typeof record.message === "string" ? record.message : "";
  if (message.trim()) return message;

  const exception = record && typeof record.exception === "string" ? record.exception : "";
  if (exception.trim()) return exception;

  const exc = record && typeof record.exc === "string" ? record.exc : "";
  if (exc.trim()) return exc;

  const serverMessages =
    record && typeof record._server_messages === "string" ? record._server_messages : "";
  if (serverMessages.trim()) return serverMessages;

  return fallback;
};

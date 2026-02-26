import { Capacitor } from "@capacitor/core";
import { SecureStorage } from "@aparajita/capacitor-secure-storage";

const ERP_SID_KEY = "erp.sid";
const memoryStore = { sid: "" };

const getWebStorage = () => {
  return typeof sessionStorage !== "undefined" ? sessionStorage : null;
};

export const getErpSid = async (): Promise<string> => {
  if (memoryStore.sid) {
    return memoryStore.sid;
  }

  try {
    if (Capacitor.isNativePlatform()) {
      const value = await SecureStorage.get(ERP_SID_KEY);
      if (value) {
        memoryStore.sid = value;
      }
      return value || "";
    }

    const storage = getWebStorage();
    if (storage) {
      const value = storage.getItem(ERP_SID_KEY) || "";
      memoryStore.sid = value;
      return value;
    }
  } catch {
    // Ignore storage access errors.
  }

  return memoryStore.sid;
};

export const setErpSid = async (sid?: string | null): Promise<void> => {
  const cleaned = sid?.trim() || "";
  memoryStore.sid = cleaned;

  try {
    if (Capacitor.isNativePlatform()) {
      if (cleaned) {
        await SecureStorage.set(ERP_SID_KEY, cleaned);
      } else {
        await SecureStorage.remove(ERP_SID_KEY);
      }
      return;
    }

    const storage = getWebStorage();
    if (storage) {
      if (cleaned) {
        storage.setItem(ERP_SID_KEY, cleaned);
      } else {
        storage.removeItem(ERP_SID_KEY);
      }
    }
  } catch {
    // Ignore storage errors on restricted contexts.
  }
};

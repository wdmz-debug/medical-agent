const API_BASE = "";

async function fetchJSON(url: string, options?: RequestInit) {
  const ownController = !options?.signal;
  const controller = ownController ? new AbortController() : null;
  const signal = options?.signal ?? controller?.signal;
  const timeout = ownController ? setTimeout(() => controller?.abort(), 15000) : null;

  try {
    const res = await fetch(`${API_BASE}${url}`, {
      headers: { "Content-Type": "application/json", ...options?.headers },
      ...options,
      signal,
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`API Error ${res.status}: ${err}`);
    }
    return res.json();
  } catch (e: any) {
    if (e.name === "AbortError") {
      throw new Error("请求超时，请检查后端服务是否运行在 localhost:8000");
    }
    throw e;
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

// Devices
export const getDevices = () => fetchJSON("/api/devices");
export const getDevice = (id: number, signal?: AbortSignal) =>
  fetchJSON(`/api/devices/${id}`, signal ? { signal } : undefined);

// Logs
export const createLog = (deviceId: number, data: any) =>
  fetchJSON(`/api/devices/${deviceId}/logs`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getLogs = (deviceId: number, limit = 100) =>
  fetchJSON(`/api/devices/${deviceId}/logs?limit=${limit}`);

// Documents
export const uploadDocument = async (deviceId: number, formData: FormData) => {
  const res = await fetch(`/api/devices/${deviceId}/documents`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
  return res.json();
};

export const getDocuments = (deviceId: number) =>
  fetchJSON(`/api/devices/${deviceId}/documents`);

// Analysis
export const analyzeDevice = (deviceId: number, humanFeedback?: string) =>
  fetchJSON(`/api/devices/${deviceId}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(humanFeedback ? { human_feedback: humanFeedback } : {}),
  });

// Work Orders
export const createWorkOrder = (deviceId: number, data: any) =>
  fetchJSON(`/api/devices/${deviceId}/work-orders`, {
    method: "POST",
    body: JSON.stringify(data),
  });

export const getWorkOrders = (deviceId: number) =>
  fetchJSON(`/api/devices/${deviceId}/work-orders`);

// Chat
export const sendChatMessage = (
  deviceId: number,
  message: string,
  history: { role: string; content: string }[],
) =>
  fetchJSON(`/api/devices/${deviceId}/chat`, {
    method: "POST",
    body: JSON.stringify({ message, history }),
  });

type ApiClientOptions = {
  method?: "GET" | "POST" | "DELETE" | "PUT" | "PATCH";
  body?: unknown;
};

export async function apiClient<T>(url: string, options: ApiClientOptions = {}) {
  const res = await fetch(url, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json"
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = String(payload?.message || payload?.error || "Falha na requisicao.");
    const error = new Error(message) as Error & { status?: number; payload?: unknown };
    error.status = res.status;
    error.payload = payload;
    throw error;
  }

  return payload as T;
}

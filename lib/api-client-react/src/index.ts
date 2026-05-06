export * from "./generated/api";
export * from "./generated/api.schemas";
export {
  setBaseUrl,
  setAuthTokenGetter,
  customFetch as customFetchRaw,
} from "./custom-fetch";
export type { AuthTokenGetter } from "./custom-fetch";
import { customFetch as _customFetch } from "./custom-fetch";

type ObjFetchOptions<D = unknown> = {
  url: string;
  method?: string;
  headers?: Record<string, string>;
  data?: D;
};

export function customFetch<T = unknown>(opts: ObjFetchOptions): Promise<T> {
  const { url, method = "GET", headers, data } = opts;
  const body = data !== undefined ? JSON.stringify(data) : undefined;
  return _customFetch<T>(url, {
    method,
    headers: { "Content-Type": "application/json", ...(headers ?? {}) },
    body,
  });
}

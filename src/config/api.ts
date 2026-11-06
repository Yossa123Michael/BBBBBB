function resolveApiBase(): string {
  const rawEnv = import.meta.env.VITE_API_BASE_URL?.trim();
  if (rawEnv) {
    const clean = rawEnv.replace(/\/+$/, '');
    return clean.endsWith('/api/v1') ? clean : `${clean}/api/v1`;
  }
  return `http://${window.location.hostname}:5000/api/v1`;
}

export const API_BASE = resolveApiBase();

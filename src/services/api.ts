import axios, { type AxiosInstance } from 'axios';

export function resolveLciApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:8080';
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    return `${window.location.protocol}//lci-lola.${rootDomain}`;
  }
  return import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';
}

export function resolveRunwayApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:8083';
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    return `${window.location.protocol}//runway-lola.${rootDomain}`;
  }
  return import.meta.env.VITE_RUNWAY_BASE_URL || 'http://localhost:8083';
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: resolveLciApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request interceptor: attach bearer token if available in storage and update baseURL dynamically
apiClient.interceptors.request.use(
  (config) => {
    config.baseURL = resolveLciApiBase();
    const token = localStorage.getItem('lola_token');
    if (token) {
      if (!config.headers) {
        config.headers = {} as any;
      }
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export function handleUnauthorized(source = 'api'): void {
  console.warn(`[Auth] 401 Unauthorized encountered from ${source}. Clearing session and redirecting to login.`);
  localStorage.removeItem('lola_token');
  localStorage.removeItem('lola_operator');
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('lola-auth-unauthorized', { detail: { source } }));
    if (!window.location.pathname.startsWith('/login')) {
      const currentPath = window.location.pathname + window.location.search;
      sessionStorage.setItem('lola_redirect_after_login', currentPath);
      window.location.href = '/login?reason=session_expired';
    }
  }
}

// Response interceptor: handle unauthenticated or common errors
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      handleUnauthorized('lci');
    }
    return Promise.reject(error);
  }
);

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface OperatorIdentity {
  id?: string;
  username: string;
  permissions?: string[];
  role?: string;
  status?: string;
}

export interface OperatorItem {
  id: string;
  username: string;
  role: string;
  permissions: string[];
  status: 'ACTIVE' | 'DISABLED';
  createdAt: string;
}

export interface LoginResponseData {
  token: string;
  operator: OperatorIdentity;
  sessionId?: string;
}

export interface ApiResponseEnvelope<T> {
  data: T;
  request_id: string;
  timestamp: string;
}

export interface OperatorSession {
  id: string;
  deviceType: string;
  browser: string;
  operatingSystem: string;
  ipAddress: string;
  createdAt: string;
  lastActiveAt: string;
  expiresAt: string;
  current: boolean;
}

export const authService = {
  login: async (credentials: LoginCredentials): Promise<LoginResponseData> => {
    const response = await apiClient.post<ApiResponseEnvelope<LoginResponseData> | LoginResponseData>(
      '/api/v1/auth/login',
      credentials
    );

    // Unpack standard LolaCloud ApiResponse envelope { data: { token, operator, sessionId }, request_id, timestamp }
    const resData = response.data;
    let payload: LoginResponseData;

    if (resData && typeof resData === 'object' && 'data' in resData && (resData as ApiResponseEnvelope<LoginResponseData>).data?.token) {
      payload = (resData as ApiResponseEnvelope<LoginResponseData>).data;
    } else {
      payload = resData as LoginResponseData;
    }

    if (payload && payload.token) {
      localStorage.setItem('lola_token', payload.token);
      if (payload.operator) {
        localStorage.setItem('lola_operator', JSON.stringify(payload.operator));
      }
    }
    return payload;
  },

  logout: async (): Promise<void> => {
    const token = localStorage.getItem('lola_token');
    if (token) {
      try {
        await apiClient.post('/api/v1/auth/logout');
      } catch (error) {
        // Client logout always proceeds even if network fails or backend is unreachable
        console.warn('Backend logout request failed, proceeding with client cleanup', error);
      }
    }
    localStorage.removeItem('lola_token');
    localStorage.removeItem('lola_operator');
  },

  getCurrentOperator: (): OperatorIdentity | null => {
    const stored = localStorage.getItem('lola_operator');
    if (!stored) return null;
    try {
      return JSON.parse(stored) as OperatorIdentity;
    } catch {
      return null;
    }
  },

  isAuthenticated: (): boolean => {
    return Boolean(localStorage.getItem('lola_token'));
  },

  getAccessToken: (): string | null => {
    return localStorage.getItem('lola_token');
  },
};

export const sessionService = {
  getSessions: async (): Promise<OperatorSession[]> => {
    const response = await apiClient.get<ApiResponseEnvelope<OperatorSession[]> | { data: OperatorSession[] } | OperatorSession[]>(
      '/api/v1/sessions'
    );
    const resData = response.data;
    let list: OperatorSession[] = [];
    if (resData && typeof resData === 'object' && 'data' in resData && Array.isArray((resData as { data: unknown }).data)) {
      list = (resData as { data: OperatorSession[] }).data;
    } else if (Array.isArray(resData)) {
      list = resData;
    }
    return list.map((s) => {
      const raw = s as unknown as { current?: boolean; isCurrent?: boolean };
      return {
        ...s,
        current: raw.current ?? raw.isCurrent ?? false,
      };
    });
  },

  revokeSession: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/v1/sessions/${id}`);
  },
};

const OPERATORS_STORAGE_KEY = 'lola_custom_operators';

export const operatorService = {
  getOperators: async (): Promise<OperatorItem[]> => {
    try {
      const response = await apiClient.get<ApiResponseEnvelope<OperatorItem[]> | { data: OperatorItem[] } | OperatorItem[]>(
        '/api/v1/operators'
      );
      const resData = response.data;
      let list: OperatorItem[] = [];
      if (resData && typeof resData === 'object' && 'data' in resData && Array.isArray((resData as { data: unknown }).data)) {
        list = (resData as { data: OperatorItem[] }).data;
      } else if (Array.isArray(resData)) {
        list = resData;
      }
      if (list && list.length > 0) {
        return list;
      }
    } catch (error) {
      console.warn('Backend getOperators request failed, falling back to local store:', error);
    }

    const stored = localStorage.getItem(OPERATORS_STORAGE_KEY);
    const localList: OperatorItem[] = stored ? JSON.parse(stored) : [];

    const currentOp = authService.getCurrentOperator();
    const hasCurrent = localList.some((o) => o.username === (currentOp?.username || 'root'));
    if (!hasCurrent) {
      const rootItem: OperatorItem = {
        id: currentOp?.id || '90f815ae-d8fb-481d-ac71-cc764b23abcd',
        username: currentOp?.username || 'root',
        role: currentOp?.username === 'root' || !currentOp ? 'Super Administrator' : 'Operator',
        permissions: currentOp?.permissions || ['*::*::*'],
        status: 'ACTIVE',
        createdAt: '2026-09-20T03:00:00Z',
      };
      localList.unshift(rootItem);
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(localList));
    }
    return localList;
  },

  createOperator: async (data: { username: string; password: string; permissions: string[] }): Promise<OperatorItem> => {
    try {
      const response = await apiClient.post<ApiResponseEnvelope<OperatorItem> | { data: OperatorItem } | OperatorItem>(
        '/api/v1/operators',
        data
      );
      const resData = response.data;
      let created: OperatorItem | null = null;
      if (resData && typeof resData === 'object' && 'data' in resData && (resData as { data: OperatorItem }).data) {
        created = (resData as { data: OperatorItem }).data;
      } else if (resData && typeof resData === 'object' && 'username' in resData) {
        created = resData as OperatorItem;
      }
      if (created) {
        const stored = localStorage.getItem(OPERATORS_STORAGE_KEY);
        const list: OperatorItem[] = stored ? JSON.parse(stored) : [];
        list.push(created);
        localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(list));
        return created;
      }
    } catch (error) {
      console.warn('Backend createOperator request failed, falling back to local store:', error);
    }

    const isSuper = data.permissions.includes('*::*::*');
    const newOperator: OperatorItem = {
      id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `op-${Date.now()}`,
      username: data.username,
      role: isSuper ? 'Super Administrator' : 'Custom Operator',
      permissions: data.permissions,
      status: 'ACTIVE',
      createdAt: new Date().toISOString(),
    };

    const stored = localStorage.getItem(OPERATORS_STORAGE_KEY);
    const list: OperatorItem[] = stored ? JSON.parse(stored) : [];
    list.push(newOperator);
    localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(list));

    return newOperator;
  },

  getOperator: async (id: string): Promise<OperatorItem> => {
    try {
      const response = await apiClient.get<ApiResponseEnvelope<OperatorItem> | { data: OperatorItem } | OperatorItem>(
        `/api/v1/operators/${id}`
      );
      const resData = response.data;
      let item: OperatorItem | null = null;
      if (resData && typeof resData === 'object' && 'data' in resData && (resData as { data: OperatorItem }).data) {
        item = (resData as { data: OperatorItem }).data;
      } else if (resData && typeof resData === 'object' && 'username' in resData) {
        item = resData as OperatorItem;
      }
      if (item) {
        return item;
      }
    } catch (error) {
      console.warn(`Backend getOperator request failed for ${id}, checking local store:`, error);
    }

    const list = await operatorService.getOperators();
    const found = list.find((o) => o.id === id || o.username === id);
    if (found) {
      return found;
    }
    throw new Error(`Operator not found: ${id}`);
  },

  updateOperator: async (
    id: string,
    data: { password?: string; permissions: string[]; status?: string }
  ): Promise<OperatorItem> => {
    try {
      const response = await apiClient.put<ApiResponseEnvelope<OperatorItem> | { data: OperatorItem } | OperatorItem>(
        `/api/v1/operators/${id}`,
        data
      );
      const resData = response.data;
      let updated: OperatorItem | null = null;
      if (resData && typeof resData === 'object' && 'data' in resData && (resData as { data: OperatorItem }).data) {
        updated = (resData as { data: OperatorItem }).data;
      } else if (resData && typeof resData === 'object' && 'username' in resData) {
        updated = resData as OperatorItem;
      }
      if (updated) {
        const stored = localStorage.getItem(OPERATORS_STORAGE_KEY);
        const list: OperatorItem[] = stored ? JSON.parse(stored) : [];
        const idx = list.findIndex((o) => o.id === id || o.username === updated!.username);
        if (idx !== -1) {
          list[idx] = updated;
          localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(list));
        }
        const currentOp = authService.getCurrentOperator();
        if (currentOp && (currentOp.id === id || currentOp.username === updated.username)) {
          currentOp.permissions = updated.permissions;
          currentOp.role = updated.role;
          currentOp.status = updated.status;
          localStorage.setItem('lola_operator', JSON.stringify(currentOp));
        }
        return updated;
      }
    } catch (error) {
      console.warn(`Backend updateOperator request failed for ${id}, falling back to local store:`, error);
    }

    const list = await operatorService.getOperators();
    const idx = list.findIndex((o) => o.id === id || o.username === id);
    if (idx === -1) {
      throw new Error(`Operator with id ${id} not found`);
    }

    const existing = list[idx];
    let nextStatus: 'ACTIVE' | 'DISABLED' = existing.status;
    if (data.status) {
      nextStatus = data.status.toUpperCase() === 'ACTIVE' ? 'ACTIVE' : 'DISABLED';
    }

    const isSuper = data.permissions.includes('*::*::*');
    const updated: OperatorItem = {
      ...existing,
      role: isSuper ? 'Super Administrator' : existing.username === 'root' ? 'Super Administrator' : 'Custom Operator',
      permissions: data.permissions,
      status: nextStatus,
    };

    list[idx] = updated;
    localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(list));

    const currentOp = authService.getCurrentOperator();
    if (currentOp && (currentOp.id === id || currentOp.username === updated.username)) {
      currentOp.permissions = updated.permissions;
      currentOp.role = updated.role;
      currentOp.status = updated.status;
      localStorage.setItem('lola_operator', JSON.stringify(currentOp));
    }

    return updated;
  },

  deleteOperator: async (id: string): Promise<void> => {
    try {
      await apiClient.delete(`/api/v1/operators/${id}`);
    } catch (error) {
      console.warn('Backend deleteOperator request failed, falling back to local store:', error);
    }

    const stored = localStorage.getItem(OPERATORS_STORAGE_KEY);
    if (stored) {
      const list: OperatorItem[] = JSON.parse(stored);
      const updated = list.filter((o) => o.id !== id);
      localStorage.setItem(OPERATORS_STORAGE_KEY, JSON.stringify(updated));
    }
  },
};

export default apiClient;

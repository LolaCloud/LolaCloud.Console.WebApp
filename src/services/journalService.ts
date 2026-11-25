import axios, { type AxiosInstance } from 'axios';
import { authService, handleUnauthorized, type ApiResponseEnvelope } from './api';

export interface LogGroup {
  id: string;
  name: string;
  description?: string;
  retentionDays: number;
  streamsCount?: number;
  eventsCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface LogStream {
  id: string;
  groupId: string;
  name: string;
  sourceType: string;
  sourceTarget?: string;
  lastEventTimestamp?: string;
  createdAt: string;
}

export interface LogEvent {
  id: string;
  streamId: string;
  timestamp: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG';
  message: string;
  attributes?: Record<string, any>;
}

export interface MetricDataPoint {
  timestamp: string;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  memoryUsedBytes?: number;
  memoryLimitBytes?: number;
  memoryPercent?: number;
  diskUsedMb: number;
  diskUsedBytes?: number;
  activeConnections: number;
  status: string;
}

export interface LiveContainerStats {
  containerName: string;
  name?: string;
  cpuPercent: number;
  memoryUsedMb: number;
  memoryLimitMb: number;
  memoryUsedBytes?: number;
  memoryLimitBytes?: number;
  memoryPercent: number;
  netIo: string;
  netIO?: string;
  blockIo: string;
  blockIO?: string;
  status: string;
}

export interface JournalStatusResponse {
  status: string;
  service: string;
  version: string;
  totalLogGroups: number;
  totalStreams: number;
  totalEventsToday: number;
  dockerConnected: boolean;
}

export function resolveJournalApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:8087';
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    return `${window.location.protocol}//journal-lola.${rootDomain}`;
  }
  return import.meta.env.VITE_JOURNAL_API_BASE_URL || 'http://localhost:8087';
}

export const journalApiClient: AxiosInstance = axios.create({
  baseURL: resolveJournalApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

journalApiClient.interceptors.request.use((config) => {
  config.baseURL = resolveJournalApiBase();
  const token = authService.getAccessToken ? authService.getAccessToken() : localStorage.getItem('lola_token');
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

journalApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[JournalService] 401 Unauthorized received from Journal backend');
      handleUnauthorized('journal');
    }
    return Promise.reject(error);
  }
);

function unpack<T>(resData: ApiResponseEnvelope<T> | T | { data: T }): T {
  if (resData && typeof resData === 'object' && 'data' in resData) {
    return (resData as { data: T }).data;
  }
  return resData as T;
}

// Fallback seed store in-memory for demo / offline operation
const SEED_GROUPS: LogGroup[] = [
  {
    id: 'grp-relate',
    name: '/aws/relate/instances',
    description: 'PostgreSQL and MySQL database instance engine logs & queries',
    retentionDays: 14,
    streamsCount: 3,
    eventsCount: 4280,
    createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp-runway',
    name: '/aws/runway/edge',
    description: 'Cloudflare Zero Trust tunnels and ingress proxy audit logs',
    retentionDays: 30,
    streamsCount: 2,
    eventsCount: 9812,
    createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp-store',
    name: '/aws/store/minio',
    description: 'MinIO S3 object storage PUT/GET telemetry and bucket operations',
    retentionDays: 7,
    streamsCount: 2,
    eventsCount: 3140,
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp-lci',
    name: '/aws/lci/identity',
    description: 'Lola Core Identity auth, JWT token issuance and RBAC access evaluations',
    retentionDays: 90,
    streamsCount: 2,
    eventsCount: 1542,
    createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'grp-containers',
    name: '/docker/containers',
    description: 'Direct stdout/stderr container logs from Docker daemon socket',
    retentionDays: 3,
    streamsCount: 4,
    eventsCount: 18240,
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

let localLogGroups: LogGroup[] = [...SEED_GROUPS];

const SEED_STREAMS: Record<string, LogStream[]> = {
  '/aws/relate/instances': [
    {
      id: 'stm-traefik',
      groupId: 'grp-relate',
      name: 'lola-traefik',
      sourceType: 'docker',
      sourceTarget: 'lola-traefik',
      lastEventTimestamp: new Date(Date.now() - 12000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 7).toISOString(),
    },
    {
      id: 'stm-prod-pg',
      groupId: 'grp-relate',
      name: 'lola-relate-db-production-pg',
      sourceType: 'docker',
      sourceTarget: 'lola-relate-db-production-pg',
      lastEventTimestamp: new Date(Date.now() - 45000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  '/aws/runway/edge': [
    {
      id: 'stm-runway-tunnel',
      groupId: 'grp-runway',
      name: 'lola-runway-tunnel-kali',
      sourceType: 'tunnel',
      sourceTarget: 'cloudflared',
      lastEventTimestamp: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 14).toISOString(),
    },
    {
      id: 'stm-runway-dns',
      groupId: 'grp-runway',
      name: 'lola-runway-dns-sync',
      sourceType: 'service',
      sourceTarget: 'runway-service',
      lastEventTimestamp: new Date(Date.now() - 180000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 10).toISOString(),
    },
  ],
  '/aws/store/minio': [
    {
      id: 'stm-store-minio',
      groupId: 'grp-store',
      name: 'lola-store-minio',
      sourceType: 'docker',
      sourceTarget: 'lola-store-minio',
      lastEventTimestamp: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
    {
      id: 'stm-store-api',
      groupId: 'grp-store',
      name: 'store-backend-8086',
      sourceType: 'service',
      sourceTarget: 'store',
      lastEventTimestamp: new Date(Date.now() - 60000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    },
  ],
  '/aws/lci/identity': [
    {
      id: 'stm-lci-auth',
      groupId: 'grp-lci',
      name: 'lci-backend-8080',
      sourceType: 'service',
      sourceTarget: 'lci',
      lastEventTimestamp: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
    {
      id: 'stm-lci-db',
      groupId: 'grp-lci',
      name: 'lola-lci-postgres',
      sourceType: 'docker',
      sourceTarget: 'lola-lci-postgres',
      lastEventTimestamp: new Date(Date.now() - 250000).toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 20).toISOString(),
    },
  ],
  '/docker/containers': [
    {
      id: 'stm-dock-traefik',
      groupId: 'grp-containers',
      name: 'lola-traefik',
      sourceType: 'docker',
      sourceTarget: 'lola-traefik',
      lastEventTimestamp: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'stm-dock-minio',
      groupId: 'grp-containers',
      name: 'lola-store-minio',
      sourceType: 'docker',
      sourceTarget: 'lola-store-minio',
      lastEventTimestamp: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
    {
      id: 'stm-dock-lci',
      groupId: 'grp-containers',
      name: 'lola-lci-postgres',
      sourceType: 'docker',
      sourceTarget: 'lola-lci-postgres',
      lastEventTimestamp: new Date().toISOString(),
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    },
  ],
};

function generateMockEvents(streamName: string, count = 30): LogEvent[] {
  const events: LogEvent[] = [];
  const now = Date.now();
  const levels: Array<'INFO' | 'WARN' | 'ERROR' | 'DEBUG'> = ['INFO', 'INFO', 'INFO', 'WARN', 'INFO', 'ERROR', 'DEBUG'];

  const sampleMessages: Record<string, string[]> = {
    'lola-traefik': [
      'INFO[0001] Configuration loaded from flags and dynamic file provider',
      'INFO[0002] Starting provider *docker.Provider',
      'INFO[0002] Starting provider *file.Provider',
      'INFO[0005] Adding dynamic TCP router with TLS SNI termination=passthrough',
      'INFO[0012] TCP connection established from 127.0.0.1:54210 to backend :5432',
      'WARN[0025] TLS handshake client did not provide server_name SNI, fallback to default handler',
      'INFO[0031] Ingress rule matched: host `s3-lola.lola-cloud.dev` -> HTTP http://lola-store-minio:9000',
    ],
    'lola-store-minio': [
      'API: SYSTEM()',
      'Time: 17:12:00 UTC 09/21/2026',
      '127.0.0.1 - lola_admin [21/Sep/2026:17:12:00 +0000] "HEAD /lola-relate-backups HTTP/1.1" 200 0 "-" "aws-sdk-nodejs/3.x"',
      '127.0.0.1 - lola_admin [21/Sep/2026:17:12:05 +0000] "PUT /lola-relate-backups/instances/inst-01/backup.sql.gz HTTP/1.1" 200 4892100 "-" "aws-sdk-nodejs/3.x"',
      'Bucket `lola-relate-backups` access policy evaluated: ALLOW (Role: lola-relate-service)',
    ],
  };

  const defaultTemplates = [
    'Worker thread pool initialized with 8 active runners',
    'Heartbeat ping dispatched to orchestrator daemon: 200 OK (latency 1.4ms)',
    'Cached session validation successful for operator ID: op-root',
    'Resource quota check passed: RAM allocated 342MB / 2048MB (16.7%)',
    'Flushed telemetry data batch: 45 metrics points ingested to TimescaleDB',
    'WARN: High memory watermark reached 75% on container cgroup',
    'DEBUG: Garbage collection cycle completed in 1.12ms',
  ];

  const templates = sampleMessages[streamName] || defaultTemplates;

  for (let i = 0; i < count; i++) {
    const timestamp = new Date(now - (count - i) * 15000).toISOString();
    const level = levels[i % levels.length];
    const msg = templates[i % templates.length];
    events.push({
      id: `evt-${streamName}-${i}-${now}`,
      streamId: streamName,
      timestamp,
      level,
      message: msg,
      attributes: {
        container: streamName,
        pid: 1000 + (i % 20),
        thread: `worker-${i % 4}`,
      },
    });
  }

  return events;
}

export const journalService = {
  getLogGroups: async (): Promise<LogGroup[]> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<LogGroup[]> | LogGroup[]>('/api/v1/journal/groups');
      const data = unpack(res.data);
      if (Array.isArray(data) && data.length > 0) {
        localLogGroups = data;
        return data;
      }
    } catch (err) {
      console.warn('[JournalService] getLogGroups falling back to local dataset:', err);
    }
    return localLogGroups;
  },

  getLogGroup: async (name: string): Promise<LogGroup> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<LogGroup> | LogGroup>(
        `/api/v1/journal/groups/${encodeURIComponent(name)}`
      );
      return unpack(res.data);
    } catch (err) {
      console.warn(`[JournalService] getLogGroup(${name}) falling back to local lookup:`, err);
      const found = localLogGroups.find((g) => g.name === name || g.id === name);
      if (found) return found;
      return {
        id: `grp-${name.replace(/[^a-zA-Z0-9]/g, '-')}`,
        name,
        description: 'Auto-created log group',
        retentionDays: 14,
        streamsCount: 1,
        eventsCount: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },

  createLogGroup: async (data: { name: string; description?: string; retentionDays?: number }): Promise<LogGroup> => {
    try {
      const res = await journalApiClient.post<ApiResponseEnvelope<LogGroup> | LogGroup>('/api/v1/journal/groups', data);
      const created = unpack(res.data);
      if (created) {
        localLogGroups = [created, ...localLogGroups.filter((g) => g.name !== created.name)];
        return created;
      }
    } catch (err) {
      console.warn('[JournalService] createLogGroup falling back to local creation:', err);
    }

    const newGroup: LogGroup = {
      id: `grp-${Date.now()}`,
      name: data.name,
      description: data.description || '',
      retentionDays: data.retentionDays || 14,
      streamsCount: 0,
      eventsCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    localLogGroups = [newGroup, ...localLogGroups.filter((g) => g.name !== newGroup.name)];
    return newGroup;
  },

  deleteLogGroup: async (name: string): Promise<void> => {
    try {
      await journalApiClient.delete(`/api/v1/journal/groups/${encodeURIComponent(name)}`);
    } catch (err) {
      console.warn(`[JournalService] deleteLogGroup(${name}) falling back to local delete:`, err);
    }
    localLogGroups = localLogGroups.filter((g) => g.name !== name && g.id !== name);
  },

  getLogStreams: async (groupName: string): Promise<LogStream[]> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<LogStream[]> | LogStream[]>(
        `/api/v1/journal/groups/${encodeURIComponent(groupName)}/streams`
      );
      const data = unpack(res.data);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {
      console.warn(`[JournalService] getLogStreams(${groupName}) falling back to local dataset:`, err);
    }

    if (SEED_STREAMS[groupName]) {
      return SEED_STREAMS[groupName];
    }
    // Fallback if matched by name or default
    return [
      {
        id: `stm-${encodeURIComponent(groupName)}-default`,
        groupId: groupName,
        name: `${groupName.replace(/^\//, '').replace(/\//g, '-')}-stdout`,
        sourceType: 'docker',
        sourceTarget: groupName,
        lastEventTimestamp: new Date().toISOString(),
        createdAt: new Date(Date.now() - 86400000).toISOString(),
      },
    ];
  },

  getLogEvents: async (
    groupName: string,
    streamName: string,
    params?: { query?: string; level?: string; limit?: number }
  ): Promise<LogEvent[]> => {
    try {
      const q = new URLSearchParams();
      if (params?.query) q.set('query', params.query);
      if (params?.level) q.set('level', params.level);
      if (params?.limit) q.set('limit', String(params.limit));

      const res = await journalApiClient.get<ApiResponseEnvelope<LogEvent[]> | LogEvent[]>(
        `/api/v1/journal/groups/${encodeURIComponent(groupName)}/streams/${encodeURIComponent(streamName)}/events?${q.toString()}`
      );
      const data = unpack(res.data);
      if (Array.isArray(data) && data.length > 0) return data;
    } catch (err) {
      console.warn(`[JournalService] getLogEvents(${groupName}/${streamName}) falling back to mock:`, err);
    }

    let events = generateMockEvents(streamName, params?.limit || 40);
    if (params?.level && params.level !== 'ALL') {
      events = events.filter((e) => e.level.toUpperCase() === params.level?.toUpperCase());
    }
    if (params?.query) {
      const term = params.query.toLowerCase();
      events = events.filter((e) => e.message.toLowerCase().includes(term));
    }
    return events;
  },

  getInstanceMetrics: async (instanceName: string, range = '1h'): Promise<MetricDataPoint[]> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<any[]> | any[]>(
        `/api/v1/journal/metrics/instance/${encodeURIComponent(instanceName)}?range=${encodeURIComponent(range)}`
      );
      const data = unpack(res.data);
      if (Array.isArray(data) && data.length > 0) {
        return data.map((pt: any) => {
          const memUsedMb = pt.memoryUsedMb !== undefined && !isNaN(Number(pt.memoryUsedMb))
            ? Number(pt.memoryUsedMb)
            : pt.memoryUsedBytes !== undefined && !isNaN(Number(pt.memoryUsedBytes))
            ? Math.round((Number(pt.memoryUsedBytes) / (1024 * 1024)) * 100) / 100
            : 0;

          const memLimitMb = pt.memoryLimitMb !== undefined && !isNaN(Number(pt.memoryLimitMb))
            ? Number(pt.memoryLimitMb)
            : pt.memoryLimitBytes !== undefined && !isNaN(Number(pt.memoryLimitBytes))
            ? Math.round((Number(pt.memoryLimitBytes) / (1024 * 1024)) * 100) / 100
            : 2048;

          const diskMb = pt.diskUsedMb !== undefined && !isNaN(Number(pt.diskUsedMb))
            ? Number(pt.diskUsedMb)
            : pt.diskUsedBytes !== undefined && !isNaN(Number(pt.diskUsedBytes))
            ? Math.round((Number(pt.diskUsedBytes) / (1024 * 1024)) * 100) / 100
            : 0;

          return {
            timestamp: pt.timestamp,
            cpuPercent: pt.cpuPercent ?? 0,
            memoryUsedMb: memUsedMb,
            memoryLimitMb: memLimitMb,
            memoryUsedBytes: pt.memoryUsedBytes,
            memoryLimitBytes: pt.memoryLimitBytes,
            memoryPercent: pt.memoryPercent ?? 0,
            diskUsedMb: diskMb,
            diskUsedBytes: pt.diskUsedBytes,
            activeConnections: pt.activeConnections ?? 0,
            status: pt.status || 'HEALTHY',
          };
        });
      }
    } catch (err) {
      console.warn(`[JournalService] getInstanceMetrics(${instanceName}, ${range}) falling back to mock:`, err);
    }

    // Generate realistic time-series points based on range
    let pointsCount = 20;
    let intervalMs = 3 * 60 * 1000; // 3 min per point
    if (range === '6h') {
      pointsCount = 30;
      intervalMs = 12 * 60 * 1000;
    } else if (range === '24h') {
      pointsCount = 36;
      intervalMs = 40 * 60 * 1000;
    } else if (range === '7d') {
      pointsCount = 42;
      intervalMs = 4 * 3600 * 1000;
    }

    const now = Date.now();
    const result: MetricDataPoint[] = [];

    for (let i = pointsCount - 1; i >= 0; i--) {
      const pointTime = new Date(now - i * intervalMs).toISOString();
      const wave = Math.sin(i / 3) * 8;
      const noise = (Math.random() - 0.5) * 4;
      const cpu = Math.max(1.2, Math.min(85, parseFloat((12 + wave + noise).toFixed(2))));
      const memMb = Math.round(310 + wave * 6 + noise * 5);
      const diskMb = Math.round(2450 + (pointsCount - i) * 8);
      const conns = Math.max(2, Math.round(6 + (wave > 0 ? wave * 0.8 : 0) + noise * 0.5));

      result.push({
        timestamp: pointTime,
        cpuPercent: cpu,
        memoryUsedMb: memMb,
        memoryLimitMb: 2048,
        diskUsedMb: diskMb,
        activeConnections: conns,
        status: 'HEALTHY',
      });
    }

    return result;
  },

  getLiveContainerStats: async (containerName: string): Promise<LiveContainerStats> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<any> | any>(
        `/api/v1/journal/metrics/live/${encodeURIComponent(containerName)}`
      );
      const data = unpack(res.data);
      if (data && typeof data.cpuPercent === 'number') {
        const memUsedMb = data.memoryUsedMb !== undefined && !isNaN(Number(data.memoryUsedMb))
          ? Number(data.memoryUsedMb)
          : data.memoryUsedBytes !== undefined && !isNaN(Number(data.memoryUsedBytes))
          ? Math.round((Number(data.memoryUsedBytes) / (1024 * 1024)) * 100) / 100
          : 0;

        const memLimitMb = data.memoryLimitMb !== undefined && !isNaN(Number(data.memoryLimitMb))
          ? Number(data.memoryLimitMb)
          : data.memoryLimitBytes !== undefined && !isNaN(Number(data.memoryLimitBytes))
          ? Math.round((Number(data.memoryLimitBytes) / (1024 * 1024)) * 100) / 100
          : 2048;

        const memPct = data.memoryPercent !== undefined && !isNaN(Number(data.memoryPercent))
          ? Number(data.memoryPercent)
          : memLimitMb > 0
          ? parseFloat(((memUsedMb / memLimitMb) * 100).toFixed(2))
          : 0;

        return {
          containerName: data.containerName || data.name || containerName,
          cpuPercent: data.cpuPercent,
          memoryUsedMb: memUsedMb,
          memoryLimitMb: memLimitMb,
          memoryUsedBytes: data.memoryUsedBytes,
          memoryLimitBytes: data.memoryLimitBytes,
          memoryPercent: memPct,
          netIo: data.netIo || data.netIO || '0B / 0B',
          blockIo: data.blockIo || data.blockIO || '0B / 0B',
          status: data.status || 'RUNNING',
        };
      }
    } catch (err) {
      console.warn(`[JournalService] getLiveContainerStats(${containerName}) falling back to mock:`, err);
    }

    const cpu = parseFloat((4.2 + Math.random() * 8.5).toFixed(2));
    const memMb = Math.round(280 + Math.random() * 95);
    const limitMb = 2048;
    const memPct = parseFloat(((memMb / limitMb) * 100).toFixed(2));

    return {
      containerName,
      cpuPercent: cpu,
      memoryUsedMb: memMb,
      memoryLimitMb: limitMb,
      memoryPercent: memPct,
      netIo: '12.4MB / 8.2MB',
      blockIo: '4.8MB / 18.2MB',
      status: 'RUNNING',
    };
  },

  getFleetMetricsSummary: async (): Promise<LiveContainerStats[]> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<any> | any>(
        '/api/v1/journal/metrics/fleet'
      );
      const data = unpack(res.data);
      const list = Array.isArray(data) ? data : data?.containers;
      if (Array.isArray(list) && list.length > 0) {
        return list.map((c: any) => {
          const memUsedMb = c.memoryUsedMb !== undefined && !isNaN(Number(c.memoryUsedMb))
            ? Number(c.memoryUsedMb)
            : c.memoryUsedBytes !== undefined && !isNaN(Number(c.memoryUsedBytes))
            ? Math.round((Number(c.memoryUsedBytes) / (1024 * 1024)) * 100) / 100
            : 0;

          const memLimitMb = c.memoryLimitMb !== undefined && !isNaN(Number(c.memoryLimitMb))
            ? Number(c.memoryLimitMb)
            : c.memoryLimitBytes !== undefined && !isNaN(Number(c.memoryLimitBytes))
            ? Math.round((Number(c.memoryLimitBytes) / (1024 * 1024)) * 100) / 100
            : 2048;

          return {
            containerName: c.containerName || c.name,
            cpuPercent: c.cpuPercent ?? 0,
            memoryUsedMb: memUsedMb,
            memoryLimitMb: memLimitMb,
            memoryUsedBytes: c.memoryUsedBytes,
            memoryLimitBytes: c.memoryLimitBytes,
            memoryPercent: c.memoryPercent ?? 0,
            netIo: c.netIo || c.netIO || '0B / 0B',
            blockIo: c.blockIo || c.blockIO || '0B / 0B',
            status: c.status || 'RUNNING',
          };
        });
      }
    } catch (err) {
      console.warn('[JournalService] getFleetMetricsSummary falling back to mock:', err);
    }

    const fleetContainers = [
      { name: 'lola-traefik', cpu: 1.4, mem: 68, limit: 1024, net: '145.2MB / 138.9MB', blk: '1.2MB / 0.4MB' },
      { name: 'lola-store-minio', cpu: 2.1, mem: 185, limit: 2048, net: '54.1MB / 98.4MB', blk: '64.8MB / 112.5MB' },
      { name: 'lola-lci-postgres', cpu: 0.9, mem: 124, limit: 1024, net: '6.2MB / 4.8MB', blk: '8.4MB / 2.1MB' },
      { name: 'lola-runway-daemon', cpu: 0.5, mem: 42, limit: 512, net: '32.1MB / 28.5MB', blk: '0.1MB / 0.1MB' },
    ];

    return fleetContainers.map((c) => ({
      containerName: c.name,
      cpuPercent: c.cpu,
      memoryUsedMb: c.mem,
      memoryLimitMb: c.limit,
      memoryPercent: parseFloat(((c.mem / c.limit) * 100).toFixed(2)),
      netIo: c.net,
      blockIo: c.blk,
      status: 'RUNNING',
    }));
  },

  getJournalStatus: async (): Promise<JournalStatusResponse> => {
    try {
      const res = await journalApiClient.get<ApiResponseEnvelope<JournalStatusResponse> | JournalStatusResponse>(
        '/api/v1/journal/status'
      );
      const data = unpack(res.data);
      if (data && typeof data.status === 'string') return data;
    } catch (err) {
      console.warn('[JournalService] getJournalStatus falling back to mock:', err);
    }

    const totalEvents = localLogGroups.reduce((sum, g) => sum + (g.eventsCount || 0), 0);
    const totalStreams = Object.values(SEED_STREAMS).reduce((sum, list) => sum + list.length, 0);

    return {
      status: 'ONLINE',
      service: 'lola-journal',
      version: '1.0.0',
      totalLogGroups: localLogGroups.length,
      totalStreams,
      totalEventsToday: totalEvents,
      dockerConnected: true,
    };
  },

  createLiveTailEventSource: (groupName: string, streamName: string, containerName?: string): EventSource => {
    const token = authService.getAccessToken ? authService.getAccessToken() : localStorage.getItem('lola_token') || '';
    const base = resolveJournalApiBase();
    const query = new URLSearchParams({
      group: groupName,
      stream: streamName,
    });
    if (containerName) {
      query.set('container', containerName);
    }
    if (token) {
      query.set('token', token);
    }
    return new EventSource(`${base}/api/v1/journal/tail?${query.toString()}`);
  },
};

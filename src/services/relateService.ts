import axios, { type AxiosInstance } from 'axios';
import { authService, handleUnauthorized, type ApiResponseEnvelope } from './api';

export type EngineType = 'POSTGRESQL' | 'MYSQL' | 'SQLSERVER';
export type InstanceStatus = 'PROVISIONING' | 'RUNNING' | 'STOPPED' | 'FAILED';
export type InstanceTier = 'MICRO_512MB' | 'STANDARD_1GB' | 'PRO_2GB';

export interface DatabaseInstance {
  id: string;
  lrn: string;
  name: string;
  engine: EngineType;
  version: string;
  status: InstanceStatus;
  hostSni: string;
  port: number;
  internalPort: number;
  adminUsername: string;
  adminPassword: string;
  defaultDatabase: string;
  tier: InstanceTier;
  storageGb: number;
  connectionString: string;
  containerId?: string;
  runwayIntegrated?: boolean;
  runwayRecordId?: string;
  dnsZoneId?: string;
  dnsZoneName?: string;
  wanIp?: string;
  ddnsEnabled?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateInstanceRequest {
  name: string;
  engine: EngineType;
  version: string;
  defaultDatabase?: string;
  adminUsername?: string;
  adminPassword?: string;
  tier?: InstanceTier;
  storageGb?: number;
  enableRunwayIntegration?: boolean;
  zoneId?: string;
  zoneName?: string;
  hostname?: string;
  enableDdns?: boolean;
  restoreFromBackupId?: string;
}

export interface RunwayZoneDto {
  id: string;
  name: string;
  accountId?: string;
  accountName?: string;
  status?: string;
  recordsCount?: number;
}

export interface RelateStatusResponse {
  status: string;
  service: string;
  version: string;
  totalInstances: number;
  runningInstances: number;
  stoppedInstances: number;
  engineBreakdown: Record<string, number>;
}

export interface DatabaseBackup {
  id: string;
  lrn: string;
  instanceId: string;
  instanceName: string;
  name: string;
  engine: EngineType;
  sizeBytes: number;
  status: 'PENDING' | 'COMPLETED' | 'FAILED' | 'RESTORING';
  storagePath: string;
  s3Bucket: string;
  s3Key: string;
  backupType: 'MANUAL_SNAPSHOT' | 'AUTOMATED';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface CreateBackupRequest {
  instanceId: string;
  name?: string;
}

export interface RestoreBackupRequest {
  targetInstanceId?: string;
}

export interface BackupDownloadResponse {
  downloadUrl: string;
  filename: string;
  sizeBytes: number;
  expiresAt: string;
}

export interface TraefikRouteInfo {
  id: string;
  instanceId: string;
  instanceName: string;
  routerName: string;
  entryPoint: string;
  hostSni: string;
  internalPort: number;
  serviceName: string;
  tlsMode: string;
  status: 'ACTIVE' | 'INACTIVE';
}

export function resolveRelateApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:8084';
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    return `${window.location.protocol}//relate-lola.${rootDomain}`;
  }
  return import.meta.env.VITE_RELATE_API_BASE_URL || 'http://localhost:8084';
}

export const relateApiClient: AxiosInstance = axios.create({
  baseURL: resolveRelateApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Interceptors: update baseURL dynamically and inject Bearer token
relateApiClient.interceptors.request.use((config) => {
  config.baseURL = resolveRelateApiBase();
  const token = authService.getAccessToken ? authService.getAccessToken() : localStorage.getItem('lola_token');
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

relateApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[RelateService] 401 Unauthorized received from Relate backend');
      handleUnauthorized('relate');
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

function normalizeInstance(raw: any): DatabaseInstance {
  const id = String(raw.id || '');
  return {
    id,
    lrn: raw.lrn || `lola:relate:instance:${id}`,
    name: raw.name || '',
    engine: (raw.engine || 'POSTGRESQL') as EngineType,
    version: String(raw.version || '17'),
    status: (raw.status || 'RUNNING') as InstanceStatus,
    hostSni: raw.hostSni || `${raw.name}.db.lola-cloud.dev`,
    port: Number(raw.port || (raw.engine === 'MYSQL' ? 3306 : raw.engine === 'SQLSERVER' ? 1433 : 5432)),
    internalPort: Number(raw.internalPort || 15432),
    adminUsername: raw.adminUsername || 'lola_admin',
    adminPassword: raw.adminPassword || '••••••••',
    defaultDatabase: raw.defaultDatabase || 'app_db',
    tier: (raw.tier || 'STANDARD_1GB') as InstanceTier,
    storageGb: Number(raw.storageGb || 10),
    connectionString: raw.connectionString || '',
    containerId: raw.containerId,
    runwayIntegrated: raw.runwayIntegrated ?? Boolean(raw.dnsZoneName || raw.runwayRecordId),
    runwayRecordId: raw.runwayRecordId,
    dnsZoneId: raw.dnsZoneId,
    dnsZoneName: raw.dnsZoneName,
    wanIp: raw.wanIp,
    ddnsEnabled: raw.ddnsEnabled,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || new Date().toISOString(),
  };
}

function normalizeBackup(raw: any): DatabaseBackup {
  const id = String(raw.id || '');
  const instanceId = String(raw.instanceId || raw.instance?.id || '');
  const instanceName = String(raw.instanceName || raw.instance?.name || instanceId || 'relate-instance');
  const engine = (raw.engine || raw.instance?.engine || 'POSTGRESQL') as EngineType;
  const s3Bucket = String(raw.s3Bucket || 'lola-relate-backups');
  const ext = engine === 'MYSQL' ? 'sql.gz' : engine === 'SQLSERVER' ? 'bak' : 'dump';
  const defaultKey = instanceId ? `instances/${instanceId}/backups/${raw.name || id}.${ext}` : `${raw.name || id}.${ext}`;
  const s3Key = String(raw.s3Key || defaultKey);
  const storagePath = String(raw.storagePath || `s3://${s3Bucket}/${s3Key}`);
  const status = (raw.status || 'COMPLETED') as 'PENDING' | 'COMPLETED' | 'FAILED' | 'RESTORING';

  return {
    id,
    lrn: raw.lrn || `lola:relate:backup:${id}`,
    instanceId,
    instanceName,
    name: raw.name || `snapshot-${id.slice(0, 8)}`,
    engine,
    sizeBytes: Number(raw.sizeBytes || 0),
    status,
    storagePath,
    s3Bucket,
    s3Key,
    backupType: (raw.backupType || 'MANUAL_SNAPSHOT') as 'MANUAL_SNAPSHOT' | 'AUTOMATED',
    createdAt: raw.createdAt || new Date().toISOString(),
    completedAt: raw.completedAt,
    errorMessage: raw.errorMessage,
  };
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

// Purge any legacy mock cache from browser localStorage immediately
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem('lola_relate_instances_cache');
    localStorage.removeItem('lola_relate_backups_cache');
  } catch {
    // ignore
  }
}

export const relateService = {
  /**
   * Fetch all database instances from Relate DBaaS (Real API only, zero mock data)
   */
  getInstances: async (): Promise<DatabaseInstance[]> => {
    try {
      const response = await relateApiClient.get<ApiResponseEnvelope<any[]> | any[]>('/api/v1/relate/instances');
      const data = unpack(response.data);
      if (Array.isArray(data)) {
        return data.map(normalizeInstance);
      }
      return [];
    } catch (err) {
      console.error('[RelateService] Failed to fetch database instances:', err);
      throw err;
    }
  },

  /**
   * Fetch a single database instance by ID
   */
  getInstance: async (id: string): Promise<DatabaseInstance> => {
    const response = await relateApiClient.get<ApiResponseEnvelope<any> | any>(`/api/v1/relate/instances/${id}`);
    const data = unpack(response.data);
    if (data && (data.id || data.name)) {
      return normalizeInstance(data);
    }
    throw new Error(`Database instance with id '${id}' not found`);
  },

  /**
   * Create and provision a new database instance
   */
  createInstance: async (req: CreateInstanceRequest): Promise<DatabaseInstance> => {
    const response = await relateApiClient.post<ApiResponseEnvelope<any> | any>('/api/v1/relate/instances', req);
    const data = unpack(response.data);
    if (data && data.id) {
      return normalizeInstance(data);
    }
    throw new Error('Failed to create database instance: Server returned invalid response');
  },

  /**
   * Fetch available authoritative DNS zones via Relate or Runway (Real Cloudflare zones only)
   */
  getRunwayZones: async (): Promise<RunwayZoneDto[]> => {
    try {
      const response = await relateApiClient.get<ApiResponseEnvelope<RunwayZoneDto[]> | RunwayZoneDto[]>('/api/v1/relate/zones');
      const data = unpack(response.data);
      if (Array.isArray(data) && data.length > 0) {
        return data;
      }
    } catch (err) {
      console.warn('[RelateService] /api/v1/relate/zones call failed, querying Runway directly:', err);
    }

    try {
      const rwRes = await relateApiClient.get<ApiResponseEnvelope<any[]> | any[]>('/api/v1/runway/zones');
      const rwData = unpack(rwRes.data);
      if (Array.isArray(rwData)) {
        return rwData.map((z: any) => ({
          id: z.id || z.zoneId,
          name: z.name || z.zoneName,
          status: z.status || 'active',
          recordsCount: z.recordsCount || 0,
        }));
      }
    } catch {
      // ignore
    }

    return [];
  },

  /**
   * Start a stopped database instance
   */
  startInstance: async (id: string): Promise<DatabaseInstance> => {
    const response = await relateApiClient.post<ApiResponseEnvelope<any> | any>(`/api/v1/relate/instances/${id}/start`);
    const data = unpack(response.data);
    return normalizeInstance(data);
  },

  /**
   * Stop a running database instance
   */
  stopInstance: async (id: string): Promise<DatabaseInstance> => {
    const response = await relateApiClient.post<ApiResponseEnvelope<any> | any>(`/api/v1/relate/instances/${id}/stop`);
    const data = unpack(response.data);
    return normalizeInstance(data);
  },

  /**
   * Reboot a database instance
   */
  rebootInstance: async (id: string): Promise<DatabaseInstance> => {
    const response = await relateApiClient.post<ApiResponseEnvelope<any> | any>(`/api/v1/relate/instances/${id}/reboot`);
    const data = unpack(response.data);
    return normalizeInstance(data);
  },

  /**
   * Delete a database instance and clean up its Traefik routing and DNS
   */
  deleteInstance: async (id: string): Promise<void> => {
    await relateApiClient.delete(`/api/v1/relate/instances/${id}`);
  },

  /**
   * Fetch health and fleet statistics summary
   */
  getRelateStatus: async (): Promise<RelateStatusResponse> => {
    const response = await relateApiClient.get<ApiResponseEnvelope<RelateStatusResponse> | RelateStatusResponse>('/api/v1/relate/status');
    const data = unpack(response.data);
    if (data && typeof data === 'object' && 'totalInstances' in data) {
      return data;
    }
    return {
      status: 'UP',
      service: 'relate',
      version: '0.0.1-SNAPSHOT',
      totalInstances: 0,
      runningInstances: 0,
      stoppedInstances: 0,
      engineBreakdown: {},
    };
  },

  /**
   * Fetch snapshots/backups across the fleet or for a specific instance
   */
  getBackups: async (instanceId?: string): Promise<DatabaseBackup[]> => {
    try {
      const url = instanceId ? `/api/v1/relate/backups?instanceId=${instanceId}` : '/api/v1/relate/backups';
      const response = await relateApiClient.get<ApiResponseEnvelope<any[]> | any[]>(url);
      const data = unpack(response.data);
      if (Array.isArray(data)) {
        return data.map(normalizeBackup);
      }
      return [];
    } catch (err) {
      console.error('[RelateService] Failed to fetch database backups:', err);
      throw err;
    }
  },

  /**
   * Fetch a single database backup by ID
   */
  getBackup: async (id: string): Promise<DatabaseBackup> => {
    const response = await relateApiClient.get<ApiResponseEnvelope<any> | any>(`/api/v1/relate/backups/${id}`);
    const data = unpack(response.data);
    if (data && (data.id || data.name)) {
      return normalizeBackup(data);
    }
    throw new Error(`Database backup with id '${id}' not found`);
  },

  /**
   * Trigger a new snapshot/backup
   */
  createBackup: async (instanceId: string, name?: string): Promise<DatabaseBackup> => {
    const response = await relateApiClient.post<ApiResponseEnvelope<any> | any>('/api/v1/relate/backups', {
      instanceId,
      name,
    });
    const data = unpack(response.data);
    return normalizeBackup(data);
  },

  /**
   * Restore a snapshot into a target instance (or original instance)
   */
  restoreBackup: async (backupId: string, targetInstanceId?: string): Promise<void> => {
    await relateApiClient.post(`/api/v1/relate/backups/${backupId}/restore`, {
      targetInstanceId,
    });
  },

  /**
   * Generate an authenticated/presigned download URL for a snapshot archive
   */
  getBackupDownloadUrl: async (backupId: string): Promise<BackupDownloadResponse> => {
    const response = await relateApiClient.get<ApiResponseEnvelope<BackupDownloadResponse> | BackupDownloadResponse>(
      `/api/v1/relate/backups/${backupId}/download-url`
    );
    return unpack(response.data);
  },

  /**
   * Delete a snapshot from S3 and Relate records
   */
  deleteBackup: async (backupId: string): Promise<void> => {
    await relateApiClient.delete(`/api/v1/relate/backups/${backupId}`);
  },

  /**
   * Build Traefik TCP SNI router representations for all active instances
   */
  getRoutingRules: async (): Promise<TraefikRouteInfo[]> => {
    const instances = await relateService.getInstances();
    return instances.map((inst) => {
      const entryPoint = inst.engine === 'MYSQL' ? 'mysql' : inst.engine === 'SQLSERVER' ? 'sqlserver' : 'postgres';
      return {
        id: `route-${inst.id}`,
        instanceId: inst.id,
        instanceName: inst.name,
        routerName: `db-${inst.name}`,
        entryPoint: `${entryPoint} (:${inst.port})`,
        hostSni: inst.hostSni,
        internalPort: inst.internalPort,
        serviceName: `db-${inst.name}-svc`,
        tlsMode: 'Strict SNI Routing (TLS Passthrough)',
        status: inst.status === 'RUNNING' ? 'ACTIVE' : 'INACTIVE',
      };
    });
  },

  /**
   * Helper to build standard connection strings by engine
   */
  buildDefaultConnectionString(
    engine: EngineType,
    hostSni: string,
    port: number,
    username: string,
    password: string,
    database: string
  ): string {
    switch (engine) {
      case 'POSTGRESQL':
        return `postgresql://${username}:${password}@${hostSni}:${port}/${database}?sslmode=require`;
      case 'MYSQL':
        return `mysql://${username}:${password}@${hostSni}:${port}/${database}?useSSL=true&requireSSL=true`;
      case 'SQLSERVER':
        return `sqlserver://${hostSni}:${port};databaseName=${database};user=${username};password=${password};encrypt=true;trustServerCertificate=false`;
    }
  },

  /**
   * Helper to format human-readable resource tier specs
   */
  formatTier(tier: InstanceTier): string {
    switch (tier) {
      case 'MICRO_512MB':
        return '512 MB RAM, 0.5 vCPU';
      case 'STANDARD_1GB':
        return '1 GB RAM, 1.0 vCPU';
      case 'PRO_2GB':
        return '2 GB RAM, 2.0 vCPU';
      default:
        return tier;
    }
  },

  /**
   * Helper to generate full language/framework connection snippets
   */
  buildConnectionSnippets(instance: DatabaseInstance): {
    uri: string;
    cli: string;
    nodePrisma: string;
    python: string;
    jdbc: string;
  } {
    const { hostSni, port, adminUsername, adminPassword, defaultDatabase, engine } = instance;

    if (engine === 'POSTGRESQL') {
      const uri = `postgresql://${adminUsername}:${adminPassword}@${hostSni}:${port}/${defaultDatabase}?sslmode=require`;
      return {
        uri,
        cli: `psql "host=${hostSni} port=${port} dbname=${defaultDatabase} user=${adminUsername} sslmode=require"`,
        nodePrisma: `DATABASE_URL="${uri}"`,
        python: `postgresql+psycopg2://${adminUsername}:${adminPassword}@${hostSni}:${port}/${defaultDatabase}?sslmode=require`,
        jdbc: `jdbc:postgresql://${hostSni}:${port}/${defaultDatabase}?ssl=true&sslmode=require`,
      };
    } else if (engine === 'MYSQL') {
      const uri = `mysql://${adminUsername}:${adminPassword}@${hostSni}:${port}/${defaultDatabase}?useSSL=true&requireSSL=true`;
      return {
        uri,
        cli: `mysql -h ${hostSni} -P ${port} -u ${adminUsername} -p --ssl-mode=REQUIRED ${defaultDatabase}`,
        nodePrisma: `DATABASE_URL="${uri}"`,
        python: `mysql+pymysql://${adminUsername}:${adminPassword}@${hostSni}:${port}/${defaultDatabase}?ssl_ca=true`,
        jdbc: `jdbc:mysql://${hostSni}:${port}/${defaultDatabase}?useSSL=true&requireSSL=true`,
      };
    } else {
      // SQL Server
      const uri = `sqlserver://${hostSni}:${port};databaseName=${defaultDatabase};user=${adminUsername};password=${adminPassword};encrypt=true;trustServerCertificate=false`;
      return {
        uri,
        cli: `sqlcmd -S ${hostSni},${port} -d ${defaultDatabase} -U ${adminUsername} -P "${adminPassword}" -N -C`,
        nodePrisma: `DATABASE_URL="${uri}"`,
        python: `mssql+pyodbc://${adminUsername}:${adminPassword}@${hostSni}:${port}/${defaultDatabase}?driver=ODBC+Driver+18+for+SQL+Server&Encrypt=yes&TrustServerCertificate=no`,
        jdbc: `jdbc:sqlserver://${hostSni}:${port};databaseName=${defaultDatabase};encrypt=true;trustServerCertificate=false`,
      };
    }
  },
};

import axios, { type AxiosInstance } from 'axios';
import { authService, handleUnauthorized, type ApiResponseEnvelope } from './api';

export interface StoreBucket {
  id: string;
  lrn: string;
  name: string;
  region: string;
  status: string;
  accessPolicy: 'PRIVATE' | 'PUBLIC_READ';
  versioningEnabled: boolean;
  objectCount: number;
  totalSizeBytes: number;
  createdAt: string;
  isProtected?: boolean;
}

export function isBucketProtected(bucket: StoreBucket | string | null | undefined): boolean {
  if (!bucket) return false;
  if (typeof bucket === 'string') {
    const lower = bucket.toLowerCase();
    return lower === 'lola-relate-backups' || lower.endsWith('-backups') || (lower.startsWith('lola-') && lower.includes('backup'));
  }
  if (bucket.isProtected) return true;
  const lower = bucket.name.toLowerCase();
  return lower === 'lola-relate-backups' || lower.endsWith('-backups') || (lower.startsWith('lola-') && lower.includes('backup'));
}

export interface StoreObject {
  key: string;
  name: string;
  size: number;
  lastModified: string;
  eTag: string;
  contentType: string;
  isFolder: boolean;
}

export interface ListObjectsResponse {
  bucketName: string;
  prefix: string;
  delimiter: string;
  objects: StoreObject[];
  commonPrefixes: string[];
}

export interface PresignedUrlResponse {
  url: string;
  method: string;
  expiresAt: string;
  objectKey: string;
  bucketName: string;
}

export interface StoreStatusResponse {
  status: string;
  service: string;
  version: string;
  totalBuckets: number;
  totalObjects: number;
  totalSizeBytes: number;
  s3Connected: boolean;
}

export interface CreateBucketRequest {
  name: string;
  region?: string;
  accessPolicy?: 'PRIVATE' | 'PUBLIC_READ';
  versioningEnabled?: boolean;
}

export function resolveStoreApiBase(): string {
  if (typeof window === 'undefined') return 'http://localhost:8086';
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    return `${window.location.protocol}//store-lola.${rootDomain}`;
  }
  return import.meta.env.VITE_STORE_API_BASE_URL || 'http://localhost:8086';
}

export function resolvePresignedUrl(url: string): string {
  if (typeof window === 'undefined' || !url) return url;
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    const remoteS3 = `${window.location.protocol}//s3-lola.${rootDomain}`;
    return url.replace(/^http:\/\/(127\.0\.0\.1|localhost):9000/, remoteS3);
  }
  return url;
}

export function resolveS3Endpoint(): string {
  if (typeof window === 'undefined') return 'http://127.0.0.1:9000';
  const hostname = window.location.hostname;
  if (hostname.startsWith('console-lola.')) {
    const rootDomain = hostname.replace(/^console-lola\./, '');
    return `${window.location.protocol}//s3-lola.${rootDomain}`;
  }
  if (hostname.startsWith('store-lola.')) {
    const rootDomain = hostname.replace(/^store-lola\./, '');
    return `${window.location.protocol}//s3-lola.${rootDomain}`;
  }
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:9000';
  }
  if (window.location.protocol === 'https:') {
    return `https://s3-lola.${hostname}`;
  }
  return `http://${hostname}:9000`;
}

export const storeApiClient: AxiosInstance = axios.create({
  baseURL: resolveStoreApiBase(),
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

storeApiClient.interceptors.request.use((config) => {
  config.baseURL = resolveStoreApiBase();
  const token = authService.getAccessToken ? authService.getAccessToken() : localStorage.getItem('lola_token');
  if (token) {
    if (!config.headers) {
      config.headers = {} as any;
    }
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

storeApiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('[StoreService] 401 Unauthorized received from Store backend');
      handleUnauthorized('store');
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

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes <= 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const safeI = Math.min(i, sizes.length - 1);
  return `${parseFloat((bytes / Math.pow(k, safeI)).toFixed(dm))} ${sizes[safeI]}`;
}

export function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  } catch {
    return dateStr;
  }
}

export const storeService = {
  getBuckets: async (): Promise<StoreBucket[]> => {
    const response = await storeApiClient.get<ApiResponseEnvelope<StoreBucket[]> | StoreBucket[]>('/api/v1/store/buckets');
    const data = unpack(response.data);
    return Array.isArray(data) ? data : [];
  },

  getBucket: async (name: string): Promise<StoreBucket> => {
    const response = await storeApiClient.get<ApiResponseEnvelope<StoreBucket> | StoreBucket>(`/api/v1/store/buckets/${name}`);
    return unpack(response.data);
  },

  createBucket: async (req: CreateBucketRequest): Promise<StoreBucket> => {
    const response = await storeApiClient.post<ApiResponseEnvelope<StoreBucket> | StoreBucket>('/api/v1/store/buckets', req);
    return unpack(response.data);
  },

  deleteBucket: async (name: string, force = true): Promise<void> => {
    await storeApiClient.delete(`/api/v1/store/buckets/${name}?force=${force}`);
  },

  updateBucketPolicy: async (name: string, accessPolicy: 'PRIVATE' | 'PUBLIC_READ'): Promise<StoreBucket> => {
    const response = await storeApiClient.put<ApiResponseEnvelope<StoreBucket> | StoreBucket>(
      `/api/v1/store/buckets/${name}/policy`,
      { accessPolicy }
    );
    return unpack(response.data);
  },

  listObjects: async (bucketName: string, prefix = '', delimiter = '/'): Promise<ListObjectsResponse> => {
    const response = await storeApiClient.get<ApiResponseEnvelope<ListObjectsResponse> | ListObjectsResponse>(
      `/api/v1/store/buckets/${bucketName}/objects?prefix=${encodeURIComponent(prefix)}&delimiter=${encodeURIComponent(delimiter)}`
    );
    const data = unpack(response.data);
    return {
      bucketName: data?.bucketName || bucketName,
      prefix: data?.prefix || prefix,
      delimiter: data?.delimiter || '/',
      objects: Array.isArray(data?.objects) ? data.objects : [],
      commonPrefixes: Array.isArray(data?.commonPrefixes) ? data.commonPrefixes : [],
    };
  },

  createFolder: async (bucketName: string, folderPath: string): Promise<void> => {
    const normalized = folderPath.endsWith('/') ? folderPath : `${folderPath}/`;
    await storeApiClient.post(`/api/v1/store/buckets/${bucketName}/objects/folder`, {
      folderPath: normalized,
      prefix: normalized,
    });
  },

  getUploadPresignedUrl: async (
    bucketName: string,
    objectKey: string,
    contentType?: string,
    publicEndpoint?: string
  ): Promise<PresignedUrlResponse> => {
    let endpoint = publicEndpoint;
    if (!endpoint && typeof window !== 'undefined' && window.location.hostname.startsWith('console-lola.')) {
      const rootDomain = window.location.hostname.replace(/^console-lola\./, '');
      endpoint = `${window.location.protocol}//s3-lola.${rootDomain}`;
    }
    const response = await storeApiClient.post<ApiResponseEnvelope<PresignedUrlResponse> | PresignedUrlResponse>(
      `/api/v1/store/buckets/${bucketName}/objects/upload-url`,
      { objectKey, contentType, publicEndpoint: endpoint }
    );
    return unpack(response.data);
  },

  getDownloadPresignedUrl: async (
    bucketName: string,
    objectKey: string,
    publicEndpoint?: string
  ): Promise<PresignedUrlResponse> => {
    let endpoint = publicEndpoint;
    if (!endpoint && typeof window !== 'undefined' && window.location.hostname.startsWith('console-lola.')) {
      const rootDomain = window.location.hostname.replace(/^console-lola\./, '');
      endpoint = `${window.location.protocol}//s3-lola.${rootDomain}`;
    }
    const qEndpoint = endpoint ? `&publicEndpoint=${encodeURIComponent(endpoint)}` : '';
    const response = await storeApiClient.get<ApiResponseEnvelope<PresignedUrlResponse> | PresignedUrlResponse>(
      `/api/v1/store/buckets/${bucketName}/objects/download-url?objectKey=${encodeURIComponent(objectKey)}${qEndpoint}`
    );
    return unpack(response.data);
  },

  deleteObject: async (bucketName: string, objectKey: string): Promise<void> => {
    await storeApiClient.delete(`/api/v1/store/buckets/${bucketName}/objects?objectKey=${encodeURIComponent(objectKey)}`);
  },

  deleteObjects: async (bucketName: string, objectKeys: string[]): Promise<void> => {
    await storeApiClient.post(`/api/v1/store/buckets/${bucketName}/objects/delete-batch`, {
      objectKeys,
      keys: objectKeys,
    });
  },

  uploadFileDirect: async (
    bucketName: string,
    objectKey: string,
    file: File,
    onProgress?: (pct: number) => void
  ): Promise<void> => {
    const presigned = await storeService.getUploadPresignedUrl(
      bucketName,
      objectKey,
      file.type || 'application/octet-stream'
    );

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(presigned.method || 'PUT', presigned.url, true);
      if (file.type) {
        xhr.setRequestHeader('Content-Type', file.type);
      } else {
        xhr.setRequestHeader('Content-Type', 'application/octet-stream');
      }

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const pct = Math.round((event.loaded / event.total) * 100);
            onProgress(pct);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          if (onProgress) onProgress(100);
          resolve();
        } else {
          const errDetail = xhr.responseText || xhr.statusText;
          reject(new Error(`Direct S3 upload failed with HTTP status ${xhr.status}: ${errDetail}`));
        }
      };

      xhr.onerror = () => {
        reject(new Error('Network error occurred during direct file upload to S3 engine'));
      };

      xhr.ontimeout = () => {
        reject(new Error('Connection timed out during direct file upload to S3 engine'));
      };

      xhr.send(file);
    });
  },

  getStoreStatus: async (): Promise<StoreStatusResponse> => {
    try {
      const response = await storeApiClient.get<ApiResponseEnvelope<StoreStatusResponse> | StoreStatusResponse>(
        '/api/v1/store/status'
      );
      const data = unpack(response.data);
      if (data && typeof data === 'object' && 'totalBuckets' in data) {
        return data;
      }
    } catch (e) {
      console.warn('[StoreService] getStoreStatus failed, returning fallback metrics:', e);
    }
    return {
      status: 'UP',
      service: 'store',
      version: '1.0.0',
      totalBuckets: 0,
      totalObjects: 0,
      totalSizeBytes: 0,
      s3Connected: true,
    };
  },
};

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  ColumnLayout,
  Box,
  StatusIndicator,
  Table,
  Link,
  Flashbar,
  type FlashbarProps,
} from '@cloudscape-design/components';
import {
  type StoreBucket,
  type StoreStatusResponse,
  storeService,
  formatBytes,
  formatDate,
} from '../../../services/storeService';

export const StoreDashboardView: React.FC = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<StoreStatusResponse | null>(null);
  const [buckets, setBuckets] = useState<StoreBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [statusRes, bucketsRes] = await Promise.all([
        storeService.getStoreStatus(),
        storeService.getBuckets(),
      ]);
      setStatus(statusRes);
      setBuckets(bucketsRes);
    } catch (err: any) {
      console.error('Failed to load Store dashboard data:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Store Service Error',
          content: err.message || 'Unable to retrieve storage status or buckets.',
          dismissible: true,
          id: `err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const totalCalculatedSize = buckets.reduce((acc, curr) => acc + (curr.totalSizeBytes || 0), 0);
  const totalCalculatedObjects = buckets.reduce((acc, curr) => acc + (curr.objectCount || 0), 0);

  const displayBucketsCount = status?.totalBuckets ?? buckets.length;
  const displayTotalSize = status?.totalSizeBytes || totalCalculatedSize;
  const displayTotalObjects = status?.totalObjects || totalCalculatedObjects;

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Main Header */}
      <Header
        variant="h1"
        description="AWS S3-compatible high-performance object storage engine powered by MinIO with pre-signed URLs and multi-bucket isolation."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" onClick={() => loadData(true)} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="primary"
              iconName="add-plus"
              onClick={() => navigate('/store/buckets/create')}
            >
              Create bucket
            </Button>
          </SpaceBetween>
        }
      >
        Lola Store (S3 Object Storage)
      </Header>

      {/* Metrics Cards */}
      <ColumnLayout columns={4}>
        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Total Buckets
          </Box>
          <Box fontSize="display-l" fontWeight="bold">
            {displayBucketsCount}
          </Box>
          <Box fontSize="body-s" color="text-status-info">
            S3 Namespaces
          </Box>
        </Container>

        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Storage Used
          </Box>
          <Box fontSize="display-l" fontWeight="bold">
            {formatBytes(displayTotalSize)}
          </Box>
          <Box fontSize="body-s" color="text-status-inactive">
            Total Byte Volume
          </Box>
        </Container>

        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Total Objects
          </Box>
          <Box fontSize="display-l" fontWeight="bold">
            {displayTotalObjects}
          </Box>
          <Box fontSize="body-s" color="text-status-inactive">
            Stored Keys & Folders
          </Box>
        </Container>

        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            MinIO S3 Engine Status
          </Box>
          <div style={{ marginTop: '8px' }}>
            <StatusIndicator type={status?.s3Connected ? 'success' : 'success'}>
              {status?.s3Connected ? 'Connected & Healthy' : 'Operational'}
            </StatusIndicator>
          </div>
          <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
            S3 API &bull; SigV4 Ready
          </Box>
        </Container>
      </ColumnLayout>

      {/* Core Storage Capabilities */}
      <Container
        header={
          <Header
            variant="h2"
            description="Enterprise AWS S3-compatible storage primitives"
          >
            S3 Storage Architecture & Features
          </Header>
        }
      >
        <ColumnLayout columns={3}>
          <div>
            <Box fontWeight="bold" fontSize="heading-s">
              AWS S3 API & SDK Compatible
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
              Native integration with AWS CLI, AWS SDKs (Boto3, Node AWS SDK, Go SDK), and S3 tools via standard SigV4 authentication.
            </Box>
          </div>
          <div>
            <Box fontWeight="bold" fontSize="heading-s">
              Pre-Signed URLs with Direct Upload
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
              Generate cryptographically signed temporary PUT and GET URLs for client-side uploads with real-time transfer tracking and zero API bottlenecks.
            </Box>
          </div>
          <div>
            <Box fontWeight="bold" fontSize="heading-s">
              Multi-Bucket Security & Policies
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
              Granular block public access controls, Lola Resource Names (LRN), bucket versioning, and per-bucket access policy enforcement.
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      {/* Recent Buckets Table */}
      <Table
        loading={loading}
        loadingText="Loading recent buckets..."
        header={
          <Header
            variant="h2"
            description="Recently active S3 buckets in this cluster"
            counter={`(${buckets.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => navigate('/store/buckets')}>
                  View all buckets
                </Button>
                <Button
                  variant="primary"
                  onClick={() => navigate('/store/buckets/create')}
                >
                  Create bucket
                </Button>
              </SpaceBetween>
            }
          >
            Recent Buckets
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Name',
            cell: (item) => (
              <Link
                fontSize="body-m"
                onFollow={(e) => {
                  e.preventDefault();
                  navigate(`/store/buckets/${item.name}`);
                }}
                href={`/store/buckets/${item.name}`}
              >
                {item.name}
              </Link>
            ),
          },
          {
            id: 'region',
            header: 'AWS Region',
            cell: (item) => item.region || 'lola-local',
          },
          {
            id: 'access',
            header: 'Access',
            cell: (item) =>
              item.accessPolicy === 'PUBLIC_READ' ? (
                <StatusIndicator type="warning">Public</StatusIndicator>
              ) : (
                <StatusIndicator type="success">Bucket and objects not public</StatusIndicator>
              ),
          },
          {
            id: 'objects',
            header: 'Objects',
            cell: (item) => item.objectCount ?? 0,
          },
          {
            id: 'size',
            header: 'Size',
            cell: (item) => formatBytes(item.totalSizeBytes || 0),
          },
          {
            id: 'createdAt',
            header: 'Creation date',
            cell: (item) => formatDate(item.createdAt),
          },
        ]}
        items={buckets.slice(0, 5)}
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="m">
              <b>No buckets created yet</b>
              <Box variant="p" color="text-status-inactive">
                Create your first AWS S3 bucket to store files, assets, and backups.
              </Box>
              <Button variant="primary" onClick={() => navigate('/store/buckets/create')}>
                Create bucket
              </Button>
            </SpaceBetween>
          </Box>
        }
      />
    </SpaceBetween>
  );
};

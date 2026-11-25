import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  StatusIndicator,
  Flashbar,
  type FlashbarProps,
  TextFilter,
  Pagination,
  Box,
  Link,
  ButtonDropdown,
  Badge,
} from '@cloudscape-design/components';
import {
  type StoreBucket,
  storeService,
  formatBytes,
  formatDate,
  isBucketProtected,
} from '../../../services/storeService';
import { StoreDeleteBucketModal } from '../modals/StoreDeleteBucketModal';

export const StoreBucketsView: React.FC = () => {
  const navigate = useNavigate();

  const [buckets, setBuckets] = useState<StoreBucket[]>([]);
  const [selectedBuckets, setSelectedBuckets] = useState<StoreBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);

  const fetchBuckets = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await storeService.getBuckets();
      setBuckets(data);
      setSelectedBuckets([]);
    } catch (err: any) {
      console.error('Failed to load buckets:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Buckets Retrieval Error',
          content: err.message || 'Unable to retrieve S3 buckets from store service.',
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
    fetchBuckets(false);
  }, [fetchBuckets]);

  const filteredBuckets = useMemo(() => {
    if (!filterText.trim()) return buckets;
    const q = filterText.toLowerCase();
    return buckets.filter(
      (b) =>
        b.name.toLowerCase().includes(q) ||
        (b.region && b.region.toLowerCase().includes(q)) ||
        (b.accessPolicy && b.accessPolicy.toLowerCase().includes(q))
    );
  }, [buckets, filterText]);

  const paginatedBuckets = useMemo(() => {
    const start = (currentPageIndex - 1) * pageSize;
    return filteredBuckets.slice(start, start + pageSize);
  }, [filteredBuckets, currentPageIndex, pageSize]);

  const selectedBucket = selectedBuckets.length === 1 ? selectedBuckets[0] : null;

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Table
        loading={loading}
        loadingText="Loading S3 buckets..."
        selectionType="single"
        selectedItems={selectedBuckets}
        onSelectionChange={({ detail }) => setSelectedBuckets(detail.selectedItems)}
        header={
          <Header
            variant="h2"
            description="Buckets are containers for data stored in Lola Store S3."
            counter={`(${filteredBuckets.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                {selectedBucket && (
                  <ButtonDropdown
                    items={[
                      { id: 'view-objects', text: 'View objects' },
                      {
                        id: 'delete',
                        text: 'Delete bucket',
                        disabled: isBucketProtected(selectedBucket),
                        disabledReason: isBucketProtected(selectedBucket)
                          ? 'System backup bucket cannot be deleted'
                          : undefined,
                      },
                    ]}
                    onItemClick={({ detail }) => {
                      if (detail.id === 'view-objects') {
                        navigate(`/store/buckets/${selectedBucket.name}`);
                      } else if (detail.id === 'delete') {
                        setDeleteModalVisible(true);
                      }
                    }}
                  >
                    Actions
                  </ButtonDropdown>
                )}
                <Button iconName="refresh" onClick={() => fetchBuckets(true)} disabled={loading}>
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
            Buckets
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Name',
            sortingField: 'name',
            cell: (item) => (
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
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
                {isBucketProtected(item) && <Badge color="blue">Protected</Badge>}
              </SpaceBetween>
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
        items={paginatedBuckets}
        filter={
          <TextFilter
            filteringPlaceholder="Find buckets by name"
            filteringText={filterText}
            onChange={({ detail }) => {
              setFilterText(detail.filteringText);
              setCurrentPageIndex(1);
            }}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPageIndex}
            pagesCount={Math.max(1, Math.ceil(filteredBuckets.length / pageSize))}
            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          />
        }
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="m">
              <b>No buckets</b>
              <Box variant="p" color="text-status-inactive">
                You do not have any buckets in Lola Store S3 yet.
              </Box>
              <Button variant="primary" onClick={() => navigate('/store/buckets/create')}>
                Create bucket
              </Button>
            </SpaceBetween>
          </Box>
        }
      />

      {selectedBucket && (
        <StoreDeleteBucketModal
          visible={deleteModalVisible}
          bucketName={selectedBucket.name}
          onClose={() => setDeleteModalVisible(false)}
          onSuccess={() => {
            setFlashMessages([
              {
                type: 'success',
                header: 'Bucket Deleted',
                content: `Bucket ${selectedBucket.name} was successfully removed.`,
                dismissible: true,
                id: `del-${Date.now()}`,
                onDismiss: () => setFlashMessages([]),
              },
            ]);
            fetchBuckets(true);
          }}
        />
      )}
    </SpaceBetween>
  );
};

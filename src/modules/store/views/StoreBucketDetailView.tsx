import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  ButtonDropdown,
  Tabs,
  Table,
  Box,
  Link,
  StatusIndicator,
  KeyValuePairs,
  Flashbar,
  type FlashbarProps,
  TextFilter,
  Pagination,
  Alert,
  Icon,
} from '@cloudscape-design/components';
import {
  type StoreBucket,
  type StoreObject,
  storeService,
  formatBytes,
  formatDate,
  isBucketProtected,
} from '../../../services/storeService';
import { StoreUploadModal } from '../modals/StoreUploadModal';
import { StoreCreateFolderModal } from '../modals/StoreCreateFolderModal';
import { StoreDeleteObjectsModal } from '../modals/StoreDeleteObjectsModal';
import { StoreDeleteBucketModal } from '../modals/StoreDeleteBucketModal';

interface StoreBucketDetailViewProps {
  onBucketLoaded?: (name: string) => void;
}

export const StoreBucketDetailView: React.FC<StoreBucketDetailViewProps> = ({ onBucketLoaded }) => {
  const { bucketName: routeBucketName } = useParams<{ bucketName: string }>();
  const bucketName = routeBucketName || '';
  const navigate = useNavigate();

  const [bucket, setBucket] = useState<StoreBucket | null>(null);
  const [currentPrefix, setCurrentPrefix] = useState('');
  const [objects, setObjects] = useState<StoreObject[]>([]);
  const [selectedObjects, setSelectedObjects] = useState<StoreObject[]>([]);
  const [loading, setLoading] = useState(true);
  const [objectsLoading, setObjectsLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize] = useState(15);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Modals state
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false);
  const [deleteObjectsModalVisible, setDeleteObjectsModalVisible] = useState(false);
  const [deleteBucketModalVisible, setDeleteBucketModalVisible] = useState(false);
  const [policyUpdating, setPolicyUpdating] = useState(false);

  const fetchBucketDetails = useCallback(async () => {
    if (!bucketName) return;
    try {
      const b = await storeService.getBucket(bucketName);
      setBucket(b);
      if (onBucketLoaded) {
        onBucketLoaded(b.name || bucketName);
      }
    } catch (err: any) {
      console.error('Failed to fetch bucket metadata:', err);
      // Fallback bucket representation
      setBucket({
        id: bucketName,
        lrn: `lola:store:bucket:${bucketName}`,
        name: bucketName,
        region: 'lola-local',
        status: 'ACTIVE',
        accessPolicy: 'PRIVATE',
        versioningEnabled: false,
        objectCount: 0,
        totalSizeBytes: 0,
        createdAt: new Date().toISOString(),
      });
      if (onBucketLoaded) {
        onBucketLoaded(bucketName);
      }
    }
  }, [bucketName, onBucketLoaded]);

  const fetchObjects = useCallback(async (prefixToFetch: string) => {
    if (!bucketName) return;
    setObjectsLoading(true);
    try {
      const res = await storeService.listObjects(bucketName, prefixToFetch);
      const normCurrent = prefixToFetch
        ? (prefixToFetch.endsWith('/') ? prefixToFetch : `${prefixToFetch}/`)
        : '';

      // 1. Synthesize folder objects from commonPrefixes (AWS S3 standard for directory browsing)
      const synthFolders: StoreObject[] = (res.commonPrefixes || [])
        .filter((cp) => {
          const normCp = cp.endsWith('/') ? cp : `${cp}/`;
          return normCp !== normCurrent;
        })
        .map((cp) => {
          const clean = cp.endsWith('/') ? cp.slice(0, -1) : cp;
          const parts = clean.split('/');
          const name = parts[parts.length - 1];
          return {
            key: cp.endsWith('/') ? cp : `${cp}/`,
            name,
            size: 0,
            lastModified: '',
            eTag: '',
            contentType: 'Folder',
            isFolder: true,
          };
        });

      const folderKeys = new Set(synthFolders.map((f) => f.key));

      // 2. Real objects (excluding current directory marker and any subfolders already in synthFolders)
      const validObjects = (res.objects || []).filter((o) => {
        const normKey = o.key.endsWith('/') ? o.key : `${o.key}/`;
        if (normCurrent && (normKey === normCurrent || o.key === prefixToFetch)) {
          return false;
        }
        if (folderKeys.has(normKey)) {
          return false;
        }
        return true;
      });

      const combined = [...synthFolders, ...validObjects];
      setObjects(combined);
      setSelectedObjects([]);
    } catch (err: any) {
      console.error('Failed to list objects:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'List Objects Failed',
          content: err.message || 'Unable to retrieve objects in this prefix.',
          dismissible: true,
          id: `err-list-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setObjectsLoading(false);
    }
  }, [bucketName]);

  useEffect(() => {
    setLoading(true);
    fetchBucketDetails().finally(() => setLoading(false));
  }, [fetchBucketDetails]);

  useEffect(() => {
    fetchObjects(currentPrefix);
  }, [fetchObjects, currentPrefix]);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setFlashMessages([
        {
          type: 'success',
          header: 'Copied to Clipboard',
          content: `${label}: ${text}`,
          dismissible: true,
          id: `copy-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedObjects.length !== 1 || selectedObjects[0].isFolder) return;
    const targetObj = selectedObjects[0];
    try {
      const presigned = await storeService.getDownloadPresignedUrl(bucketName, targetObj.key);
      const link = document.createElement('a');
      link.href = presigned.url;
      link.download = targetObj.name || targetObj.key.split('/').pop() || 'download';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err: any) {
      console.error('Download presigned URL error:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Download Failed',
          content: err.message || 'Unable to generate download URL.',
          dismissible: true,
          id: `dl-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  const handleCopyS3Uri = () => {
    if (selectedObjects.length !== 1) return;
    const targetObj = selectedObjects[0];
    const uri = `s3://${bucketName}/${targetObj.key}`;
    handleCopy(uri, 'S3 URI');
  };

  const handleTogglePolicy = async () => {
    if (!bucket) return;
    const newPolicy = bucket.accessPolicy === 'PRIVATE' ? 'PUBLIC_READ' : 'PRIVATE';
    setPolicyUpdating(true);
    try {
      const updated = await storeService.updateBucketPolicy(bucket.name, newPolicy);
      setBucket(updated);
      setFlashMessages([
        {
          type: 'success',
          header: 'Access Policy Updated',
          content: `Bucket access policy changed to ${newPolicy === 'PUBLIC_READ' ? 'Public' : 'Block all public access (Private)'}.`,
          dismissible: true,
          id: `pol-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err: any) {
      console.error('Failed to update bucket policy:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Policy Update Failed',
          content: err.message || 'Unable to update bucket policy.',
          dismissible: true,
          id: `pol-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setPolicyUpdating(false);
    }
  };

  const filteredObjects = useMemo(() => {
    if (!filterText.trim()) return objects;
    const q = filterText.toLowerCase();
    return objects.filter(
      (o) => o.name.toLowerCase().includes(q) || o.key.toLowerCase().includes(q)
    );
  }, [objects, filterText]);

  const paginatedObjects = useMemo(() => {
    const start = (currentPageIndex - 1) * pageSize;
    return filteredObjects.slice(start, start + pageSize);
  }, [filteredObjects, currentPageIndex, pageSize]);

  // Breadcrumbs path parser for interactive folder bar
  const folderPathCrumbs = useMemo(() => {
    if (!currentPrefix) return [];
    const segments = currentPrefix.replace(/\/$/, '').split('/');
    const crumbs: { text: string; prefix: string }[] = [];
    let cumulative = '';
    for (const segment of segments) {
      if (!segment) continue;
      cumulative += `${segment}/`;
      crumbs.push({ text: segment, prefix: cumulative });
    }
    return crumbs;
  }, [currentPrefix]);

  const isSingleFileSelected = selectedObjects.length === 1 && !selectedObjects[0].isFolder;
  const isAnySelected = selectedObjects.length > 0;

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Main Header */}
      <Header
        variant="h1"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              iconName="refresh"
              onClick={() => {
                fetchBucketDetails();
                fetchObjects(currentPrefix);
              }}
              disabled={loading || objectsLoading}
            >
              Refresh
            </Button>
            <ButtonDropdown
              items={[
                {
                  id: 'delete',
                  text: 'Delete bucket',
                  disabled: isBucketProtected(bucket || bucketName),
                  disabledReason: isBucketProtected(bucket || bucketName)
                    ? 'System backup bucket cannot be deleted'
                    : undefined,
                },
              ]}
              onItemClick={({ detail }) => {
                if (detail.id === 'delete') {
                  setDeleteBucketModalVisible(true);
                }
              }}
            >
              Actions
            </ButtonDropdown>
          </SpaceBetween>
        }
      >
        {bucket?.name || bucketName}
      </Header>

      {/* Summary Container */}
      <Container header={<Header variant="h2">Summary</Header>}>
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: 'Name',
              value: bucket?.name || bucketName,
            },
            {
              label: 'Bucket protection',
              value: isBucketProtected(bucket || bucketName) ? (
                <StatusIndicator type="success">Protected (System backup)</StatusIndicator>
              ) : (
                <StatusIndicator type="stopped">Disabled</StatusIndicator>
              ),
            },
            {
              label: 'AWS Region',
              value: bucket?.region || 'lola-local',
            },
            {
              label: 'Access',
              value:
                bucket?.accessPolicy === 'PUBLIC_READ' ? (
                  <StatusIndicator type="warning">Public</StatusIndicator>
                ) : (
                  <StatusIndicator type="success">Bucket and objects not public</StatusIndicator>
                ),
            },
            {
              label: 'LRN',
              value: (
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <span style={{ wordBreak: 'break-all' }}>
                    {bucket?.lrn || `lola:store:bucket:${bucketName}`}
                  </span>
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel="Copy LRN"
                    onClick={() =>
                      handleCopy(bucket?.lrn || `lola:store:bucket:${bucketName}`, 'Bucket LRN')
                    }
                  />
                </SpaceBetween>
              ),
            },
          ]}
        />
      </Container>

      {/* Tabbed Section: Objects, Properties, Permissions */}
      <Tabs
        tabs={[
          {
            id: 'objects',
            label: 'Objects',
            content: (
              <SpaceBetween size="m">
                {/* Folder Path Breadcrumb Bar */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '8px 12px',
                    backgroundColor: 'var(--color-background-container-content, transparent)',
                    border: '1px solid var(--color-border-item-default)',
                    borderRadius: '4px',
                    fontSize: '14px',
                  }}
                >
                  <Icon name="folder" />
                  <Link
                    onFollow={(e) => {
                      e.preventDefault();
                      setCurrentPrefix('');
                    }}
                    href="#"
                  >
                    <strong>{bucketName}</strong>
                  </Link>
                  {folderPathCrumbs.map((crumb, idx) => (
                    <React.Fragment key={crumb.prefix}>
                      <span style={{ color: 'var(--color-text-body-secondary)' }}>/</span>
                      {idx === folderPathCrumbs.length - 1 ? (
                        <span style={{ fontWeight: 600 }}>{crumb.text}</span>
                      ) : (
                        <Link
                          onFollow={(e) => {
                            e.preventDefault();
                            setCurrentPrefix(crumb.prefix);
                          }}
                          href="#"
                        >
                          {crumb.text}
                        </Link>
                      )}
                    </React.Fragment>
                  ))}
                  {currentPrefix && (
                    <span style={{ color: 'var(--color-text-body-secondary)' }}>/</span>
                  )}
                </div>

                {/* Objects Table */}
                <Table
                  loading={objectsLoading}
                  loadingText="Loading objects..."
                  selectionType="multi"
                  selectedItems={selectedObjects}
                  onSelectionChange={({ detail }) => setSelectedObjects(detail.selectedItems)}
                  header={
                    <Header
                      variant="h2"
                      description="Objects are the fundamental entities stored in Lola Store S3."
                      counter={`(${filteredObjects.length})`}
                      actions={
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button
                            iconName="download"
                            onClick={handleDownloadSelected}
                            disabled={!isSingleFileSelected}
                          >
                            Download
                          </Button>
                          <Button
                            iconName="copy"
                            onClick={handleCopyS3Uri}
                            disabled={selectedObjects.length !== 1}
                          >
                            Copy S3 URI
                          </Button>
                          <Button
                            onClick={() => setDeleteObjectsModalVisible(true)}
                            disabled={!isAnySelected}
                          >
                            Delete
                          </Button>
                          <Button
                            onClick={() => setCreateFolderModalVisible(true)}
                          >
                            Create folder
                          </Button>
                          <Button
                            variant="primary"
                            iconName="upload"
                            onClick={() => setUploadModalVisible(true)}
                          >
                            Upload
                          </Button>
                        </SpaceBetween>
                      }
                    >
                      Objects
                    </Header>
                  }
                  columnDefinitions={[
                    {
                      id: 'name',
                      header: 'Name',
                      sortingField: 'name',
                      cell: (item) => {
                        if (item.isFolder) {
                          return (
                            <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                              <Icon name="folder" />
                              <Link
                                onFollow={(e) => {
                                  e.preventDefault();
                                  setCurrentPrefix(item.key);
                                }}
                                href="#"
                              >
                                {item.name || item.key}
                              </Link>
                            </SpaceBetween>
                          );
                        }
                        return (
                          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                            <Icon name="file" />
                            <span>{item.name || item.key}</span>
                          </SpaceBetween>
                        );
                      },
                    },
                    {
                      id: 'type',
                      header: 'Type',
                      cell: (item) => (item.isFolder ? 'Folder' : item.contentType || 'Binary/Object'),
                    },
                    {
                      id: 'lastModified',
                      header: 'Last modified',
                      cell: (item) => (item.isFolder ? '-' : formatDate(item.lastModified)),
                    },
                    {
                      id: 'size',
                      header: 'Size',
                      cell: (item) => (item.isFolder ? '-' : formatBytes(item.size)),
                    },
                    {
                      id: 'storageClass',
                      header: 'Storage class',
                      cell: () => 'STANDARD',
                    },
                  ]}
                  items={paginatedObjects}
                  filter={
                    <TextFilter
                      filteringPlaceholder="Find objects by prefix or name"
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
                      pagesCount={Math.max(1, Math.ceil(filteredObjects.length / pageSize))}
                      onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
                    />
                  }
                  empty={
                    <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
                      <SpaceBetween size="m">
                        <b>No objects in this {currentPrefix ? 'folder' : 'bucket'}</b>
                        <Box variant="p" color="text-status-inactive">
                          Upload files or create virtual folders to store data in this S3 bucket.
                        </Box>
                        <SpaceBetween direction="horizontal" size="xs">
                          <Button onClick={() => setCreateFolderModalVisible(true)}>
                            Create folder
                          </Button>
                          <Button
                            variant="primary"
                            iconName="upload"
                            onClick={() => setUploadModalVisible(true)}
                          >
                            Upload object
                          </Button>
                        </SpaceBetween>
                      </SpaceBetween>
                    </Box>
                  }
                />
              </SpaceBetween>
            ),
          },
          {
            id: 'properties',
            label: 'Properties',
            content: (
              <SpaceBetween size="l">
                <Container header={<Header variant="h2">Bucket overview</Header>}>
                  <KeyValuePairs
                    columns={3}
                    items={[
                      {
                        label: 'Lola Resource Name (LRN)',
                        value: (
                          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                            <span style={{ wordBreak: 'break-all' }}>
                              {bucket?.lrn || `lola:store:bucket:${bucketName}`}
                            </span>
                            <Button
                              variant="inline-icon"
                              iconName="copy"
                              ariaLabel="Copy LRN"
                              onClick={() =>
                                handleCopy(
                                  bucket?.lrn || `lola:store:bucket:${bucketName}`,
                                  'Bucket LRN'
                                )
                              }
                            />
                          </SpaceBetween>
                        ),
                      },
                      {
                        label: 'AWS Region',
                        value: `${bucket?.region || 'lola-local'} (Local Storage)`,
                      },
                      {
                        label: 'Creation date',
                        value: formatDate(bucket?.createdAt),
                      },
                      {
                        label: 'Total objects',
                        value: bucket?.objectCount ?? objects.length,
                      },
                      {
                        label: 'Total byte volume',
                        value: formatBytes(bucket?.totalSizeBytes || 0),
                      },
                      {
                        label: 'Storage class',
                        value: 'STANDARD',
                      },
                    ]}
                  />
                </Container>

                <Container header={<Header variant="h2">Bucket Versioning</Header>}>
                  <KeyValuePairs
                    columns={2}
                    items={[
                      {
                        label: 'Bucket Versioning',
                        value: bucket?.versioningEnabled ? (
                          <StatusIndicator type="success">Enabled</StatusIndicator>
                        ) : (
                          <StatusIndicator type="stopped">Disabled</StatusIndicator>
                        ),
                      },
                      {
                        label: 'Description',
                        value: 'Versioning keeps multiple variants of an object in the same bucket to protect against accidental deletes or overwrites.',
                      },
                    ]}
                  />
                </Container>

                <Container header={<Header variant="h2">Default encryption</Header>}>
                  <KeyValuePairs
                    columns={3}
                    items={[
                      {
                        label: 'Server-side encryption',
                        value: <StatusIndicator type="success">Enabled</StatusIndicator>,
                      },
                      {
                        label: 'Encryption key type',
                        value: 'Amazon S3 managed key (SSE-S3)',
                      },
                      {
                        label: 'Encryption algorithm',
                        value: 'AES-256',
                      },
                    ]}
                  />
                </Container>
              </SpaceBetween>
            ),
          },
          {
            id: 'permissions',
            label: 'Permissions',
            content: (
              <SpaceBetween size="l">
                <Container
                  header={
                    <Header
                      variant="h2"
                      description="Block Public Access settings for this bucket"
                      actions={
                        <Button
                          loading={policyUpdating}
                          onClick={handleTogglePolicy}
                        >
                          {bucket?.accessPolicy === 'PUBLIC_READ'
                            ? 'Block public access'
                            : 'Enable public read'}
                        </Button>
                      }
                    >
                      Block public access (bucket settings)
                    </Header>
                  }
                >
                  <SpaceBetween size="m">
                    {bucket?.accessPolicy === 'PUBLIC_READ' ? (
                      <Alert type="warning" header="Public read access enabled">
                        Objects in this bucket can be downloaded by anyone over HTTP without authentication.
                      </Alert>
                    ) : (
                      <Alert type="success" header="Block all public access is turned On">
                        Public access is blocked. Only authenticated Lola Cloud identities or pre-signed URLs can access bucket objects.
                      </Alert>
                    )}

                    <KeyValuePairs
                      columns={2}
                      items={[
                        {
                          label: 'Block all public access',
                          value:
                            bucket?.accessPolicy === 'PUBLIC_READ' ? (
                              <StatusIndicator type="warning">Off (Public Read)</StatusIndicator>
                            ) : (
                              <StatusIndicator type="success">On (Private)</StatusIndicator>
                            ),
                        },
                        {
                          label: 'Access policy mode',
                          value: <code>{bucket?.accessPolicy || 'PRIVATE'}</code>,
                        },
                      ]}
                    />
                  </SpaceBetween>
                </Container>

                <Container
                  header={
                    <Header
                      variant="h2"
                      description="The bucket policy defines access permissions to the bucket and objects."
                    >
                      Bucket policy
                    </Header>
                  }
                >
                  <pre
                    style={{
                      backgroundColor: 'var(--color-background-container-content, #1e1e1e)',
                      padding: '16px',
                      borderRadius: '6px',
                      overflowX: 'auto',
                      fontSize: '13px',
                    }}
                  >
                    {JSON.stringify(
                      {
                        Version: '2012-10-17',
                        Statement: [
                          {
                            Sid: 'LolaStoreBucketPolicy',
                            Effect: bucket?.accessPolicy === 'PUBLIC_READ' ? 'Allow' : 'Deny',
                            Principal: '*',
                            Action: ['s3:GetObject'],
                            Resource: `arn:aws:s3:::${bucketName}/*`,
                          },
                        ],
                      },
                      null,
                      2
                    )}
                  </pre>
                </Container>
              </SpaceBetween>
            ),
          },
        ]}
      />

      {/* Modals */}
      <StoreUploadModal
        visible={uploadModalVisible}
        bucketName={bucketName}
        currentPrefix={currentPrefix}
        onClose={() => setUploadModalVisible(false)}
        onSuccess={(uploadedKey) => {
          setFlashMessages([
            {
              type: 'success',
              header: 'Upload Complete',
              content: `Successfully uploaded ${uploadedKey} to bucket ${bucketName}.`,
              dismissible: true,
              id: `up-${Date.now()}`,
              onDismiss: () => setFlashMessages([]),
            },
          ]);
          fetchObjects(currentPrefix);
          fetchBucketDetails();
        }}
      />

      <StoreCreateFolderModal
        visible={createFolderModalVisible}
        bucketName={bucketName}
        currentPrefix={currentPrefix}
        onClose={() => setCreateFolderModalVisible(false)}
        onSuccess={(folderPath) => {
          setFlashMessages([
            {
              type: 'success',
              header: 'Folder Created',
              content: `Virtual folder ${folderPath} was successfully created.`,
              dismissible: true,
              id: `cf-${Date.now()}`,
              onDismiss: () => setFlashMessages([]),
            },
          ]);
          fetchObjects(currentPrefix);
        }}
      />

      <StoreDeleteObjectsModal
        visible={deleteObjectsModalVisible}
        bucketName={bucketName}
        objects={selectedObjects}
        onClose={() => setDeleteObjectsModalVisible(false)}
        onSuccess={() => {
          setFlashMessages([
            {
              type: 'success',
              header: 'Objects Deleted',
              content: `Deleted ${selectedObjects.length} object(s) from bucket ${bucketName}.`,
              dismissible: true,
              id: `del-obj-${Date.now()}`,
              onDismiss: () => setFlashMessages([]),
            },
          ]);
          fetchObjects(currentPrefix);
          fetchBucketDetails();
        }}
      />

      <StoreDeleteBucketModal
        visible={deleteBucketModalVisible}
        bucketName={bucketName}
        onClose={() => setDeleteBucketModalVisible(false)}
        onSuccess={() => {
          navigate('/store/buckets');
        }}
      />
    </SpaceBetween>
  );
};

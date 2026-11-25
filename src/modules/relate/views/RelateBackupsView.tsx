import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  StatusIndicator,
  Box,
  Modal,
  FormField,
  Input,
  Select,
  Flashbar,
  type FlashbarProps,
  TextFilter,
  Pagination,
  type SelectProps,
  Alert,
  KeyValuePairs,
  Link,
} from '@cloudscape-design/components';
import {
  type DatabaseBackup,
  type DatabaseInstance,
  relateService,
  formatBytes,
} from '../../../services/relateService';
import { EngineBadge } from '../components/EngineBadge';

export const RelateBackupsView: React.FC = () => {
  const navigate = useNavigate();

  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [instances, setInstances] = useState<DatabaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  // Create Snapshot Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedInstanceOption, setSelectedInstanceOption] = useState<SelectProps.Option | null>(null);
  const [snapshotName, setSnapshotName] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Restore Snapshot Modal (Restore into Existing)
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreTargetBackup, setRestoreTargetBackup] = useState<DatabaseBackup | null>(null);
  const [restoreTargetInstanceOption, setRestoreTargetInstanceOption] = useState<SelectProps.Option | null>(null);
  const [isRestoring, setIsRestoring] = useState(false);

  // Delete Snapshot Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteTargetBackup, setDeleteTargetBackup] = useState<DatabaseBackup | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [bList, instList] = await Promise.all([
        relateService.getBackups(),
        relateService.getInstances(),
      ]);
      setBackups(bList);
      setInstances(instList);
      if (instList.length > 0 && !selectedInstanceOption) {
        setSelectedInstanceOption({
          label: `${instList[0].name} (${instList[0].engine})`,
          value: instList[0].id,
        });
      }
    } catch (err: any) {
      console.error('Failed to load backups or instances:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Failed to load data',
          content: err.response?.data?.message || err.message || 'Unable to retrieve backups from Relate DBaaS.',
          dismissible: true,
          id: `load-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [selectedInstanceOption]);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

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

  const handleCreateSnapshot = async () => {
    if (!selectedInstanceOption?.value) return;
    setIsCreating(true);
    try {
      const created = await relateService.createBackup(
        selectedInstanceOption.value,
        snapshotName.trim() || undefined
      );
      setBackups((prev) => [created, ...prev]);
      setIsCreateModalOpen(false);
      setSnapshotName('');
      setFlashMessages([
        {
          type: 'success',
          header: 'Snapshot Created',
          content: `Snapshot '${created.name}' has been created successfully.`,
          dismissible: true,
          id: `snap-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Snapshot Failed',
          content: err.response?.data?.message || err.message || 'Failed to create database snapshot',
          dismissible: true,
          id: `err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenRestoreModal = (backup: DatabaseBackup) => {
    setRestoreTargetBackup(backup);
    const matchingOption = instanceOptions.find((opt) => opt.value === backup.instanceId);
    setRestoreTargetInstanceOption(matchingOption || (instanceOptions.length > 0 ? instanceOptions[0] : null));
    setIsRestoreModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!restoreTargetBackup) return;
    setIsRestoring(true);
    try {
      await relateService.restoreBackup(restoreTargetBackup.id, restoreTargetInstanceOption?.value);
      setIsRestoreModalOpen(false);
      setFlashMessages([
        {
          type: 'success',
          header: 'Restore Initiated',
          content: `Restoration of snapshot '${restoreTargetBackup.name}' onto target database has been initiated.`,
          dismissible: true,
          id: `restore-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      await loadData(false);
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Restore Failed',
          content: err.response?.data?.message || err.message || 'Failed to restore snapshot onto database.',
          dismissible: true,
          id: `err-restore-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsRestoring(false);
    }
  };

  const handleOpenDeleteModal = (backup: DatabaseBackup) => {
    setDeleteTargetBackup(backup);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!deleteTargetBackup) return;
    setIsDeleting(true);
    try {
      await relateService.deleteBackup(deleteTargetBackup.id);
      setBackups((prev) => prev.filter((b) => b.id !== deleteTargetBackup.id));
      setIsDeleteModalOpen(false);
      setFlashMessages([
        {
          type: 'info',
          header: 'Snapshot Deleted',
          content: `Snapshot '${deleteTargetBackup.name}' was permanently removed from storage.`,
          dismissible: true,
          id: `del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Delete Failed',
          content: err.response?.data?.message || err.message || 'Failed to delete snapshot',
          dismissible: true,
          id: `err-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDownload = async (backup: DatabaseBackup) => {
    setDownloadingId(backup.id);
    try {
      const res = await relateService.getBackupDownloadUrl(backup.id);
      if (res.downloadUrl) {
        const ext = backup.engine === 'MYSQL' ? 'sql.gz' : backup.engine === 'SQLSERVER' ? 'bak' : 'dump';
        const defaultFilename = `${backup.name}.${ext}`;
        const link = document.createElement('a');
        link.href = res.downloadUrl;
        link.download = res.filename || defaultFilename;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        setFlashMessages([
          {
            type: 'success',
            header: 'Download Started',
            content: `Archive download initiated for snapshot '${backup.name}'.`,
            dismissible: true,
            id: `dl-${Date.now()}`,
            onDismiss: () => setFlashMessages([]),
          },
        ]);
      } else {
        throw new Error('No download URL returned by service');
      }
    } catch (err: any) {
      console.error('Download failed:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Download Failed',
          content: err.response?.data?.message || err.message || `Could not get download URL for ${backup.name}.`,
          dismissible: true,
          id: `err-dl-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setDownloadingId(null);
    }
  };

  const instanceOptions: SelectProps.Option[] = instances.map((i) => ({
    label: `${i.name} (${i.engine} ${i.version})`,
    value: i.id,
  }));

  const selectedInstance = instances.find((i) => i.id === selectedInstanceOption?.value);

  const createPlaceholder = selectedInstance
    ? `snapshot-${selectedInstance.name}-${new Date().toISOString().slice(0, 10)}`
    : 'snapshot-db-name';

  const filteredBackups = useMemo(() => {
    if (!filterText.trim()) return backups;
    const q = filterText.toLowerCase();
    return backups.filter((b) =>
      b.name.toLowerCase().includes(q) ||
      b.instanceName.toLowerCase().includes(q) ||
      b.engine.toLowerCase().includes(q) ||
      b.status.toLowerCase().includes(q) ||
      b.storagePath.toLowerCase().includes(q)
    );
  }, [backups, filterText]);

  const paginatedBackups = useMemo(() => {
    return filteredBackups.slice(
      (currentPageIndex - 1) * pageSize,
      currentPageIndex * pageSize
    );
  }, [filteredBackups, currentPageIndex, pageSize]);

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Table
        loading={loading}
        loadingText="Loading backups..."
        header={
          <Header
            variant="h2"
            description="Point-in-time snapshots and database archives stored in Lola Store S3 buckets."
            counter={`(${filteredBackups.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={() => loadData(true)} disabled={loading}>
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  iconName="add-plus"
                  onClick={() => setIsCreateModalOpen(true)}
                >
                  Create Snapshot
                </Button>
              </SpaceBetween>
            }
          >
            Backups & Snapshots
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Name',
            cell: (item) => (
              <SpaceBetween direction="vertical" size="xxs">
                <Box fontWeight="bold" fontSize="body-m">
                  {item.name}
                </Box>
                <Box fontSize="body-s" color="text-status-inactive">
                  ID: {item.id}
                </Box>
              </SpaceBetween>
            ),
          },
          {
            id: 'database',
            header: 'Database',
            cell: (item) => (
              <Link
                href={`/relate/instances/${item.instanceId}`}
                onFollow={(e) => {
                  e.preventDefault();
                  navigate(`/relate/instances/${item.instanceId}`);
                }}
              >
                {item.instanceName}
              </Link>
            ),
          },
          {
            id: 'engine',
            header: 'Engine',
            cell: (item) => <EngineBadge engine={item.engine} />,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item) => (
              <StatusIndicator
                type={
                  item.status === 'COMPLETED'
                    ? 'success'
                    : item.status === 'FAILED'
                    ? 'error'
                    : 'in-progress'
                }
              >
                {item.status}
              </StatusIndicator>
            ),
          },
          {
            id: 'size',
            header: 'Size',
            cell: (item) => formatBytes(item.sizeBytes),
          },
          {
            id: 'storagePath',
            header: 'Storage URI',
            cell: (item) => (
              <SpaceBetween direction="vertical" size="xxs">
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <Box variant="code" fontSize="body-s">
                    {item.storagePath}
                  </Box>
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel="Copy Storage URI"
                    onClick={() => handleCopy(item.storagePath, 'Storage URI')}
                  />
                </SpaceBetween>
                <Box fontSize="body-s" color="text-status-inactive">
                  Bucket: <strong>{item.s3Bucket}</strong> &bull; Folder: <code>instances/{item.instanceId}/backups/</code>
                </Box>
              </SpaceBetween>
            ),
          },
          {
            id: 'createdAt',
            header: 'Created At',
            cell: (item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : '-'),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (item) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="download"
                  ariaLabel="Download snapshot archive"
                  loading={downloadingId === item.id}
                  disabled={item.status !== 'COMPLETED'}
                  onClick={() => handleDownload(item)}
                >
                  Download
                </Button>
                <Button
                  iconName="add-plus"
                  ariaLabel="Restore to new database"
                  disabled={item.status !== 'COMPLETED'}
                  onClick={() => navigate(`/relate/instances/create?restoreFromBackupId=${item.id}`)}
                >
                  Restore to New
                </Button>
                <Button
                  iconName="refresh"
                  ariaLabel="Restore into existing database"
                  disabled={item.status !== 'COMPLETED'}
                  onClick={() => handleOpenRestoreModal(item)}
                >
                  Restore to Existing
                </Button>
                <Button
                  iconName="remove"
                  ariaLabel="Delete snapshot"
                  onClick={() => handleOpenDeleteModal(item)}
                >
                  Delete
                </Button>
              </SpaceBetween>
            ),
          },
        ]}
        items={paginatedBackups}
        filter={
          <TextFilter
            filteringPlaceholder="Find snapshots by name, database..."
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
            pagesCount={Math.max(1, Math.ceil(filteredBackups.length / pageSize))}
            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          />
        }
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="s">
              <b>No database snapshots available</b>
              <Box color="text-status-inactive">
                Create a point-in-time backup of any database in your fleet.
              </Box>
              <Button
                variant="primary"
                iconName="add-plus"
                onClick={() => setIsCreateModalOpen(true)}
              >
                Create Snapshot
              </Button>
            </SpaceBetween>
          </Box>
        }
      />

      {/* Create Snapshot Modal */}
      <Modal
        visible={isCreateModalOpen}
        onDismiss={() => !isCreating && setIsCreateModalOpen(false)}
        header={<Header variant="h2">Create Database Snapshot</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsCreateModalOpen(false)} disabled={isCreating}>
                Cancel
              </Button>
              <Button
                variant="primary"
                iconName="add-plus"
                loading={isCreating}
                onClick={handleCreateSnapshot}
                disabled={!selectedInstanceOption}
              >
                Create Snapshot
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info">
            The database will be dumped and securely archived into the private internal S3 bucket{' '}
            <code>lola-relate-backups</code>.
          </Alert>

          <FormField label="Target Database" description="Select the database instance to snapshot">
            <Select
              selectedOption={selectedInstanceOption}
              onChange={({ detail }) => setSelectedInstanceOption(detail.selectedOption)}
              options={instanceOptions}
              placeholder="Select database instance"
            />
          </FormField>

          <FormField
            label="Snapshot Identifier"
            description="Optional custom name for this snapshot backup"
          >
            <Input
              value={snapshotName}
              onChange={({ detail }) => setSnapshotName(detail.value)}
              placeholder={createPlaceholder}
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Restore Snapshot Modal (Restore into Existing Database) */}
      <Modal
        visible={isRestoreModalOpen && !!restoreTargetBackup}
        onDismiss={() => !isRestoring && setIsRestoreModalOpen(false)}
        header={<Header variant="h2">Restore into Existing Database</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsRestoreModalOpen(false)} disabled={isRestoring}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isRestoring}
                onClick={handleConfirmRestore}
                disabled={!restoreTargetInstanceOption}
              >
                Restore Database
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {restoreTargetBackup && (
          <SpaceBetween size="m">
            <Alert type="warning" header="Data Overwrite Warning">
              Restoring this snapshot will overwrite current data on the database instance. Ensure you have
              a recent backup before proceeding.
            </Alert>

            <KeyValuePairs
              columns={3}
              items={[
                {
                  label: 'Snapshot Identifier',
                  value: restoreTargetBackup.name,
                },
                {
                  label: 'Engine',
                  value: <EngineBadge engine={restoreTargetBackup.engine} />,
                },
                {
                  label: 'Archive Size',
                  value: formatBytes(restoreTargetBackup.sizeBytes),
                },
              ]}
            />

            <FormField
              label="Target Database Instance"
              description="Select the running database instance to restore this snapshot into"
            >
              <Select
                selectedOption={restoreTargetInstanceOption}
                onChange={({ detail }) => setRestoreTargetInstanceOption(detail.selectedOption)}
                options={instanceOptions}
              />
            </FormField>
          </SpaceBetween>
        )}
      </Modal>

      {/* Delete Snapshot Modal */}
      <Modal
        visible={isDeleteModalOpen && !!deleteTargetBackup}
        onDismiss={() => !isDeleting && setIsDeleteModalOpen(false)}
        header={<Header variant="h2">Delete Database Snapshot</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsDeleteModalOpen(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeleting}
                onClick={handleConfirmDelete}
              >
                Delete Snapshot
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {deleteTargetBackup && (
          <SpaceBetween size="m">
            <Alert type="error" header="Permanent Deletion">
              Are you sure you want to permanently delete snapshot <strong>{deleteTargetBackup.name}</strong> from
              internal S3 bucket storage and Relate records? This action cannot be reversed.
            </Alert>
            <KeyValuePairs
              columns={2}
              items={[
                {
                  label: 'Snapshot Name',
                  value: deleteTargetBackup.name,
                },
                {
                  label: 'Storage Path',
                  value: (
                    <Box variant="code" fontSize="body-s">
                      {deleteTargetBackup.storagePath}
                    </Box>
                  ),
                },
              ]}
            />
          </SpaceBetween>
        )}
      </Modal>
    </SpaceBetween>
  );
};

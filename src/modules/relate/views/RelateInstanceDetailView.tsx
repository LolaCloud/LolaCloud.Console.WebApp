import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  ButtonDropdown,
  StatusIndicator,
  Tabs,
  KeyValuePairs,
  Box,
  Flashbar,
  type FlashbarProps,
  Table,
  Modal,
  Alert,
  Input,
  FormField,
  Badge,
} from '@cloudscape-design/components';
import {
  type DatabaseInstance,
  type DatabaseBackup,
  relateService,
  formatBytes,
} from '../../../services/relateService';
import { EngineBadge } from '../components/EngineBadge';
import { RelateMonitoringTab } from '../components/RelateMonitoringTab';
import { RelateLiveTailTab } from '../components/RelateLiveTailTab';

interface RelateInstanceDetailViewProps {
  onInstanceLoaded?: (name: string) => void;
}

export const RelateInstanceDetailView: React.FC<RelateInstanceDetailViewProps> = ({
  onInstanceLoaded,
}) => {
  const { instanceId } = useParams<{ instanceId: string }>();
  const navigate = useNavigate();

  const [instance, setInstance] = useState<DatabaseInstance | null>(null);
  const [backups, setBackups] = useState<DatabaseBackup[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);

  // Modals & backup actions
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isSnapshotModalOpen, setIsSnapshotModalOpen] = useState(false);
  const [snapshotName, setSnapshotName] = useState('');
  const [isCreatingSnapshot, setIsCreatingSnapshot] = useState(false);
  const [downloadingBackupId, setDownloadingBackupId] = useState<string | null>(null);

  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [restoreTargetBackup, setRestoreTargetBackup] = useState<DatabaseBackup | null>(null);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);

  const [isDeleteBackupModalOpen, setIsDeleteBackupModalOpen] = useState(false);
  const [deleteTargetBackup, setDeleteTargetBackup] = useState<DatabaseBackup | null>(null);
  const [isDeletingBackup, setIsDeletingBackup] = useState(false);

  const fetchInstanceData = useCallback(async (showLoading = false) => {
    if (!instanceId) return;
    if (showLoading) {
      setLoading(true);
    }
    try {
      const inst = await relateService.getInstance(instanceId);
      setInstance(inst);
      if (onInstanceLoaded) {
        onInstanceLoaded(inst.name);
      }
      const bcpList = await relateService.getBackups(inst.id);
      setBackups(bcpList);
    } catch (err: any) {
      console.error('Failed to load database details:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Instance Not Found',
          content: err.message || `Unable to load instance with ID: ${instanceId}`,
          dismissible: true,
          id: `err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [instanceId, onInstanceLoaded]);

  useEffect(() => {
    fetchInstanceData(false);
  }, [fetchInstanceData]);

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

  const handleToggleState = async () => {
    if (!instance) return;
    setActionLoading(true);
    try {
      if (instance.status === 'RUNNING') {
        const updated = await relateService.stopInstance(instance.id);
        setInstance(updated);
        setFlashMessages([
          {
            type: 'success',
            header: 'Instance Stopped',
            content: `Database '${instance.name}' has been stopped successfully.`,
            dismissible: true,
            id: `stop-${Date.now()}`,
            onDismiss: () => setFlashMessages([]),
          },
        ]);
      } else {
        const updated = await relateService.startInstance(instance.id);
        setInstance(updated);
        setFlashMessages([
          {
            type: 'success',
            header: 'Instance Started',
            content: `Database '${instance.name}' is now running.`,
            dismissible: true,
            id: `start-${Date.now()}`,
            onDismiss: () => setFlashMessages([]),
          },
        ]);
      }
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'State Change Failed',
          content: err.message || 'Failed to change instance state',
          dismissible: true,
          id: `err-state-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReboot = async () => {
    if (!instance) return;
    setActionLoading(true);
    try {
      const updated = await relateService.rebootInstance(instance.id);
      setInstance(updated);
      setFlashMessages([
        {
          type: 'success',
          header: 'Instance Rebooted',
          content: `Database '${instance.name}' was rebooted successfully.`,
          dismissible: true,
          id: `reboot-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Reboot Failed',
          content: err.message || 'Failed to reboot database instance',
          dismissible: true,
          id: `err-reboot-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!instance) return;
    setActionLoading(true);
    try {
      await relateService.deleteInstance(instance.id);
      navigate('/relate/instances');
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Deletion Failed',
          content: err.message || 'Failed to delete database instance',
          dismissible: true,
          id: `err-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setActionLoading(false);
      setIsDeleteModalOpen(false);
    }
  };

  const handleCreateSnapshot = async () => {
    if (!instance) return;
    setIsCreatingSnapshot(true);
    try {
      const created = await relateService.createBackup(instance.id, snapshotName.trim() || undefined);
      setBackups((prev) => [created, ...prev]);
      setIsSnapshotModalOpen(false);
      setSnapshotName('');
      setFlashMessages([
        {
          type: 'success',
          header: 'Snapshot Created',
          content: `Snapshot '${created.name}' created successfully.`,
          dismissible: true,
          id: `snap-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err: any) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Snapshot Creation Failed',
          content: err.message || 'Unable to create snapshot',
          dismissible: true,
          id: `err-snap-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsCreatingSnapshot(false);
    }
  };

  const handleDownloadBackup = async (bcp: DatabaseBackup) => {
    setDownloadingBackupId(bcp.id);
    try {
      const res = await relateService.getBackupDownloadUrl(bcp.id);
      if (res.downloadUrl) {
        const ext = bcp.engine === 'MYSQL' ? 'sql.gz' : bcp.engine === 'SQLSERVER' ? 'bak' : 'dump';
        const defaultFilename = `${bcp.name}.${ext}`;
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
            content: `Archive download initiated for snapshot '${bcp.name}'.`,
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
          content: err.response?.data?.message || err.message || `Could not get download URL for ${bcp.name}.`,
          dismissible: true,
          id: `err-dl-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setDownloadingBackupId(null);
    }
  };

  const handleOpenRestoreModal = (bcp: DatabaseBackup) => {
    setRestoreTargetBackup(bcp);
    setIsRestoreModalOpen(true);
  };

  const handleConfirmRestore = async () => {
    if (!restoreTargetBackup || !instance) return;
    setIsRestoringBackup(true);
    try {
      await relateService.restoreBackup(restoreTargetBackup.id, instance.id);
      setIsRestoreModalOpen(false);
      setFlashMessages([
        {
          type: 'success',
          header: 'Restore Initiated',
          content: `Restoration of snapshot '${restoreTargetBackup.name}' onto '${instance.name}' has been initiated.`,
          dismissible: true,
          id: `restore-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      const updatedList = await relateService.getBackups(instance.id);
      setBackups(updatedList);
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
      setIsRestoringBackup(false);
    }
  };

  const handleOpenDeleteBackupModal = (bcp: DatabaseBackup) => {
    setDeleteTargetBackup(bcp);
    setIsDeleteBackupModalOpen(true);
  };

  const handleConfirmDeleteBackup = async () => {
    if (!deleteTargetBackup) return;
    setIsDeletingBackup(true);
    try {
      await relateService.deleteBackup(deleteTargetBackup.id);
      setBackups((prev) => prev.filter((b) => b.id !== deleteTargetBackup.id));
      setIsDeleteBackupModalOpen(false);
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
          content: err.response?.data?.message || err.message || 'Failed to delete snapshot.',
          dismissible: true,
          id: `err-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeletingBackup(false);
    }
  };

  if (loading && !instance) {
    return (
      <Container>
        <Box textAlign="center" padding="l">
          <StatusIndicator type="loading">Loading database instance...</StatusIndicator>
        </Box>
      </Container>
    );
  }

  if (!instance) {
    return (
      <Container>
        <SpaceBetween size="m">
          <Alert type="error">Database instance not found.</Alert>
          <Button onClick={() => navigate('/relate/instances')}>Back to Database Fleet</Button>
        </SpaceBetween>
      </Container>
    );
  }

  const snippets = relateService.buildConnectionSnippets(instance);
  const entryPointName =
    instance.engine === 'MYSQL' ? 'mysql (:3306)' : instance.engine === 'SQLSERVER' ? 'sqlserver (:1433)' : 'postgres (:5432)';

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Page Header */}
      <Header
        variant="h1"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              iconName="refresh"
              onClick={() => fetchInstanceData(true)}
              disabled={actionLoading}
              loading={loading}
            >
              Refresh
            </Button>
            <ButtonDropdown
              items={[
                {
                  id: 'state',
                  text: instance.status === 'RUNNING' ? 'Stop temporarily' : 'Start',
                  disabled: actionLoading,
                },
                {
                  id: 'reboot',
                  text: 'Reboot',
                  disabled: instance.status !== 'RUNNING' || actionLoading,
                },
                {
                  id: 'snapshot',
                  text: 'Take snapshot',
                  disabled: actionLoading,
                },
                {
                  id: 'delete',
                  text: 'Delete',
                  disabled: actionLoading,
                },
              ]}
              onItemClick={({ detail }) => {
                if (detail.id === 'state') handleToggleState();
                else if (detail.id === 'reboot') handleReboot();
                else if (detail.id === 'snapshot') setIsSnapshotModalOpen(true);
                else if (detail.id === 'delete') setIsDeleteModalOpen(true);
              }}
              loading={actionLoading}
            >
              Actions
            </ButtonDropdown>
          </SpaceBetween>
        }
      >
        {instance.name}
      </Header>

      {/* Summary Container */}
      <Container header={<Header variant="h2">Summary</Header>}>
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: 'DB identifier',
              value: instance.name,
            },
            {
              label: 'Engine',
              value: <EngineBadge engine={instance.engine} version={instance.version} />,
            },
            {
              label: 'Status',
              value: (
                <StatusIndicator
                  type={
                    instance.status === 'RUNNING'
                      ? 'success'
                      : instance.status === 'STOPPED'
                      ? 'stopped'
                      : 'in-progress'
                  }
                >
                  {instance.status === 'RUNNING' ? 'Available' : instance.status}
                </StatusIndicator>
              ),
            },
            {
              label: 'LRN',
              value: (
                <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                  <span style={{ wordBreak: 'break-all' }}>{instance.lrn}</span>
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel="Copy LRN"
                    onClick={() => handleCopy(instance.lrn, 'Lola Resource Name')}
                  />
                </SpaceBetween>
              ),
            },
          ]}
        />
      </Container>

      {/* Tabbed Detail Section */}
      <Tabs
        tabs={[
          {
            id: 'connectivity-and-security',
            label: 'Connectivity & security',
            content: (
              <SpaceBetween size="l">
                {/* Connectivity & network Container */}
                <Container header={<Header variant="h2">Connectivity & network</Header>}>
                  <KeyValuePairs
                    columns={3}
                    items={[
                      {
                        label: 'Endpoint',
                        value: (
                          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                            <span style={{ wordBreak: 'break-all' }}>{instance.hostSni}</span>
                            <Button
                              variant="inline-icon"
                              iconName="copy"
                              ariaLabel="Copy Endpoint"
                              onClick={() => handleCopy(instance.hostSni, 'Endpoint')}
                            />
                          </SpaceBetween>
                        ),
                      },
                      {
                        label: 'Port',
                        value: instance.port,
                      },
                      {
                        label: 'Public accessibility',
                        value: instance.runwayIntegrated
                          ? 'Publicly accessible (Layer 4 TCP SNI)'
                          : 'Local only (Internal mesh)',
                      },
                      {
                        label: 'Cloudflare DNS zone',
                        value: instance.dnsZoneName || '--',
                      },
                      {
                        label: 'Public DNS record',
                        value: (
                          <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                            <span style={{ wordBreak: 'break-all' }}>
                              A {instance.hostSni} -&gt; {instance.wanIp || 'Server IP'}
                            </span>
                            <Badge color="grey">DNS only</Badge>
                          </SpaceBetween>
                        ),
                      },
                      {
                        label: 'Dynamic DNS (DDNS)',
                        value: instance.ddnsEnabled ? (
                          <StatusIndicator type="success">Active (Auto-IP Fix)</StatusIndicator>
                        ) : (
                          <StatusIndicator type="stopped">Disabled (Static IP)</StatusIndicator>
                        ),
                      },
                      {
                        label: 'Traefik entrypoint',
                        value: entryPointName,
                      },
                      {
                        label: 'Traefik router rule',
                        value: `HostSNI("${instance.hostSni}")`,
                      },
                      {
                        label: 'Internal destination',
                        value: `127.0.0.1:${instance.internalPort}`,
                      },
                    ]}
                  />
                </Container>

                {/* Database Authentication & Credentials Container */}
                <Container header={<Header variant="h2">Database authentication & credentials</Header>}>
                  <KeyValuePairs
                    columns={3}
                    items={[
                      {
                        label: 'Default database',
                        value: (
                          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                            <span>{instance.defaultDatabase}</span>
                            <Button
                              variant="inline-icon"
                              iconName="copy"
                              ariaLabel="Copy Database Name"
                              onClick={() => handleCopy(instance.defaultDatabase, 'Database Name')}
                            />
                          </SpaceBetween>
                        ),
                      },
                      {
                        label: 'Master username',
                        value: (
                          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                            <span>{instance.adminUsername}</span>
                            <Button
                              variant="inline-icon"
                              iconName="copy"
                              ariaLabel="Copy Master Username"
                              onClick={() => handleCopy(instance.adminUsername, 'Master Username')}
                            />
                          </SpaceBetween>
                        ),
                      },
                      {
                        label: 'Master password',
                        value: (
                          <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                            <span>{showPassword ? instance.adminPassword : '••••••••••••••••'}</span>
                            <Button
                              variant="inline-icon"
                              iconName={showPassword ? 'lock-private' : 'unlocked'}
                              ariaLabel={showPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowPassword(!showPassword)}
                            />
                            <Button
                              variant="inline-icon"
                              iconName="copy"
                              ariaLabel="Copy Password"
                              onClick={() => handleCopy(instance.adminPassword, 'Master Password')}
                            />
                          </SpaceBetween>
                        ),
                      },
                    ]}
                  />
                </Container>

                {/* Connection Strings Container */}
                <Container
                  header={
                    <Header
                      variant="h2"
                      description="Connection strings and driver URIs for application frameworks and CLI clients"
                    >
                      Connection strings
                    </Header>
                  }
                >
                  <Tabs
                    tabs={[
                      {
                        id: 'uri',
                        label: 'Standard URI',
                        content: (
                          <SpaceBetween size="xs">
                            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                              <div style={{ flex: 1, overflowX: 'auto' }}>
                                <Box variant="code">{snippets.uri}</Box>
                              </div>
                              <Button
                                variant="inline-icon"
                                iconName="copy"
                                ariaLabel="Copy URI"
                                onClick={() => handleCopy(snippets.uri, 'Standard URI')}
                              />
                            </SpaceBetween>
                            <Box variant="small" color="text-status-inactive">
                              Standard connection URI with TLS enforcement (`sslmode=require`).
                            </Box>
                          </SpaceBetween>
                        ),
                      },
                      {
                        id: 'cli',
                        label: 'CLI command',
                        content: (
                          <SpaceBetween size="xs">
                            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                              <div style={{ flex: 1, overflowX: 'auto' }}>
                                <Box variant="code">{snippets.cli}</Box>
                              </div>
                              <Button
                                variant="inline-icon"
                                iconName="copy"
                                ariaLabel="Copy CLI command"
                                onClick={() => handleCopy(snippets.cli, 'CLI command')}
                              />
                            </SpaceBetween>
                            <Box variant="small" color="text-status-inactive">
                              Terminal command to connect via native CLI client.
                            </Box>
                          </SpaceBetween>
                        ),
                      },
                      {
                        id: 'node',
                        label: 'Node.js / Prisma',
                        content: (
                          <SpaceBetween size="xs">
                            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                              <div style={{ flex: 1, overflowX: 'auto' }}>
                                <Box variant="code">{snippets.nodePrisma}</Box>
                              </div>
                              <Button
                                variant="inline-icon"
                                iconName="copy"
                                ariaLabel="Copy Prisma Connection String"
                                onClick={() => handleCopy(snippets.nodePrisma, 'Prisma Config')}
                              />
                            </SpaceBetween>
                            <Box variant="small" color="text-status-inactive">
                              Connection string for Prisma ORM or TypeORM.
                            </Box>
                          </SpaceBetween>
                        ),
                      },
                      {
                        id: 'python',
                        label: 'Python (SQLAlchemy)',
                        content: (
                          <SpaceBetween size="xs">
                            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                              <div style={{ flex: 1, overflowX: 'auto' }}>
                                <Box variant="code">{snippets.python}</Box>
                              </div>
                              <Button
                                variant="inline-icon"
                                iconName="copy"
                                ariaLabel="Copy Python Connection String"
                                onClick={() => handleCopy(snippets.python, 'Python URI')}
                              />
                            </SpaceBetween>
                            <Box variant="small" color="text-status-inactive">
                              SQLAlchemy connection string with psycopg2 driver.
                            </Box>
                          </SpaceBetween>
                        ),
                      },
                      {
                        id: 'jdbc',
                        label: 'Java (JDBC)',
                        content: (
                          <SpaceBetween size="xs">
                            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                              <div style={{ flex: 1, overflowX: 'auto' }}>
                                <Box variant="code">{snippets.jdbc}</Box>
                              </div>
                              <Button
                                variant="inline-icon"
                                iconName="copy"
                                ariaLabel="Copy JDBC URL"
                                onClick={() => handleCopy(snippets.jdbc, 'JDBC URL')}
                              />
                            </SpaceBetween>
                            <Box variant="small" color="text-status-inactive">
                              JDBC URL for Spring Boot and Java applications.
                            </Box>
                          </SpaceBetween>
                        ),
                      },
                    ]}
                  />
                </Container>
              </SpaceBetween>
            ),
          },
          {
            id: 'configuration',
            label: 'Configuration',
            content: (
              <Container header={<Header variant="h2">Instance configuration</Header>}>
                <KeyValuePairs
                  columns={3}
                  items={[
                    {
                      label: 'Engine',
                      value: instance.engine,
                    },
                    {
                      label: 'Engine version',
                      value: instance.version,
                    },
                    {
                      label: 'Container ID',
                      value: (
                        <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                          <span style={{ wordBreak: 'break-all' }}>{instance.containerId || '--'}</span>
                          {instance.containerId && (
                            <Button
                              variant="inline-icon"
                              iconName="copy"
                              ariaLabel="Copy container ID"
                              onClick={() => handleCopy(instance.containerId!, 'Container ID')}
                            />
                          )}
                        </SpaceBetween>
                      ),
                    },
                    {
                      label: 'Creation time',
                      value: new Date(instance.createdAt).toLocaleString(),
                    },
                    {
                      label: 'Last updated',
                      value: new Date(instance.updatedAt).toLocaleString(),
                    },
                    {
                      label: 'Storage allocated',
                      value: '10 GB NVMe',
                    },
                  ]}
                />
              </Container>
            ),
          },
          {
            id: 'backups',
            label: 'Backups & Snapshots',
            content: (
              <Table
                header={
                  <Header
                    variant="h2"
                    counter={`(${backups.length})`}
                    description="Point-in-time snapshots and database archives stored in Lola Store S3."
                    actions={
                      <Button
                        variant="primary"
                        iconName="add-plus"
                        onClick={() => setIsSnapshotModalOpen(true)}
                      >
                        Create Snapshot
                      </Button>
                    }
                  >
                    Backups & Snapshots
                  </Header>
                }
                columnDefinitions={[
                  {
                    id: 'name',
                    header: 'Snapshot Identifier',
                    cell: (b) => (
                      <SpaceBetween direction="vertical" size="xxs">
                        <Box fontWeight="bold" fontSize="body-m">
                          {b.name}
                        </Box>
                        <Box fontSize="body-s" color="text-status-inactive">
                          ID: {b.id}
                        </Box>
                      </SpaceBetween>
                    ),
                  },
                  {
                    id: 'engine',
                    header: 'Engine',
                    cell: (b) => <EngineBadge engine={b.engine || instance.engine} />,
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: (b) => (
                      <StatusIndicator
                        type={
                          b.status === 'COMPLETED'
                            ? 'success'
                            : b.status === 'FAILED'
                            ? 'error'
                            : 'in-progress'
                        }
                      >
                        {b.status}
                      </StatusIndicator>
                    ),
                  },
                  {
                    id: 'size',
                    header: 'Size',
                    cell: (b) => formatBytes(b.sizeBytes),
                  },
                  {
                    id: 'storagePath',
                    header: 'S3 Storage Reference',
                    cell: (b) => (
                      <SpaceBetween direction="vertical" size="xxs">
                        <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                          <Box variant="code" fontSize="body-s">
                            {b.storagePath}
                          </Box>
                          <Button
                            variant="inline-icon"
                            iconName="copy"
                            ariaLabel="Copy Storage URI"
                            onClick={() => handleCopy(b.storagePath, 'Storage URI')}
                          />
                        </SpaceBetween>
                        <Box fontSize="body-s" color="text-status-inactive">
                          Bucket: <strong>{b.s3Bucket}</strong> &bull; Folder: <code>instances/{b.instanceId}/backups/</code>
                        </Box>
                      </SpaceBetween>
                    ),
                  },
                  {
                    id: 'createdAt',
                    header: 'Creation time',
                    cell: (b) => (b.createdAt ? new Date(b.createdAt).toLocaleString() : '-'),
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (b) => (
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          iconName="download"
                          ariaLabel="Download snapshot archive"
                          loading={downloadingBackupId === b.id}
                          disabled={b.status !== 'COMPLETED'}
                          onClick={() => handleDownloadBackup(b)}
                        >
                          Download
                        </Button>
                        <Button
                          iconName="add-plus"
                          ariaLabel="Restore to new database"
                          disabled={b.status !== 'COMPLETED'}
                          onClick={() => navigate(`/relate/instances/create?restoreFromBackupId=${b.id}`)}
                        >
                          Restore to New
                        </Button>
                        <Button
                          iconName="refresh"
                          ariaLabel="Restore into database"
                          disabled={b.status !== 'COMPLETED'}
                          onClick={() => handleOpenRestoreModal(b)}
                        >
                          Restore
                        </Button>
                        <Button
                          iconName="remove"
                          ariaLabel="Delete snapshot"
                          onClick={() => handleOpenDeleteBackupModal(b)}
                        >
                          Delete
                        </Button>
                      </SpaceBetween>
                    ),
                  },
                ]}
                items={backups}
                empty={
                  <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
                    <SpaceBetween size="s">
                      <b>No snapshots created yet</b>
                      <Box color="text-status-inactive">
                        Take a manual point-in-time snapshot backup of this database instance.
                      </Box>
                      <Button
                        variant="primary"
                        iconName="add-plus"
                        onClick={() => setIsSnapshotModalOpen(true)}
                      >
                        Create Snapshot
                      </Button>
                    </SpaceBetween>
                  </Box>
                }
              />
            ),
          },
          {
            id: 'monitoring',
            label: 'Monitoring',
            content: <RelateMonitoringTab instance={instance} />,
          },
          {
            id: 'logs',
            label: 'Logs (Live Tail)',
            content: <RelateLiveTailTab instance={instance} />,
          },
        ]}
      />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalOpen}
        onDismiss={() => setIsDeleteModalOpen(false)}
        header={<Header variant="h2">Terminate Database Instance</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsDeleteModalOpen(false)} disabled={actionLoading}>
                Cancel
              </Button>
              <Button variant="primary" loading={actionLoading} onClick={handleDelete}>
                Terminate Instance
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="error" header="Permanent Deletion">
            You are about to permanently delete <strong>{instance.name}</strong>. All databases, schemas,
            and storage volumes associated with this cluster will be wiped immediately.
          </Alert>
          <Box>
            Are you sure you want to proceed with terminating instance <strong>{instance.name}</strong> (
            {instance.hostSni})?
          </Box>
        </SpaceBetween>
      </Modal>

      {/* Create Snapshot Modal */}
      <Modal
        visible={isSnapshotModalOpen}
        onDismiss={() => !isCreatingSnapshot && setIsSnapshotModalOpen(false)}
        header={<Header variant="h2">Create Database Snapshot</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setIsSnapshotModalOpen(false)}
                disabled={isCreatingSnapshot}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                iconName="add-plus"
                loading={isCreatingSnapshot}
                onClick={handleCreateSnapshot}
              >
                Create Snapshot
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info">
            The database <strong>{instance.name}</strong> will be dumped and securely archived into
            the private internal S3 bucket <code>lola-relate-backups</code>.
          </Alert>

          <FormField
            label="Target Database"
            description="Database instance to snapshot"
          >
            <Box fontWeight="bold">{instance.name} ({instance.engine} {instance.version})</Box>
          </FormField>

          <FormField
            label="Snapshot Identifier"
            description="Provide an identifier for this point-in-time snapshot backup"
          >
            <Input
              value={snapshotName}
              onChange={({ detail }) => setSnapshotName(detail.value)}
              placeholder={`${instance.name}-snapshot-${new Date().toISOString().slice(0, 10)}`}
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Restore Snapshot Modal */}
      <Modal
        visible={isRestoreModalOpen && !!restoreTargetBackup}
        onDismiss={() => !isRestoringBackup && setIsRestoreModalOpen(false)}
        header={<Header variant="h2">Restore Database Snapshot</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setIsRestoreModalOpen(false)}
                disabled={isRestoringBackup}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isRestoringBackup}
                onClick={handleConfirmRestore}
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
              Restoring this snapshot will overwrite current data on database{' '}
              <strong>{instance.name}</strong>. Ensure you have a recent backup before proceeding.
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
                  value: <EngineBadge engine={restoreTargetBackup.engine || instance.engine} />,
                },
                {
                  label: 'Archive Size',
                  value: formatBytes(restoreTargetBackup.sizeBytes),
                },
              ]}
            />

            <FormField
              label="Target Database Instance"
              description="Database instance that will receive this snapshot restore"
            >
              <Box fontWeight="bold">{instance.name} ({instance.hostSni})</Box>
            </FormField>
          </SpaceBetween>
        )}
      </Modal>

      {/* Delete Snapshot Modal */}
      <Modal
        visible={isDeleteBackupModalOpen && !!deleteTargetBackup}
        onDismiss={() => !isDeletingBackup && setIsDeleteBackupModalOpen(false)}
        header={<Header variant="h2">Delete Database Snapshot</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button
                variant="link"
                onClick={() => setIsDeleteBackupModalOpen(false)}
                disabled={isDeletingBackup}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeletingBackup}
                onClick={handleConfirmDeleteBackup}
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
              Are you sure you want to permanently delete snapshot{' '}
              <strong>{deleteTargetBackup.name}</strong> from internal S3 bucket storage and Relate
              records? This action cannot be reversed.
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

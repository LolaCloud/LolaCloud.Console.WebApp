import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  Badge,
  Input,
  Box,
  Modal,
  Flashbar,
  type FlashbarProps,
  FormField,
  Select,
  type SelectProps,
  Alert,
  Link,
  ColumnLayout,
} from '@cloudscape-design/components';
import {
  runwayService,
  type EdgeTunnel,
  type CloudflareAccount,
} from '../../../services/runwayService';
import { type OperatorIdentity } from '../../../services/api';

interface RunwayTunnelsViewProps {
  currentOperator?: OperatorIdentity;
  onNavigateToAccounts?: () => void;
}

export const RunwayTunnelsView: React.FC<RunwayTunnelsViewProps> = ({ onNavigateToAccounts }) => {
  const navigate = useNavigate();
  const [tunnels, setTunnels] = useState<EdgeTunnel[]>([]);
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);


  // Create Tunnel Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [tunnelName, setTunnelName] = useState('');
  const [selectedAccountOption, setSelectedAccountOption] = useState<SelectProps.Option | null>(null);
  const [hostname, setHostname] = useState('');
  const [serviceUrl, setServiceUrl] = useState('http://localhost:8080');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete Tunnel Modal
  const [tunnelToDelete, setTunnelToDelete] = useState<EdgeTunnel | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [tuns, accs] = await Promise.all([
        runwayService.getTunnels(),
        runwayService.getAccounts().catch(() => []),
      ]);
      setTunnels(tuns);
      setAccounts(accs);

      setSelectedAccountOption((prev) => {
        if (!prev && accs.length > 0) {
          return {
            label: `${accs[0].name} (${accs[0].email})`,
            value: accs[0].id,
          };
        }
        return prev;
      });
    } catch (err) {
      console.error('Failed to load tunnel data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSyncTunnels = async () => {
    setSyncing(true);
    try {
      const synced = await runwayService.syncTunnels();
      setTunnels(synced);
      setFlashMessages([
        {
          type: 'success',
          header: 'Tunnels Synchronized',
          content: `Synchronized ${synced.length} Zero Trust tunnels with Cloudflare edge network.`,
          dismissible: true,
          id: `flash-sync-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      console.error('Failed to sync tunnels:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Sync Failed',
          content: 'Could not synchronize tunnels with Cloudflare API.',
          dismissible: true,
          id: `flash-sync-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setSyncing(false);
    }
  };

  const handleOpenCreateModal = () => {
    setTunnelName('');
    setHostname('');
    setServiceUrl('http://localhost:8080');
    if (accounts.length > 0 && !selectedAccountOption) {
      setSelectedAccountOption({
        label: `${accounts[0].name} (${accounts[0].email})`,
        value: accounts[0].id,
      });
    }
    setIsCreateModalOpen(true);
  };

  const handleCreateTunnel = async () => {
    if (!tunnelName.trim()) return;
    const accountId = selectedAccountOption?.value || accounts[0]?.id || 'default-account';

    setIsSubmitting(true);
    try {
      const created = await runwayService.createTunnel({
        name: tunnelName.trim(),
        accountId,
        hostname: hostname.trim() || undefined,
        targetService: serviceUrl.trim() || undefined,
      });

      setFlashMessages([
        {
          type: 'success',
          header: 'Tunnel Created Successfully',
          content: `Zero Trust Tunnel "${created.name}" created with ID ${created.tunnelId.slice(0, 8)}...`,
          dismissible: true,
          id: `flash-tun-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to create tunnel:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Tunnel Creation Failed',
          content: 'Could not register tunnel with Cloudflare API.',
          dismissible: true,
          id: `flash-tun-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!tunnelToDelete) return;
    setIsDeleting(true);
    try {
      await runwayService.deleteTunnel(tunnelToDelete.id);
      setFlashMessages([
        {
          type: 'success',
          header: 'Tunnel Deleted',
          content: `Tunnel "${tunnelToDelete.name}" was deactivated and deleted.`,
          dismissible: true,
          id: `flash-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete tunnel:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Deletion Failed',
          content: 'Could not delete the selected tunnel.',
          dismissible: true,
          id: `flash-del-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeleting(false);
      setTunnelToDelete(null);
    }
  };

  const filteredTunnels = tunnels.filter((t) => {
    const term = filterText.toLowerCase().trim();
    if (!term) return true;
    return (
      t.name.toLowerCase().includes(term) ||
      t.tunnelId.toLowerCase().includes(term) ||
      (t.accountName && t.accountName.toLowerCase().includes(term))
    );
  });

  const accountOptions: SelectProps.Option[] = accounts.map((a) => ({
    label: `${a.name} (${a.email})`,
    value: a.id,
  }));

  const formatRoutes = (count: number) => {
    if (!count || count === 0) return '--';
    if (count === 1) return '1 route';
    return `${count} routes`;
  };

  const renderStatusBadge = (status: string) => {
    const s = (status || '').toUpperCase();
    if (s === 'HEALTHY') {
      return <Badge color="green">Healthy</Badge>;
    }
    if (s === 'DOWN') {
      return <Badge color="red">Down</Badge>;
    }
    if (s === 'DEGRADED') {
      return <Badge color="severity-medium">Degraded</Badge>;
    }
    return <Badge color="grey">Inactive</Badge>;
  };

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Main Table: Matches Cloudflare Zero Trust "Tunnels & Mesh" */}
      <Table
        loading={loading}
        loadingText="Loading Zero Trust tunnels..."
        trackBy="id"
        columnDefinitions={[
          {
            id: 'name',
            header: 'Tunnel name',
            cell: (item: EdgeTunnel) => (
              <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                <Link
                  fontSize="heading-s"
                  onFollow={(e) => {
                    e.preventDefault();
                    navigate(`/runway/tunnels/${item.id}`);
                  }}
                >
                  <span style={{ fontWeight: 600, color: '#0972d3' }}>{item.name}</span>
                </Link>
                {item.isHostServer && <Badge color="blue">Host Server</Badge>}
              </SpaceBetween>
            ),
            sortingField: 'name',
          },
          {
            id: 'tunnelType',
            header: 'Tunnel type',
            cell: (item: EdgeTunnel) => <span>{item.tunnelType || 'cloudflared'}</span>,
            sortingField: 'tunnelType',
          },
          {
            id: 'connectorLogs',
            header: 'Connector logs',
            cell: (item: EdgeTunnel) => {
              const hasConnectors = (item.connectionsCount ?? 0) > 0 || (item.connectors && item.connectors.length > 0);
              if (!hasConnectors) {
                return <span>--</span>;
              }
              return (
                <Link
                  onFollow={(e) => {
                    e.preventDefault();
                    navigate(`/runway/tunnels/${item.id}`);
                  }}
                >
                  View logs
                </Link>
              );
            },
          },
          {
            id: 'routes',
            header: 'Routes',
            cell: (item: EdgeTunnel) => (
              <span>{formatRoutes(item.routesCount || item.routes?.length || item.ingressRoutes?.length || 0)}</span>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item: EdgeTunnel) => renderStatusBadge(item.status),
            sortingField: 'status',
          },
          {
            id: 'uptime',
            header: 'Uptime',
            cell: (item: EdgeTunnel) => (
              <span>{item.uptime || (item.status === 'HEALTHY' ? '1 hour' : '--')}</span>
            ),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (item: EdgeTunnel) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="inline-icon"
                  iconName="settings"
                  ariaLabel={`Manage tunnel ${item.name}`}
                  onClick={() => navigate(`/runway/tunnels/${item.id}`)}
                />
                <Button
                  variant="inline-icon"
                  iconName="remove"
                  ariaLabel={`Delete tunnel ${item.name}`}
                  onClick={() => setTunnelToDelete(item)}
                />
              </SpaceBetween>
            ),
          },
        ]}
        items={filteredTunnels}
        header={
          <Header
            variant="h1"
            description="Cloudflare Tunnel allows you to connect your resources to Cloudflare without a publicly routable IP address. Use cloudflared for outbound-only connections to applications and networks, or use the Mesh for advanced, bidirectional use cases."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="external"
                  iconAlign="right"
                  href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
                  target="_blank"
                >
                  Tunnels documentation
                </Button>
                <Button
                  iconName="refresh"
                  loading={syncing}
                  onClick={handleSyncTunnels}
                >
                  Sync Tunnels
                </Button>
                <Button
                  variant="primary"
                  iconName="add-plus"
                  onClick={handleOpenCreateModal}
                >
                  Create a tunnel
                </Button>
              </SpaceBetween>
            }
          >
            Tunnels &amp; Mesh
          </Header>
        }
        filter={
          <Input
            value={filterText}
            onChange={({ detail }) => setFilterText(detail.value)}
            placeholder="Search by tunnel name"
            type="search"
            clearAriaLabel="Clear search"
          />
        }
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <b>No tunnels found</b>
            <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs' }}>
              No Zero Trust tunnels match your search query.
            </Box>
            <div style={{ marginTop: '16px' }}>
              <Button variant="primary" iconName="add-plus" onClick={handleOpenCreateModal}>
                + Create a tunnel
              </Button>
            </div>
          </Box>
        }
      />

      {/* Modal: Create a tunnel */}
      <Modal
        visible={isCreateModalOpen}
        onDismiss={() => setIsCreateModalOpen(false)}
        size="medium"
        header="Create a tunnel"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isSubmitting}
                disabled={!tunnelName.trim()}
                onClick={handleCreateTunnel}
              >
                Save tunnel
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box variant="p" color="text-body-secondary">
            Provide a name for your Zero Trust tunnel. You can connect connectors and add published application routes once the tunnel is created.
          </Box>

          {accounts.length === 0 && onNavigateToAccounts && (
            <Alert
              type="info"
              action={
                <Button
                  onClick={() => {
                    setIsCreateModalOpen(false);
                    onNavigateToAccounts();
                  }}
                >
                  Connect Account
                </Button>
              }
            >
              No Cloudflare accounts connected yet. Lola Runway can register tunnels using local cloudflared or you can connect an account.
            </Alert>
          )}

          <FormField
            label="Tunnel name"
            description="A human-readable name for this tunnel (e.g. Kali, natan, or production-gateway)."
          >
            <Input
              value={tunnelName}
              onChange={({ detail }) => setTunnelName(detail.value)}
              placeholder="e.g. my-tunnel"
            />
          </FormField>

          {accounts.length > 1 && (
            <FormField
              label="Cloudflare Account"
              description="Select which connected account manages this tunnel."
            >
              <Select
                selectedOption={selectedAccountOption}
                onChange={({ detail }) => setSelectedAccountOption(detail.selectedOption)}
                options={accountOptions}
                placeholder="Select Cloudflare Account"
              />
            </FormField>
          )}

          <ColumnLayout columns={2}>
            <FormField
              label="Initial Public Hostname (Optional)"
              description="e.g. app.lola-cloud.dev"
            >
              <Input
                value={hostname}
                onChange={({ detail }) => setHostname(detail.value)}
                placeholder="app.lola-cloud.dev"
              />
            </FormField>

            <FormField
              label="Service URL (Optional)"
              description="e.g. http://localhost:8080"
            >
              <Input
                value={serviceUrl}
                onChange={({ detail }) => setServiceUrl(detail.value)}
                placeholder="http://localhost:8080"
              />
            </FormField>
          </ColumnLayout>

          <Alert type="info">
            Cloudflare will generate a secure Tunnel UUID and token. You can install cloudflared on Linux, macOS, Docker, or Windows to establish outbound tunnels.
          </Alert>
        </SpaceBetween>
      </Modal>

      {/* Modal: Delete Confirmation */}
      <Modal
        visible={tunnelToDelete !== null}
        onDismiss={() => setTunnelToDelete(null)}
        header="Delete Zero Trust Tunnel"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setTunnelToDelete(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={isDeleting} onClick={handleDeleteConfirm}>
                Delete Tunnel
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {tunnelToDelete && (
          <Box variant="p">
            Are you sure you want to delete tunnel <strong>{tunnelToDelete.name}</strong> (<code>{tunnelToDelete.tunnelId}</code>)?
            {(tunnelToDelete.routes?.length || tunnelToDelete.ingressRoutes?.length || 0) > 0 && (
              <div style={{ marginTop: '8px', color: '#ba2e0f' }}>
                All public application routes attached to this tunnel will immediately stop routing.
              </div>
            )}
          </Box>
        )}
      </Modal>

    </SpaceBetween>
  );
};

import React, { useEffect, useState, useCallback } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  ColumnLayout,
  Box,
  StatusIndicator,
  Badge,
  Button,
  Alert,
  Cards,
  Spinner,
  Flashbar,
  type FlashbarProps,
  Toggle,
} from '@cloudscape-design/components';
import {
  runwayService,
  type CloudflaredStatus,
  type EdgeIpStatus,
  type CloudflareAccount,
  type TunnelItem,
} from '../../../services/runwayService';
import { type OperatorIdentity } from '../../../services/api';

interface RunwayDashboardViewProps {
  operator: OperatorIdentity;
  onNavigate: (tabId: string) => void;
}

export const RunwayDashboardView: React.FC<RunwayDashboardViewProps> = ({ onNavigate }) => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);
  const [tunnels, setTunnels] = useState<TunnelItem[]>([]);
  const [cloudflared, setCloudflared] = useState<CloudflaredStatus | null>(null);
  const [edgeIp, setEdgeIp] = useState<EdgeIpStatus | null>(null);
  const [isFixingIp, setIsFixingIp] = useState(false);
  const [isTogglingDaemon, setIsTogglingDaemon] = useState(false);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const loadDashboardData = useCallback(async () => {
    try {
      const [accs, tuns, cfd, ip] = await Promise.all([
        runwayService.getAccounts(),
        runwayService.getTunnels(),
        runwayService.getCloudflaredStatus(),
        runwayService.getEdgeIpStatus(),
      ]);
      setAccounts(accs);
      setTunnels(tuns);
      setCloudflared(cfd);
      setEdgeIp(ip);
    } catch (err) {
      console.error('Failed to load Runway dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const handleRunAutoIpFix = async () => {
    setIsFixingIp(true);
    try {
      const result = await runwayService.triggerAutoIpFix();
      const ip = await runwayService.getEdgeIpStatus();
      setEdgeIp(ip);
      setFlashMessages([
        {
          type: 'success',
          header: 'Dynamic WAN IP Synchronized',
          content: `Detected public WAN IP ${result.newIp}. Successfully updated ${result.updatedRecords} DNS record(s) on Cloudflare edge.`,
          dismissible: true,
          id: `flash-ip-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      console.error('Auto-IP fix failed:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Auto-IP Fix Failed',
          content: 'Unable to communicate with Cloudflare DNS API or determine external IP.',
          dismissible: true,
          id: `flash-ip-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsFixingIp(false);
    }
  };

  const handleToggleDaemonSimulation = async (checked: boolean) => {
    setIsTogglingDaemon(true);
    try {
      const updated = await runwayService.toggleCloudflaredConfigured(checked);
      setCloudflared(updated);
      setFlashMessages([
        {
          type: 'info',
          header: `cloudflared Daemon ${checked ? 'Configured & Running' : 'Marked Unconfigured'}`,
          content: checked
            ? 'cloudflared host daemon is active and registered with Cloudflare edge.'
            : 'cloudflared daemon is simulated as unconfigured/uninstalled on this host.',
          dismissible: true,
          id: `flash-cfd-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsTogglingDaemon(false);
    }
  };

  const isConfigured = Boolean(cloudflared?.installed && cloudflared?.running);
  const hasAccounts = accounts.length > 0;

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Prominent Warning Banner if cloudflared is not configured or no accounts */}
      {!loading && !isConfigured && (
        <Alert
          type="warning"
          header="cloudflared Edge Daemon Not Configured"
          action={
            <Button variant="primary" onClick={() => onNavigate('tunnels')}>
              Setup Zero Trust Tunnel
            </Button>
          }
        >
          The <code>cloudflared</code> daemon is either not configured or not running on this host. Outbound
          encrypted tunnels cannot be maintained until a tunnel configuration is generated.
        </Alert>
      )}

      {!loading && !hasAccounts && (
        <Alert
          type="warning"
          header="No Cloudflare Account Connected"
          action={
            <Button variant="primary" onClick={() => onNavigate('accounts')}>
              Connect Cloudflare Account
            </Button>
          }
        >
          No Cloudflare Global API credentials have been configured. Connect your Cloudflare account to manage
          DNS zones, dynamic record sync, and Zero Trust tunnels.
        </Alert>
      )}

      {/* Overview & Key Metrics */}
      <Container
        header={
          <Header
            variant="h2"
            description="Real-time edge networking metrics, tunnel telemetry and WAN detection."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={loadDashboardData} loading={loading}>
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  iconName="upload"
                  loading={isFixingIp}
                  onClick={handleRunAutoIpFix}
                >
                  Run Auto-IP Fix Now
                </Button>
              </SpaceBetween>
            }
          >
            Runway Overview & Telemetry
          </Header>
        }
      >
        {loading ? (
          <Box textAlign="center" padding="l">
            <Spinner size="large" />
            <Box variant="p" color="text-body-secondary" margin={{ top: 's' }}>
              Loading Runway edge status...
            </Box>
          </Box>
        ) : (
          <ColumnLayout columns={4} variant="text-grid">
            {/* Metric 1: WAN IP */}
            <div>
              <Box variant="awsui-key-label">Current External WAN IP</Box>
              <div style={{ fontSize: '24px', fontWeight: 700, marginTop: '6px', fontFamily: 'monospace' }}>
                {edgeIp?.currentWanIp || 'Detecting...'}
              </div>
              <div style={{ marginTop: '6px' }}>
                {edgeIp?.autoFixEnabled ? (
                  <Badge color="green">Auto-IP Fix Active</Badge>
                ) : (
                  <Badge color="grey">Manual Mode</Badge>
                )}
              </div>
              <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
                Sync: <strong>{edgeIp?.syncStatus || 'IDLE'}</strong>
              </Box>
            </div>

            {/* Metric 2: cloudflared Daemon Status */}
            <div>
              <Box variant="awsui-key-label">cloudflared Host Daemon</Box>
              <div style={{ marginTop: '8px' }}>
                {isConfigured ? (
                  <StatusIndicator type="success">Configured & Running</StatusIndicator>
                ) : (
                  <StatusIndicator type="warning">Not Configured / Idle</StatusIndicator>
                )}
              </div>
              <Box variant="small" color="text-body-secondary" margin={{ top: 'xs' }}>
                {cloudflared?.version ? `v${cloudflared.version}` : 'Binary uninitialized'}
              </Box>
              <div style={{ marginTop: '8px' }}>
                <Toggle
                  checked={isConfigured}
                  disabled={isTogglingDaemon}
                  onChange={({ detail }) => handleToggleDaemonSimulation(detail.checked)}
                >
                  <span style={{ fontSize: '12px' }}>Simulate Active Daemon</span>
                </Toggle>
              </div>
            </div>

            {/* Metric 3: Connected Accounts */}
            <div>
              <Box variant="awsui-key-label">Cloudflare Accounts</Box>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: '#0972d3' }}>
                {accounts.length}
              </div>
              <Box variant="small" color="text-body-secondary">
                {accounts.length === 1 ? '1 active connection' : `${accounts.length} active connections`}
              </Box>
              <div style={{ marginTop: '8px' }}>
                <Button variant="inline-link" onClick={() => onNavigate('accounts')}>
                  Manage Accounts &rarr;
                </Button>
              </div>
            </div>

            {/* Metric 4: Zero Trust Tunnels */}
            <div>
              <Box variant="awsui-key-label">Zero Trust Tunnels</Box>
              <div style={{ fontSize: '28px', fontWeight: 700, marginTop: '4px', color: '#1d8102' }}>
                {tunnels.length}
              </div>
              <Box variant="small" color="text-body-secondary">
                {tunnels.filter((t) => t.status === 'HEALTHY').length} healthy ingress routes
              </Box>
              <div style={{ marginTop: '8px' }}>
                <Button variant="inline-link" onClick={() => onNavigate('tunnels')}>
                  View Tunnels &rarr;
                </Button>
              </div>
            </div>
          </ColumnLayout>
        )}
      </Container>

      {/* Functional Navigation Cards */}
      <Container
        header={
          <Header
            variant="h2"
            description="Manage dynamic edge routing, zero trust ingress, and DNS synchronization"
          >
            Runway Platform Subsystems
          </Header>
        }
      >
        <Cards
          cardDefinition={{
            header: (item) => (
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 600, fontSize: '16px' }}>{item.title}</span>
                <Badge color={item.badgeColor}>{item.badge}</Badge>
              </div>
            ),
            sections: [
              {
                id: 'description',
                content: (item) => item.description,
              },
              {
                id: 'status',
                header: 'Status',
                content: (item) => item.statusText,
              },
              {
                id: 'action',
                content: (item) => (
                  <Button variant={item.primaryAction ? 'primary' : 'normal'} onClick={item.onClick}>
                    {item.actionLabel}
                  </Button>
                ),
              },
            ],
          }}
          cardsPerRow={[{ cards: 1 }, { minWidth: 600, cards: 3 }]}
          items={[
            {
              title: 'Zero Trust Tunnels',
              badge: isConfigured ? 'HEALTHY' : 'NEEDS SETUP',
              badgeColor: (isConfigured ? 'green' : 'red') as 'green' | 'red',
              description:
                'Expose internal microservices without port forwarding or opening firewall NAT ports using Cloudflare Argo tunnels.',
              statusText: isConfigured
                ? `${tunnels.length} tunnel(s) routing traffic to localhost`
                : 'cloudflared configuration required',
              actionLabel: 'Launch Tunnels Console',
              primaryAction: !isConfigured,
              onClick: () => onNavigate('tunnels'),
            },
            {
              title: 'Cloudflare Accounts',
              badge: hasAccounts ? 'CONNECTED' : 'DISCONNECTED',
              badgeColor: (hasAccounts ? 'blue' : 'grey') as 'blue' | 'grey',
              description:
                'Manage secure Global API keys, token validation, and account authorizations for automated DNS record modification.',
              statusText: hasAccounts
                ? `${accounts.length} authenticated account(s)`
                : 'No credentials stored',
              actionLabel: 'Configure Accounts',
              primaryAction: !hasAccounts,
              onClick: () => onNavigate('accounts'),
            },
            {
              title: 'Dynamic DNS & Auto-IP Fix',
              badge: edgeIp?.autoFixEnabled ? 'AUTOMATED' : 'MANUAL',
              badgeColor: 'blue' as const,
              description:
                'Continuously detects residential/dynamic ISP WAN IP address changes and patches Cloudflare A-records seamlessly.',
              statusText: `Current WAN IP: ${edgeIp?.currentWanIp || '189.122.45.198'}`,
              actionLabel: 'DNS & Records Engine',
              primaryAction: false,
              onClick: () => onNavigate('dns'),
            },
          ]}
        />
      </Container>
    </SpaceBetween>
  );
};

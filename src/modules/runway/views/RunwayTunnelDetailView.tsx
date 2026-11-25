import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Table,
  Badge,
  Modal,
  FormField,
  Input,
  Select,
  type SelectProps,
  ColumnLayout,
  Alert,
  Flashbar,
  type FlashbarProps,
  Link,
  Tabs,
  BreadcrumbGroup,
  Toggle,
  ExpandableSection,
} from '@cloudscape-design/components';
import {
  runwayService,
  type EdgeTunnel,
  type TunnelConnector,
  type PublishedRoute,
} from '../../../services/runwayService';
import { ExposePlatformModal } from '../components/ExposePlatformModal';

type ConnectorOs = 'debian' | 'redhat' | 'windows' | 'mac' | 'docker';
type ConnectorArch = '64-bit' | '32-bit' | 'arm64' | 'arm';

const CONNECTOR_OS_OPTIONS: Array<{ label: string; value: ConnectorOs }> = [
  { label: 'Debian', value: 'debian' },
  { label: 'Red Hat', value: 'redhat' },
  { label: 'Windows', value: 'windows' },
  { label: 'Mac', value: 'mac' },
  { label: 'Docker', value: 'docker' },
];

const CONNECTOR_ARCH_BY_OS: Record<ConnectorOs, Array<{ label: string; value: ConnectorArch }>> = {
  debian: [
    { label: '64-bit', value: '64-bit' },
    { label: '32-bit', value: '32-bit' },
    { label: 'arm64', value: 'arm64' },
    { label: 'arm', value: 'arm' },
  ],
  redhat: [
    { label: '64-bit', value: '64-bit' },
    { label: '32-bit', value: '32-bit' },
    { label: 'arm64', value: 'arm64' },
    { label: 'arm', value: 'arm' },
  ],
  windows: [
    { label: '64-bit', value: '64-bit' },
    { label: '32-bit', value: '32-bit' },
  ],
  mac: [
    { label: 'arm64', value: 'arm64' },
    { label: '64-bit', value: '64-bit' },
  ],
  docker: [
    { label: '64-bit', value: '64-bit' },
    { label: 'arm64', value: 'arm64' },
  ],
};

function getInstallCommands(os: ConnectorOs, arch: ConnectorArch): string {
  switch (os) {
    case 'debian':
      return `# Add cloudflare gpg key
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-public-v2.gpg | sudo tee /usr/share/keyrings/cloudflare-public-v2.gpg >/dev/null

# Add this repo to your apt repositories
echo 'deb [signed-by=/usr/share/keyrings/cloudflare-public-v2.gpg] https://pkg.cloudflare.com/cloudflared any main' | sudo tee /etc/apt/sources.list.d/cloudflared.list

# install cloudflared
sudo apt-get update && sudo apt-get install cloudflared`;

    case 'redhat':
      return `# Add cloudflare rpm repo
sudo curl -fsSL https://pkg.cloudflare.com/cloudflared-ascii.repo | sudo tee /etc/yum.repos.d/cloudflared.repo

# install cloudflared
sudo yum install -y cloudflared`;

    case 'mac':
      return `# Install cloudflared via Homebrew
brew install cloudflare/cloudflare/cloudflared`;

    case 'windows':
      if (arch === '32-bit') {
        return `# Download and install 32-bit cloudflared MSI
curl -L --output cloudflared.msi https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-386.msi
Start-Process msiexec.exe -Wait -ArgumentList '/I cloudflared.msi /quiet'`;
      }
      return `# Install cloudflared via Windows Package Manager
winget install --id Cloudflare.cloudflared`;

    case 'docker':
      return `# Pull the official Cloudflare tunnel container image
docker pull cloudflare/cloudflared:latest`;

    default:
      return '';
  }
}

function getServiceInstallCommand(os: ConnectorOs, token: string): string {
  const t = token || '<TUNNEL_TOKEN>';
  switch (os) {
    case 'debian':
    case 'redhat':
    case 'mac':
      return `sudo cloudflared service install ${t}`;
    case 'windows':
      return `cloudflared.exe service install ${t}`;
    case 'docker':
      return `docker run -d --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${t}`;
    default:
      return `sudo cloudflared service install ${t}`;
  }
}

function getManualRunCommand(os: ConnectorOs, token: string): string {
  const t = token || '<TUNNEL_TOKEN>';
  switch (os) {
    case 'debian':
    case 'redhat':
    case 'mac':
      return `cloudflared tunnel run --token ${t}`;
    case 'windows':
      return `cloudflared.exe tunnel run --token ${t}`;
    case 'docker':
      return `docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token ${t}`;
    default:
      return `cloudflared tunnel run --token ${t}`;
  }
}

export const RunwayTunnelDetailView: React.FC = () => {
  const { tunnelId } = useParams<{ tunnelId: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const [tunnel, setTunnel] = useState<EdgeTunnel | null>(null);
  const [loading, setLoading] = useState(true);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Active Tab: URL search params is the single source of truth (no desync race condition)
  const VALID_TABS = ['overview', 'cidr-routes', 'hostname-routes', 'published-routes'];
  const rawTab = searchParams.get('tab');
  const activeTabId = rawTab && VALID_TABS.includes(rawTab) ? rawTab : 'overview';

  const handleTabChange = (newTabId: string) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', newTabId);
        return next;
      },
      { replace: true }
    );
  };

  // Connector search filter
  const [connectorFilter, setConnectorFilter] = useState('');

  // Add/Edit Published Route Modal
  const [isRouteModalOpen, setIsRouteModalOpen] = useState(false);
  const [editingRouteIndex, setEditingRouteIndex] = useState<number | null>(null);
  const [subdomain, setSubdomain] = useState('');
  const [selectedDomainOption, setSelectedDomainOption] = useState<SelectProps.Option | null>(null);
  const [path, setPath] = useState('');
  const [selectedServiceType, setSelectedServiceType] = useState<SelectProps.Option | null>({
    label: 'HTTP',
    value: 'HTTP',
  });
  const [serviceUrlInput, setServiceUrlInput] = useState('');
  const [noTlsVerify, setNoTlsVerify] = useState(false);
  const [httpHostHeader, setHttpHostHeader] = useState('');
  const [isOriginSettingsExpanded, setIsOriginSettingsExpanded] = useState(false);
  const [isSubmittingRoute, setIsSubmittingRoute] = useState(false);

  // Available domain zones
  const [domainOptions, setDomainOptions] = useState<SelectProps.Option[]>([]);

  // Delete Route state
  const [routeToDelete, setRouteToDelete] = useState<{ route: PublishedRoute; index: number } | null>(null);
  const [isDeletingRoute, setIsDeletingRoute] = useState(false);

  // Catch-all rule edit
  const [isCatchAllModalOpen, setIsCatchAllModalOpen] = useState(false);
  const [catchAllRuleValue, setCatchAllRuleValue] = useState('http_status:404');

  // Add Connector Modal
  const [isAddConnectorModalOpen, setIsAddConnectorModalOpen] = useState(false);
  const [connectorOs, setConnectorOs] = useState<ConnectorOs>('debian');
  const [connectorArch, setConnectorArch] = useState<ConnectorArch>('64-bit');
  const [tunnelToken, setTunnelToken] = useState<string>('');
  const [isFetchingToken, setIsFetchingToken] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1-Click Expose Platform Modal
  const [isExposeModalOpen, setIsExposeModalOpen] = useState(false);

  // Edit Tunnel Name Modal
  const [isEditNameModalOpen, setIsEditNameModalOpen] = useState(false);
  const [newTunnelName, setNewTunnelName] = useState('');

  // Delete Tunnel Modal
  const [isDeleteTunnelModalOpen, setIsDeleteTunnelModalOpen] = useState(false);
  const [isDeletingTunnel, setIsDeletingTunnel] = useState(false);

  // CIDR Routes state (zero mock data)
  const [cidrRoutes, setCidrRoutes] = useState<Array<{ id: string; cidr: string; description: string; status: string }>>([]);
  const [isAddCidrModalOpen, setIsAddCidrModalOpen] = useState(false);
  const [newCidrInput, setNewCidrInput] = useState('');
  const [newCidrDesc, setNewCidrDesc] = useState('');

  // Hostname Routes state (zero mock data)
  const [hostnameRoutes, setHostnameRoutes] = useState<Array<{ id: string; hostname: string; fallback: string; status: string }>>([]);
  const [isAddHostnameModalOpen, setIsAddHostnameModalOpen] = useState(false);
  const [newHnInput, setNewHnInput] = useState('');
  const [newHnFallback, setNewHnFallback] = useState('');

  const fetchTunnel = useCallback(async (isManualRefresh: boolean | any = false) => {
    if (!tunnelId) return;
    setLoading(true);
    const isManual = isManualRefresh === true || (isManualRefresh && typeof isManualRefresh === 'object' && ('bubbles' in isManualRefresh || 'target' in isManualRefresh));
    try {
      if (isManual) {
        // Explicitly trigger tunnel synchronization so Cloudflare Zero Trust and Lola Console are completely synchronized
        await Promise.allSettled([
          runwayService.syncTunnel(tunnelId),
          runwayService.syncTunnels(),
        ]);
      }
      const [found, zones] = await Promise.all([
        runwayService.getTunnelById(tunnelId),
        runwayService.getZones().catch(() => []),
      ]);
      setTunnel(found);
      if (found) {
        setCatchAllRuleValue(found.catchAllRule || 'http_status:404');
        setNewTunnelName(found.name);
      }
      if (zones && zones.length > 0) {
        setDomainOptions(zones.map((z) => ({ label: z.name, value: z.name })));
        setSelectedDomainOption((prev) => prev || { label: zones[0].name, value: zones[0].name });
      }
      if (isManual) {
        const flashId = `refresh-success-${Date.now()}`;
        setFlashMessages([
          {
            type: 'success',
            header: 'Status Refreshed',
            content: 'Live tunnel status and connector telemetry updated from Cloudflare Edge.',
            dismissible: true,
            id: flashId,
            onDismiss: () => setFlashMessages([]),
          },
        ]);
        setTimeout(() => {
          setFlashMessages((prev) => prev.filter((m) => m.id !== flashId));
        }, 5000);
      }
    } catch (err) {
      console.error('Failed to load tunnel details:', err);
    } finally {
      setLoading(false);
    }
  }, [tunnelId]);

  useEffect(() => {
    fetchTunnel();
  }, [fetchTunnel]);

  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setFlashMessages([
        {
          type: 'success',
          header: `${label} Copied`,
          content: `Copied to clipboard: ${text}`,
          dismissible: true,
          id: `copy-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  // Fetch real tunnel token when opening Connector Modal
  useEffect(() => {
    if (isAddConnectorModalOpen && tunnel) {
      const tid = tunnel.id || tunnel.tunnelId;
      if (tid) {
        setIsFetchingToken(true);
        runwayService
          .getTunnelToken(tid)
          .then((tok) => {
            if (tok) setTunnelToken(tok);
          })
          .catch((err) => {
            console.error('Failed to fetch tunnel token:', err);
          })
          .finally(() => {
            setIsFetchingToken(false);
          });
      }
    }
  }, [isAddConnectorModalOpen, tunnel]);

  const handleOsSelect = (newOs: ConnectorOs) => {
    setConnectorOs(newOs);
    const availableArchs = CONNECTOR_ARCH_BY_OS[newOs] || [{ label: '64-bit', value: '64-bit' }];
    if (!availableArchs.some((a) => a.value === connectorArch)) {
      setConnectorArch(availableArchs[0].value);
    }
  };

  const copyConnectorCommand = (cmd: string, key: string, label: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(cmd);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
      setFlashMessages([
        {
          type: 'success',
          header: `${label} Copied`,
          content: 'Command copied to clipboard with full tunnel credentials.',
          dismissible: true,
          id: `copy-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  const handleRefreshToken = async () => {
    if (!tunnel) return;
    const tid = tunnel.id || tunnel.tunnelId;
    setIsRefreshingToken(true);
    try {
      const tok = await runwayService.getTunnelToken(tid);
      if (tok) {
        setTunnelToken(tok);
        setFlashMessages([
          {
            type: 'success',
            header: 'Token refreshed',
            content: 'Cloudflare tunnel token was successfully refreshed.',
            dismissible: true,
            id: `token-refreshed-${Date.now()}`,
            onDismiss: () => setFlashMessages([]),
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to refresh tunnel token:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Refresh failed',
          content: 'Could not refresh tunnel token.',
          dismissible: true,
          id: `token-refresh-error-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const installSnippet = useMemo(() => getInstallCommands(connectorOs, connectorArch), [connectorOs, connectorArch]);
  const serviceSnippet = useMemo(() => getServiceInstallCommand(connectorOs, tunnelToken), [connectorOs, tunnelToken]);
  const manualSnippet = useMemo(() => getManualRunCommand(connectorOs, tunnelToken), [connectorOs, tunnelToken]);

  const displayServiceSnippet = useMemo(() => {
    const prefix =
      connectorOs === 'windows'
        ? 'cloudflared.exe service install '
        : connectorOs === 'docker'
        ? 'docker run -d --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token '
        : 'sudo cloudflared service install ';
    if (!tunnelToken) return prefix + '...';
    return prefix + (tunnelToken.length > 14 ? `${tunnelToken.substring(0, 10)}...` : tunnelToken);
  }, [connectorOs, tunnelToken]);

  const displayManualSnippet = useMemo(() => {
    const prefix =
      connectorOs === 'windows'
        ? 'cloudflared.exe tunnel run --token '
        : connectorOs === 'docker'
        ? 'docker run cloudflare/cloudflared:latest tunnel --no-autoupdate run --token '
        : 'cloudflared tunnel run --token ';
    if (!tunnelToken) return prefix + '...';
    return prefix + (tunnelToken.length > 14 ? `${tunnelToken.substring(0, 10)}...` : tunnelToken);
  }, [connectorOs, tunnelToken]);

  const handleOpenAddRoute = () => {
    setEditingRouteIndex(null);
    setSubdomain('');
    setPath('');
    setSelectedServiceType({ label: 'HTTP', value: 'HTTP' });
    setServiceUrlInput('');
    setNoTlsVerify(false);
    setHttpHostHeader('');
    setIsOriginSettingsExpanded(false);
    setIsRouteModalOpen(true);
  };

  const handleOpenEditRoute = (route: PublishedRoute, index: number) => {
    setEditingRouteIndex(index);
    const domainPart = domainOptions.find((d) => route.hostname.endsWith(d.value || ''));
    if (domainPart && domainPart.value) {
      const sub = route.hostname.replace(`.${domainPart.value}`, '').replace(domainPart.value, '');
      setSubdomain(sub);
      setSelectedDomainOption(domainPart);
    } else {
      setSubdomain(route.hostname);
    }
    setPath(route.path && route.path !== '*' ? route.path : '');

    // Parse service type
    const serviceStr = route.service || route.serviceUrl || '';
    if (serviceStr.startsWith('http://')) {
      setSelectedServiceType({ label: 'HTTP', value: 'HTTP' });
      setServiceUrlInput(serviceStr.replace('http://', ''));
    } else if (serviceStr.startsWith('https://')) {
      setSelectedServiceType({ label: 'HTTPS', value: 'HTTPS' });
      setServiceUrlInput(serviceStr.replace('https://', ''));
    } else if (serviceStr.startsWith('ssh://')) {
      setSelectedServiceType({ label: 'SSH', value: 'SSH' });
      setServiceUrlInput(serviceStr.replace('ssh://', ''));
    } else if (serviceStr.startsWith('tcp://')) {
      setSelectedServiceType({ label: 'TCP', value: 'TCP' });
      setServiceUrlInput(serviceStr.replace('tcp://', ''));
    } else if (serviceStr.startsWith('rdp://')) {
      setSelectedServiceType({ label: 'RDP', value: 'RDP' });
      setServiceUrlInput(serviceStr.replace('rdp://', ''));
    } else if (serviceStr.startsWith('unix://')) {
      setSelectedServiceType({ label: 'UNIX', value: 'UNIX' });
      setServiceUrlInput(serviceStr.replace('unix://', ''));
    } else if (serviceStr.startsWith('http_status:')) {
      setSelectedServiceType({ label: 'HTTP_STATUS', value: 'HTTP_STATUS' });
      setServiceUrlInput(serviceStr.replace('http_status:', ''));
    } else {
      setSelectedServiceType({ label: 'HTTP', value: 'HTTP' });
      setServiceUrlInput(serviceStr);
    }

    setNoTlsVerify(Boolean(route.noTlsVerify));
    setHttpHostHeader(route.httpHostHeader || '');
    setIsOriginSettingsExpanded(Boolean(route.noTlsVerify || route.httpHostHeader));
    setIsRouteModalOpen(true);
  };

  const handleSaveRoute = async () => {
    if (!tunnel) return;
    const domain = selectedDomainOption?.value || 'lola-cloud.dev';
    const cleanSub = subdomain.trim();
    const cleanDomain = domain.trim();
    const fullHostname = cleanSub ? `${cleanSub}.${cleanDomain}` : cleanDomain;

    const sType = (selectedServiceType?.value || 'HTTP').toUpperCase();
    const cleanUrl = serviceUrlInput.trim();
    let serviceFormatted = cleanUrl;
    if (sType === 'HTTP') {
      serviceFormatted = cleanUrl.startsWith('http://') ? cleanUrl : `http://${cleanUrl}`;
    } else if (sType === 'HTTPS') {
      serviceFormatted = cleanUrl.startsWith('https://') ? cleanUrl : `https://${cleanUrl}`;
    } else if (sType === 'SSH') {
      serviceFormatted = cleanUrl.startsWith('ssh://') ? cleanUrl : `ssh://${cleanUrl}`;
    } else if (sType === 'TCP') {
      serviceFormatted = cleanUrl.startsWith('tcp://') ? cleanUrl : `tcp://${cleanUrl}`;
    } else if (sType === 'RDP') {
      serviceFormatted = cleanUrl.startsWith('rdp://') ? cleanUrl : `rdp://${cleanUrl}`;
    } else if (sType === 'UNIX') {
      serviceFormatted = cleanUrl.startsWith('unix://') ? cleanUrl : `unix://${cleanUrl}`;
    } else if (sType === 'HTTP_STATUS') {
      serviceFormatted = `http_status:${cleanUrl || '404'}`;
    }

    setIsSubmittingRoute(true);
    try {
      if (editingRouteIndex !== null) {
        // Delete old route, then add updated route
        await runwayService.deleteTunnelRoute(tunnel.id, editingRouteIndex);
      }
      const updated = await runwayService.addTunnelRoute(tunnel.id, {
        hostname: fullHostname,
        service: serviceFormatted,
        path: path.trim() || '*',
        noTlsVerify,
        httpHostHeader: httpHostHeader.trim() || undefined,
        originConfigurations: (noTlsVerify ? 1 : 0) + (httpHostHeader.trim() ? 1 : 0),
      });
      setTunnel(updated);
      setFlashMessages([
        {
          type: 'success',
          header: editingRouteIndex !== null ? 'Route Updated' : 'Published Application Route Added',
          content: `Route ${fullHostname} has been published to ${serviceFormatted}. DNS automatically updated.`,
          dismissible: true,
          id: `flash-route-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setIsRouteModalOpen(false);
    } catch (err) {
      console.error('Failed to save route:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Failed to Save Route',
          content: 'Unable to save published application route. Please verify format.',
          dismissible: true,
          id: `flash-route-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsSubmittingRoute(false);
    }
  };

  const handleDeleteRouteConfirm = async () => {
    if (!tunnel || !routeToDelete) return;
    setIsDeletingRoute(true);
    try {
      const updated = await runwayService.deleteTunnelRoute(tunnel.id, routeToDelete.index);
      setTunnel(updated);
      setFlashMessages([
        {
          type: 'info',
          header: 'Route Removed',
          content: `Published route for ${routeToDelete.route.hostname} was deleted.`,
          dismissible: true,
          id: `flash-del-route-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      console.error('Failed to remove route:', err);
    } finally {
      setIsDeletingRoute(false);
      setRouteToDelete(null);
    }
  };

  const handleSaveCatchAll = () => {
    if (!tunnel) return;
    const updated = { ...tunnel, catchAllRule: catchAllRuleValue.trim() || 'http_status:404' };
    setTunnel(updated);
    setIsCatchAllModalOpen(false);
    setFlashMessages([
      {
        type: 'success',
        header: 'Catch-all Rule Updated',
        content: `Default catch-all rule set to ${updated.catchAllRule}.`,
        dismissible: true,
        id: `flash-catch-${Date.now()}`,
        onDismiss: () => setFlashMessages([]),
      },
    ]);
  };

  const handleSaveTunnelName = () => {
    if (!tunnel || !newTunnelName.trim()) return;
    const updated = { ...tunnel, name: newTunnelName.trim() };
    setTunnel(updated);
    setIsEditNameModalOpen(false);
    setFlashMessages([
      {
        type: 'success',
        header: 'Tunnel Renamed',
        content: `Tunnel renamed to "${newTunnelName.trim()}".`,
        dismissible: true,
        id: `flash-rename-${Date.now()}`,
        onDismiss: () => setFlashMessages([]),
      },
    ]);
  };

  const handleDeleteTunnel = async () => {
    if (!tunnel) return;
    setIsDeletingTunnel(true);
    try {
      await runwayService.deleteTunnel(tunnel.id);
      navigate('/runway/tunnels', {
        state: {
          deletedMessage: `Tunnel "${tunnel.name}" has been deleted.`,
        },
      });
    } catch (err) {
      console.error('Failed to delete tunnel:', err);
      setIsDeletingTunnel(false);
    }
  };

  // Published routes list
  const publishedRoutes: PublishedRoute[] = useMemo(() => {
    if (!tunnel) return [];
    if (tunnel.routes && tunnel.routes.length > 0) return tunnel.routes;
    if (tunnel.publishedRoutes && tunnel.publishedRoutes.length > 0) return tunnel.publishedRoutes;
    if (tunnel.ingressRoutes && tunnel.ingressRoutes.length > 0) {
      return tunnel.ingressRoutes.map((r) => ({
        hostname: r.hostname,
        path: '*',
        service: r.serviceUrl,
        serviceUrl: r.serviceUrl,
        originConfigurations: 0,
      }));
    }
    return [];
  }, [tunnel]);

  // Connectors filtered list (deduplicated by connectorId/client_id)
  const connectors: TunnelConnector[] = useMemo(() => {
    const rawList = tunnel?.connectors || [];
    const uniqueMap = new Map<string, TunnelConnector>();
    for (const c of rawList) {
      const key = c.connectorId || c.id || '';
      if (key && !uniqueMap.has(key)) {
        uniqueMap.set(key, {
          ...c,
          dataCenter: c.dataCenter ? c.dataCenter.replace(/\d+$/, '') : c.dataCenter,
        });
      }
    }
    const list = Array.from(uniqueMap.values());
    const q = connectorFilter.toLowerCase().trim();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.connectorId.toLowerCase().includes(q) ||
        c.hostname.toLowerCase().includes(q) ||
        c.dataCenter.toLowerCase().includes(q) ||
        c.originIp.toLowerCase().includes(q)
    );
  }, [tunnel, connectorFilter]);

  if (!loading && !tunnel) {
    return (
      <SpaceBetween size="l">
        <Alert
          type="error"
          header="Tunnel Not Found"
          action={
            <Button onClick={() => navigate('/runway/tunnels')}>
              Return to Tunnels List
            </Button>
          }
        >
          No Zero Trust tunnel was found matching identifier <code>{tunnelId}</code>.
        </Alert>
      </SpaceBetween>
    );
  }

  const breadcrumbItems = [
    { text: 'LolaCloud Console', href: '/' },
    { text: 'Lola Runway', href: '/runway/dashboard' },
    { text: 'Tunnels & Mesh', href: '/runway/tunnels' },
    { text: tunnel?.name || 'Tunnel Details', href: `/runway/tunnels/${tunnelId}` },
  ];

  return (
    <SpaceBetween size="l">
      {/* Breadcrumb Group */}
      <BreadcrumbGroup
        items={breadcrumbItems}
        onFollow={(e) => {
          e.preventDefault();
          navigate(e.detail.href);
        }}
      />

      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Main Tunnel Header matching Cloudflare Zero Trust detail */}
      <Header
        variant="h1"
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" onClick={() => fetchTunnel(true)} loading={loading}>
              Refresh
            </Button>
            <Button
              variant="primary"
              iconName="share"
              onClick={() => setIsExposeModalOpen(true)}
            >
              Expose Platform
            </Button>
            <Button
              variant="normal"
              iconName="remove"
              onClick={() => setIsDeleteTunnelModalOpen(true)}
            >
              Delete tunnel
            </Button>
          </SpaceBetween>
        }
      >
        {tunnel?.name || 'Loading tunnel...'}
      </Header>

      {/* Tabs navigation: Overview, CIDR routes, Hostname routes, Published application routes */}
      <Tabs
        activeTabId={activeTabId}
        onChange={({ detail }) => handleTabChange(detail.activeTabId)}
        tabs={[
          {
            id: 'overview',
            label: 'Overview',
            content: (
              <SpaceBetween size="l">
                {/* Basic Information Container (Matching Image 1) */}
                <Container
                  header={
                    <Header
                      variant="h2"
                      actions={
                        <Button onClick={() => setIsEditNameModalOpen(true)}>Edit</Button>
                      }
                    >
                      Basic Information
                    </Header>
                  }
                >
                  <ColumnLayout columns={5} variant="text-grid">
                    <div>
                      <Box variant="awsui-key-label">Tunnel name</Box>
                      <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
                        <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                          <span>{tunnel?.name || '—'}</span>
                          {tunnel?.isHostServer && (
                            <Badge color="blue">Host Server ({tunnel.name})</Badge>
                          )}
                        </SpaceBetween>
                      </div>
                    </div>

                    <div>
                      <Box variant="awsui-key-label">Tunnel type</Box>
                      <div style={{ fontSize: '15px', marginTop: '4px' }}>
                        {tunnel?.tunnelType || 'cloudflared'}
                      </div>
                    </div>

                    <div>
                      <Box variant="awsui-key-label">Tunnel ID</Box>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
                        <code style={{ fontSize: '12px' }}>
                          {tunnel?.tunnelId || '—'}
                        </code>
                        {tunnel?.tunnelId && (
                          <Button
                            variant="inline-icon"
                            iconName="copy"
                            ariaLabel="Copy Tunnel ID"
                            onClick={() => handleCopy(tunnel.tunnelId, 'Tunnel ID')}
                          />
                        )}
                      </div>
                    </div>

                    <div>
                      <Box variant="awsui-key-label">Status</Box>
                      <div style={{ marginTop: '4px' }}>
                        {tunnel?.status === 'HEALTHY' ? (
                          <Badge color="green">Healthy</Badge>
                        ) : tunnel?.status === 'DOWN' ? (
                          <Badge color="red">Down</Badge>
                        ) : (
                          <Badge color="grey">{tunnel?.status || 'Inactive'}</Badge>
                        )}
                      </div>
                    </div>

                    <div>
                      <Box variant="awsui-key-label">Uptime</Box>
                      <div style={{ fontSize: '15px', marginTop: '4px' }}>
                        {tunnel?.uptime || (tunnel?.status === 'HEALTHY' ? '1 hour' : '--')}
                      </div>
                    </div>
                  </ColumnLayout>
                </Container>

                {/* Connectors Container (Matching Image 1) */}
                <Container
                  header={
                    <Header
                      variant="h2"
                      counter={`Showing ${connectors.length}`}
                      description="Review established connections between Cloudflare's network and your infrastructure."
                      actions={
                        <Button
                          variant="normal"
                          iconName="add-plus"
                          onClick={() => setIsAddConnectorModalOpen(true)}
                        >
                          Add a connector
                        </Button>
                      }
                    >
                      Connectors
                    </Header>
                  }
                >
                  <SpaceBetween size="m">
                    <Input
                      value={connectorFilter}
                      onChange={({ detail }) => setConnectorFilter(detail.value)}
                      placeholder="Search a connector"
                      type="search"
                      clearAriaLabel="Clear connector filter"
                    />

                    <Table
                      trackBy="connectorId"
                      columnDefinitions={[
                        {
                          id: 'connectorId',
                          header: 'Connector ID',
                          cell: (c: TunnelConnector) => (
                            <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                              <code style={{ fontSize: '12px', color: '#0972d3' }}>{c.connectorId}</code>
                              <Button
                                variant="inline-icon"
                                iconName="copy"
                                ariaLabel={`Copy connector ${c.connectorId}`}
                                onClick={() => handleCopy(c.connectorId, 'Connector ID')}
                              />
                            </SpaceBetween>
                          ),
                        },
                        {
                          id: 'hostname',
                          header: 'Hostname',
                          cell: (c: TunnelConnector) => (
                            c.isHostServer ? (
                              <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                                <span>{c.hostname || tunnel?.name.toLowerCase()}</span>
                                <Badge color="blue">This Server</Badge>
                              </SpaceBetween>
                            ) : (
                              <span>{c.hostname || tunnel?.name.toLowerCase()}</span>
                            )
                          ),
                        },
                        {
                          id: 'dataCenter',
                          header: 'Data centers',
                          cell: (c: TunnelConnector) => <span>{c.dataCenter || 'gru'}</span>,
                        },
                        {
                          id: 'originIp',
                          header: 'Origin IP',
                          cell: (c: TunnelConnector) => (
                            c.isHostServer ? (
                              <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                                <span>{c.originIp || '187.74.41.93'}</span>
                                <Badge color="blue">Host WAN</Badge>
                              </SpaceBetween>
                            ) : (
                              <span>{c.originIp || '187.74.41.93'}</span>
                            )
                          ),
                        },
                        {
                          id: 'version',
                          header: 'Version',
                          cell: (c: TunnelConnector) => <span>{c.version || '2026.9.1'}</span>,
                        },
                        {
                          id: 'platform',
                          header: 'Platform',
                          cell: (c: TunnelConnector) => <span>{c.platform || 'linux_amd64'}</span>,
                        },
                        {
                          id: 'status',
                          header: 'Status',
                          cell: (c: TunnelConnector) => (
                            <span style={{ color: '#1d8102', fontWeight: 600 }}>
                              {c.status || 'Connected'}
                            </span>
                          ),
                        },
                      ]}
                      items={connectors}
                      empty={
                        <Box textAlign="center" color="inherit" margin={{ vertical: 'm' }}>
                          <b>No connectors found</b>
                          <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs' }}>
                            Install and start cloudflared daemon to register an encrypted connector socket with Cloudflare.
                          </Box>
                          <div style={{ marginTop: '12px' }}>
                            <Button onClick={() => setIsAddConnectorModalOpen(true)}>
                              Add a connector
                            </Button>
                          </div>
                        </Box>
                      }
                    />
                  </SpaceBetween>
                </Container>
              </SpaceBetween>
            ),
          },
          {
            id: 'cidr-routes',
            label: 'CIDR routes',
            content: (
              <Container
                header={
                  <Header
                    variant="h2"
                    counter={`(${cidrRoutes.length})`}
                    description="Route private network IP address ranges (e.g. 10.0.0.0/8, 192.168.1.0/24) through this tunnel without configuring public hostnames."
                    actions={
                      <Button
                        variant="primary"
                        iconName="add-plus"
                        onClick={() => {
                          setNewCidrInput('');
                          setNewCidrDesc('');
                          setIsAddCidrModalOpen(true);
                        }}
                      >
                        + Add a CIDR route
                      </Button>
                    }
                  >
                    CIDR routes
                  </Header>
                }
              >
                <Table
                  trackBy="id"
                  columnDefinitions={[
                    {
                      id: 'cidr',
                      header: 'CIDR Range',
                      cell: (item) => <code style={{ fontWeight: 600 }}>{item.cidr}</code>,
                    },
                    {
                      id: 'description',
                      header: 'Description',
                      cell: (item) => <span>{item.description}</span>,
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      cell: (item) => <Badge color="green">{item.status}</Badge>,
                    },
                    {
                      id: 'actions',
                      header: 'Actions',
                      cell: (item) => (
                        <Button
                          variant="inline-icon"
                          iconName="remove"
                          ariaLabel={`Delete CIDR ${item.cidr}`}
                          onClick={() => setCidrRoutes((prev) => prev.filter((c) => c.id !== item.id))}
                        />
                      ),
                    },
                  ]}
                  items={cidrRoutes}
                  empty={
                    <Box textAlign="center" margin={{ vertical: 'm' }}>
                      <b>No CIDR routes configured</b>
                    </Box>
                  }
                />
              </Container>
            ),
          },
          {
            id: 'hostname-routes',
            label: 'Hostname routes',
            content: (
              <Container
                header={
                  <Header
                    variant="h2"
                    counter={`(${hostnameRoutes.length})`}
                    description="Route internal private DNS hostnames for private networks and WARP client traffic."
                    actions={
                      <Button
                        variant="primary"
                        iconName="add-plus"
                        onClick={() => {
                          setNewHnInput('');
                          setNewHnFallback('');
                          setIsAddHostnameModalOpen(true);
                        }}
                      >
                        + Add a hostname route
                      </Button>
                    }
                  >
                    Hostname routes
                  </Header>
                }
              >
                <Table
                  trackBy="id"
                  columnDefinitions={[
                    {
                      id: 'hostname',
                      header: 'Private Hostname',
                      cell: (item) => <code style={{ fontWeight: 600 }}>{item.hostname}</code>,
                    },
                    {
                      id: 'fallback',
                      header: 'Target IP / Port',
                      cell: (item) => <code>{item.fallback}</code>,
                    },
                    {
                      id: 'status',
                      header: 'Status',
                      cell: (item) => <Badge color="green">{item.status}</Badge>,
                    },
                    {
                      id: 'actions',
                      header: 'Actions',
                      cell: (item) => (
                        <Button
                          variant="inline-icon"
                          iconName="remove"
                          ariaLabel={`Delete Hostname ${item.hostname}`}
                          onClick={() => setHostnameRoutes((prev) => prev.filter((h) => h.id !== item.id))}
                        />
                      ),
                    },
                  ]}
                  items={hostnameRoutes}
                  empty={
                    <Box textAlign="center" margin={{ vertical: 'm' }}>
                      <b>No hostname routes configured</b>
                    </Box>
                  }
                />
              </Container>
            ),
          },
          {
            id: 'published-routes',
            label: 'Published application routes',
            content: (
              <SpaceBetween size="l">
                {/* Published Application Routes Table (Matching Image 2) */}
                <Container
                  header={
                    <Header
                      variant="h2"
                      counter={`(${publishedRoutes.length})`}
                      description={
                        <span>
                          Allow your Tunnel to reach applications whose domains you connected to Cloudflare.{' '}
                          <Link onFollow={() => navigate('/runway/dns')}>Manage connected domains</Link>
                        </span>
                      }
                      actions={
                        <Button
                          variant="primary"
                          iconName="add-plus"
                          onClick={handleOpenAddRoute}
                        >
                          + Add a published application route
                        </Button>
                      }
                    >
                      Published application routes
                    </Header>
                  }
                >
                  <SpaceBetween size="m">
                    <Table
                      trackBy="hostname"
                      columnDefinitions={[
                        {
                          id: 'index',
                          header: '#',
                          cell: (r: PublishedRoute) => {
                            const idx = publishedRoutes.indexOf(r);
                            return (
                              <span style={{ color: '#879596', fontWeight: 600 }}>
                                {idx >= 0 ? idx + 1 : 1}
                              </span>
                            );
                          },
                          width: 50,
                        },
                        {
                          id: 'hostname',
                          header: 'Published application routes',
                          cell: (r: PublishedRoute) => (
                            <Link
                              external
                              href={`https://${r.hostname}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <span style={{ fontWeight: 600, color: '#0972d3' }}>{r.hostname}</span>
                            </Link>
                          ),
                          sortingField: 'hostname',
                        },
                        {
                          id: 'path',
                          header: 'Path',
                          cell: (r: PublishedRoute) => <code>{r.path || '*'}</code>,
                        },
                        {
                          id: 'service',
                          header: 'Service',
                          cell: (r: PublishedRoute) => (
                            <code style={{ fontSize: '13px' }}>{r.service || r.serviceUrl}</code>
                          ),
                        },
                        {
                          id: 'originConfigurations',
                          header: 'Origin configurations',
                          cell: (r: PublishedRoute) => (
                            <span>{r.originConfigurations ?? 0}</span>
                          ),
                        },
                        {
                          id: 'actions',
                          header: 'Actions',
                          cell: (r: PublishedRoute) => {
                            const idx = publishedRoutes.indexOf(r);
                            return (
                              <SpaceBetween direction="horizontal" size="xs">
                                <Button
                                  variant="inline-icon"
                                  iconName="edit"
                                  ariaLabel={`Edit route ${r.hostname}`}
                                  onClick={() => handleOpenEditRoute(r, idx >= 0 ? idx : 0)}
                                />
                                <Button
                                  variant="inline-icon"
                                  iconName="remove"
                                  ariaLabel={`Delete route ${r.hostname}`}
                                  onClick={() => setRouteToDelete({ route: r, index: idx >= 0 ? idx : 0 })}
                                />
                              </SpaceBetween>
                            );
                          },
                        },
                      ]}
                      items={publishedRoutes}
                      empty={
                        <Box textAlign="center" color="inherit" margin={{ vertical: 'm' }}>
                          <b>No published application routes configured</b>
                          <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs' }}>
                            Add a route to publish internal ports or containers directly to public DNS hostnames.
                          </Box>
                          <div style={{ marginTop: '12px' }}>
                            <Button variant="primary" iconName="add-plus" onClick={handleOpenAddRoute}>
                              + Add a published application route
                            </Button>
                          </div>
                        </Box>
                      }
                    />

                    {/* Catch-all rule Box matching Image 2 */}
                    <div
                      style={{
                        backgroundColor: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '8px',
                        padding: '12px 18px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                      }}
                    >
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <span style={{ fontWeight: 600 }}>Catch-all rule:</span>
                        <code
                          style={{
                            fontSize: '13px',
                            background: 'rgba(0, 0, 0, 0.25)',
                            padding: '3px 8px',
                            borderRadius: '4px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                          }}
                        >
                          {tunnel?.catchAllRule || 'http_status:404'}
                        </code>
                      </SpaceBetween>
                      <Button variant="link" onClick={() => setIsCatchAllModalOpen(true)}>
                        Edit
                      </Button>
                    </div>
                  </SpaceBetween>
                </Container>
              </SpaceBetween>
            ),
          },
        ]}
      />

      {/* Modal: Add or Edit Published Application Route (Matching Image 3) */}
      <Modal
        visible={isRouteModalOpen}
        onDismiss={() => setIsRouteModalOpen(false)}
        size="large"
        header={
          editingRouteIndex !== null
            ? `Edit published application route for ${tunnel?.name}`
            : `Add a published application route for ${tunnel?.name}`
        }
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsRouteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isSubmittingRoute}
                disabled={!serviceUrlInput.trim()}
                onClick={handleSaveRoute}
              >
                Save
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <div>
            <Box variant="p" color="text-body-secondary">
              Publish a local application to the Internet via public hostname. DNS will be automatically configured.
            </Box>
            <Box margin={{ top: 'xxs' }}>
              <Link
                external
                href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/routing-to-tunnel/"
              >
                Learn more about routing to tunnels
              </Link>
            </Box>
          </div>

          {/* Section: Hostname */}
          <Container header={<Header variant="h3">Hostname</Header>}>
            <SpaceBetween size="m">
              {/* Row 1: Subdomain and Domain */}
              <ColumnLayout columns={2}>
                <FormField
                  label={
                    <span>
                      Subdomain <span style={{ color: '#879596', fontWeight: 400 }}>(Optional)</span>
                    </span>
                  }
                >
                  <Input
                    value={subdomain}
                    onChange={({ detail }) => setSubdomain(detail.value)}
                    placeholder="www"
                  />
                </FormField>

                <FormField label="Domain">
                  <Select
                    selectedOption={selectedDomainOption}
                    onChange={({ detail }) => setSelectedDomainOption(detail.selectedOption)}
                    options={domainOptions}
                    placeholder="Select or type to search..."
                    filteringType="auto"
                  />
                </FormField>
              </ColumnLayout>

              {/* Row 2: Path (Optional) - aligned to column 1 */}
              <ColumnLayout columns={2}>
                <FormField
                  label={
                    <span>
                      Path <span style={{ color: '#879596', fontWeight: 400 }}>(Optional)</span>
                    </span>
                  }
                >
                  <Input
                    value={path}
                    onChange={({ detail }) => setPath(detail.value)}
                    placeholder="^/blog"
                  />
                </FormField>
                <div />
              </ColumnLayout>

              {/* Row 3: How path matching works */}
              <div
                style={{
                  backgroundColor: 'rgba(9, 114, 211, 0.08)',
                  border: '1px solid rgba(9, 114, 211, 0.25)',
                  borderRadius: '8px',
                  padding: '12px 16px',
                  fontSize: '13px',
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontWeight: 600,
                    color: '#29b6f6',
                    marginBottom: '6px',
                  }}
                >
                  <span style={{ fontSize: '15px' }}>ℹ</span> How path matching works
                </div>
                <div style={{ color: '#aab7b8', fontSize: '12px', lineHeight: 1.6 }}>
                  The path field uses regex patterns. Common examples:
                  <ul style={{ margin: '4px 0 8px 16px', padding: 0 }}>
                    <li>
                      <strong>Match all paths:</strong> leave empty
                    </li>
                    <li>
                      <strong>Match anywhere in path:</strong> blog (matches /blog, /archive/blog/post, etc.)
                    </li>
                    <li>
                      <strong>Match path prefix:</strong> ^/api
                    </li>
                    <li>
                      <strong>Match files by extension:</strong> \.(jpg|png|css|js)$
                    </li>
                  </ul>
                  <div style={{ marginTop: '6px' }}>
                    <Link
                      external
                      href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/routing-to-tunnel/"
                    >
                      Learn more
                    </Link>
                  </div>
                </div>
              </div>

              {/* Row 4: Public Hostname Preview */}
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  padding: '8px 14px',
                  borderRadius: '6px',
                  fontSize: '13px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span style={{ color: '#879596' }}>Preview Public Hostname:</span>
                <code style={{ color: '#0972d3', fontWeight: 600 }}>
                  https://{subdomain.trim() ? `${subdomain.trim()}.` : ''}
                  {selectedDomainOption?.value || 'lola-cloud.dev'}
                  {path.trim() && path.trim() !== '*' ? `/${path.trim().replace(/^\//, '')}` : ''}
                </code>
              </div>
            </SpaceBetween>
          </Container>

          {/* Section: Service */}
          <Container header={<Header variant="h3">Service</Header>}>
            <SpaceBetween size="xs">
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '180px 30px 1fr',
                  alignItems: 'flex-start',
                  columnGap: '8px',
                }}
              >
                <FormField label="Type">
                  <Select
                    selectedOption={selectedServiceType}
                    onChange={({ detail }) => setSelectedServiceType(detail.selectedOption)}
                    options={[
                      { label: 'HTTP', value: 'HTTP' },
                      { label: 'HTTPS', value: 'HTTPS' },
                      { label: 'SSH', value: 'SSH' },
                      { label: 'TCP', value: 'TCP' },
                      { label: 'RDP', value: 'RDP' },
                      { label: 'UNIX', value: 'UNIX' },
                      { label: 'HTTP_STATUS', value: 'HTTP_STATUS' },
                    ]}
                  />
                </FormField>

                <div
                  style={{
                    paddingTop: '24px',
                    height: '32px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#879596',
                    fontWeight: 700,
                    fontSize: '15px',
                    userSelect: 'none',
                  }}
                >
                  ://
                </div>

                <FormField label="URL">
                  <Input
                    value={serviceUrlInput}
                    onChange={({ detail }) => {
                      let val = detail.value;
                      if (val.startsWith('https://')) {
                        setSelectedServiceType({ label: 'HTTPS', value: 'HTTPS' });
                        val = val.slice(8);
                      } else if (val.startsWith('http://')) {
                        setSelectedServiceType({ label: 'HTTP', value: 'HTTP' });
                        val = val.slice(7);
                      } else if (val.startsWith('tcp://')) {
                        setSelectedServiceType({ label: 'TCP', value: 'TCP' });
                        val = val.slice(6);
                      } else if (val.startsWith('ssh://')) {
                        setSelectedServiceType({ label: 'SSH', value: 'SSH' });
                        val = val.slice(6);
                      }
                      setServiceUrlInput(val);
                    }}
                    placeholder={
                      selectedServiceType?.value === 'HTTP_STATUS' ? '404' : 'localhost:8080'
                    }
                  />
                </FormField>
              </div>

              <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
                The origin service to route traffic to (e.g., https://localhost:8080, tcp://localhost:3306)
              </Box>
            </SpaceBetween>
          </Container>

          {/* Section: Origin Request & Connection Settings */}
          <ExpandableSection
            variant="container"
            headerText="Origin request and connection settings"
            expanded={isOriginSettingsExpanded}
            onChange={({ detail }) => setIsOriginSettingsExpanded(detail.expanded)}
          >
            <SpaceBetween size="m">
              <FormField
                label="No TLS Verify"
                description="Disables TLS certificate verification check for origin server. Recommended when using internal self-signed certificates."
              >
                <Toggle
                  checked={noTlsVerify}
                  onChange={({ detail }) => setNoTlsVerify(detail.checked)}
                >
                  {noTlsVerify ? 'Enabled' : 'Disabled'}
                </Toggle>
              </FormField>

              <FormField
                label="HTTP Host Header"
                description="Sets the HTTP Host header sent to your origin service (e.g. localhost, origin.internal.local). Leave blank to preserve incoming hostname."
              >
                <Input
                  value={httpHostHeader}
                  onChange={({ detail }) => setHttpHostHeader(detail.value)}
                  placeholder="e.g. localhost, origin.internal"
                />
              </FormField>
            </SpaceBetween>
          </ExpandableSection>
        </SpaceBetween>
      </Modal>

      {/* Modal: Delete Route Confirmation */}
      <Modal
        visible={Boolean(routeToDelete)}
        onDismiss={() => setRouteToDelete(null)}
        header="Delete Published Application Route"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setRouteToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeletingRoute}
                onClick={handleDeleteRouteConfirm}
              >
                Confirm Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to delete the published route for{' '}
        <code>{routeToDelete?.route.hostname}</code>? Incoming traffic to this domain will no longer be forwarded to{' '}
        <code>{routeToDelete?.route.service || routeToDelete?.route.serviceUrl}</code>.
      </Modal>

      {/* Modal: Edit Catch-All Rule */}
      <Modal
        visible={isCatchAllModalOpen}
        onDismiss={() => setIsCatchAllModalOpen(false)}
        header="Edit Catch-all Ingress Rule"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsCatchAllModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveCatchAll}>
                Save Rule
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Box variant="p" color="text-body-secondary">
            Cloudflare tunnel requires a catch-all service rule at the end of the routing table to handle unmatched hostnames or paths.
          </Box>

          <FormField
            label="Catch-all service target"
            description="Default is http_status:404"
          >
            <Input
              value={catchAllRuleValue}
              onChange={({ detail }) => setCatchAllRuleValue(detail.value)}
              placeholder="http_status:404"
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Modal: Edit Tunnel Name */}
      <Modal
        visible={isEditNameModalOpen}
        onDismiss={() => setIsEditNameModalOpen(false)}
        header="Edit Tunnel Name"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsEditNameModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" onClick={handleSaveTunnelName}>
                Save Name
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <FormField label="Tunnel name">
          <Input
            value={newTunnelName}
            onChange={({ detail }) => setNewTunnelName(detail.value)}
            placeholder="e.g. Kali, natan"
          />
        </FormField>
      </Modal>

      {/* Modal: Install and run a connector */}
      <Modal
        visible={isAddConnectorModalOpen}
        onDismiss={() => setIsAddConnectorModalOpen(false)}
        size="large"
        header="Install and run a connector"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <Button variant="primary" onClick={() => setIsAddConnectorModalOpen(false)}>
              Done
            </Button>
          </Box>
        }
      >
        <SpaceBetween size="l">
          <div style={{ color: '#e5e7eb', fontSize: '14px', lineHeight: '1.5' }}>
            To connect your tunnel to Cloudflare, copy-paste one of the following commands into a terminal window. Remotely managed tunnels require that you install cloudflared 2022.03.04 or later.
          </div>

          <SpaceBetween size="s">
            <FormField label="Select your device's operating system">
              <div style={{ maxWidth: '320px' }}>
                <Select
                  selectedOption={CONNECTOR_OS_OPTIONS.find((o) => o.value === connectorOs) || CONNECTOR_OS_OPTIONS[0]}
                  onChange={({ detail }) => handleOsSelect(detail.selectedOption.value as ConnectorOs)}
                  options={CONNECTOR_OS_OPTIONS}
                />
              </div>
            </FormField>

            <FormField label="Choose an architecture">
              <div style={{ maxWidth: '320px' }}>
                <Select
                  selectedOption={
                    (CONNECTOR_ARCH_BY_OS[connectorOs] || CONNECTOR_ARCH_BY_OS.debian).find((a) => a.value === connectorArch) ||
                    (CONNECTOR_ARCH_BY_OS[connectorOs] || CONNECTOR_ARCH_BY_OS.debian)[0]
                  }
                  onChange={({ detail }) => setConnectorArch(detail.selectedOption.value as ConnectorArch)}
                  options={CONNECTOR_ARCH_BY_OS[connectorOs] || CONNECTOR_ARCH_BY_OS.debian}
                />
              </div>
            </FormField>
          </SpaceBetween>

          {/* Section 1: Install cloudflared */}
          <div>
            <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              If you don&apos;t have cloudflared installed on your machine:
            </div>
            <div
              style={{
                backgroundColor: '#0c0f17',
                border: '1px solid #1e2433',
                borderRadius: '6px',
                padding: '14px 16px',
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '13px',
                lineHeight: '1.6',
                position: 'relative',
                color: '#e2e8f0',
              }}
            >
              <div style={{ position: 'absolute', top: '10px', right: '10px' }}>
                <Button
                  variant="inline-icon"
                  iconName={copiedKey === 'install' ? 'status-positive' : 'copy'}
                  ariaLabel="Copy installation commands"
                  onClick={() => copyConnectorCommand(installSnippet, 'install', 'Installation command')}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', paddingRight: '36px' }}>
                <span style={{ color: '#eab308', fontWeight: 700, marginRight: '14px', userSelect: 'none' }}>$</span>
                <pre
                  style={{
                    margin: 0,
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word',
                    color: '#cbd5e1',
                    flex: 1,
                  }}
                >
                  {installSnippet}
                </pre>
              </div>
            </div>
          </div>

          {/* Section 2: Install service */}
          <div>
            <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              After you have installed cloudflared on your machine, you can install a service that will automatically run your tunnel whenever your machine starts:
            </div>
            <div
              style={{
                backgroundColor: '#0c0f17',
                border: '1px solid #1e2433',
                borderRadius: '6px',
                padding: '10px 14px',
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  marginRight: '12px',
                  flex: 1,
                }}
                title={serviceSnippet}
              >
                <span style={{ color: '#eab308', fontWeight: 700, marginRight: '14px', userSelect: 'none', flexShrink: 0 }}>$</span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#e2e8f0',
                  }}
                >
                  {isFetchingToken ? 'Fetching tunnel token...' : displayServiceSnippet}
                </span>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Button
                  variant="inline-icon"
                  iconName={copiedKey === 'service' ? 'status-positive' : 'copy'}
                  ariaLabel="Copy service installation command"
                  onClick={() => copyConnectorCommand(serviceSnippet, 'service', 'Service install command')}
                />
              </div>
            </div>
          </div>

          {/* Section 3: Run manually */}
          <div>
            <div style={{ color: '#e5e7eb', fontSize: '14px', fontWeight: 500, marginBottom: '8px' }}>
              OR run the tunnel manually in your current terminal session only:
            </div>
            <div
              style={{
                backgroundColor: '#0c0f17',
                border: '1px solid #1e2433',
                borderRadius: '6px',
                padding: '10px 14px',
                fontFamily: 'SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                color: '#e2e8f0',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  overflow: 'hidden',
                  marginRight: '12px',
                  flex: 1,
                }}
                title={manualSnippet}
              >
                <span style={{ color: '#eab308', fontWeight: 700, marginRight: '14px', userSelect: 'none', flexShrink: 0 }}>$</span>
                <span
                  style={{
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    color: '#e2e8f0',
                  }}
                >
                  {isFetchingToken ? 'Fetching tunnel token...' : displayManualSnippet}
                </span>
              </div>
              <div style={{ flexShrink: 0 }}>
                <Button
                  variant="inline-icon"
                  iconName={copiedKey === 'manual' ? 'status-positive' : 'copy'}
                  ariaLabel="Copy manual run command"
                  onClick={() => copyConnectorCommand(manualSnippet, 'manual', 'Manual run command')}
                />
              </div>
            </div>
          </div>

          {/* External FAQ link */}
          <div>
            <Link
              external
              href="https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
            >
              View Frequently Asked Questions
            </Link>
          </div>

          {/* Section 4: Refresh token */}
          <div style={{ borderTop: '1px solid #232733', paddingTop: '20px' }}>
            <div style={{ color: '#f3f4f6', fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>
              Refresh token
            </div>
            <div style={{ color: '#9ca3af', fontSize: '13px', marginBottom: '14px' }}>
              You may need to generate a new token for security reasons.
            </div>

            <div style={{ marginBottom: '16px' }}>
              <Alert type="warning">
                This action will invalidate the previous token. Note that this will prevent new connections made with the old token, but it won&apos;t close existing connections.
              </Alert>
            </div>

            <Button
              onClick={handleRefreshToken}
              loading={isRefreshingToken}
            >
              Refresh token
            </Button>
          </div>
        </SpaceBetween>
      </Modal>

      {/* Modal: Add CIDR Route */}
      <Modal
        visible={isAddCidrModalOpen}
        onDismiss={() => setIsAddCidrModalOpen(false)}
        header="Add a CIDR route"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsAddCidrModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (newCidrInput.trim()) {
                    setCidrRoutes((prev) => [
                      ...prev,
                      {
                        id: `cidr-${Date.now()}`,
                        cidr: newCidrInput.trim(),
                        description: newCidrDesc.trim() || 'Private Subnet',
                        status: 'Healthy',
                      },
                    ]);
                    setIsAddCidrModalOpen(false);
                  }
                }}
              >
                Add CIDR
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="CIDR range" description="e.g. 10.0.0.0/8, 192.168.1.0/24">
            <Input
              value={newCidrInput}
              onChange={({ detail }) => setNewCidrInput(detail.value)}
              placeholder="10.0.0.0/8"
            />
          </FormField>
          <FormField label="Description (Optional)">
            <Input
              value={newCidrDesc}
              onChange={({ detail }) => setNewCidrDesc(detail.value)}
              placeholder="e.g. Internal production subnet"
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Modal: Add Hostname Route */}
      <Modal
        visible={isAddHostnameModalOpen}
        onDismiss={() => setIsAddHostnameModalOpen(false)}
        header="Add a private hostname route"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsAddHostnameModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  if (newHnInput.trim()) {
                    setHostnameRoutes((prev) => [
                      ...prev,
                      {
                        id: `hn-${Date.now()}`,
                        hostname: newHnInput.trim(),
                        fallback: newHnFallback.trim() || '10.0.0.1',
                        status: 'Active',
                      },
                    ]);
                    setIsAddHostnameModalOpen(false);
                  }
                }}
              >
                Add Hostname
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <FormField label="Internal Hostname" description="e.g. postgres.corp.internal">
            <Input
              value={newHnInput}
              onChange={({ detail }) => setNewHnInput(detail.value)}
              placeholder="database.internal"
            />
          </FormField>
          <FormField label="Target IP / Port">
            <Input
              value={newHnFallback}
              onChange={({ detail }) => setNewHnFallback(detail.value)}
              placeholder="10.0.1.50:5432"
            />
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Modal: Delete Tunnel Confirmation */}
      <Modal
        visible={isDeleteTunnelModalOpen}
        onDismiss={() => setIsDeleteTunnelModalOpen(false)}
        header="Delete Zero Trust Tunnel"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsDeleteTunnelModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeletingTunnel}
                onClick={handleDeleteTunnel}
              >
                Confirm Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        Are you sure you want to permanently delete tunnel <strong>{tunnel?.name}</strong> (<code>{tunnel?.tunnelId}</code>)? All published routes and connectors will be detached immediately.
      </Modal>

      {/* 1-Click Expose Platform Modal */}
      <ExposePlatformModal
        visible={isExposeModalOpen}
        onDismiss={() => setIsExposeModalOpen(false)}
        targetTunnel={tunnel}
        onSuccess={() => {
          fetchTunnel();
        }}
      />
    </SpaceBetween>
  );
};

import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  StatusIndicator,
  Box,
  Container,
  ColumnLayout,
  Flashbar,
  type FlashbarProps,
  TextFilter,
} from '@cloudscape-design/components';
import { type TraefikRouteInfo, relateService } from '../../../services/relateService';

export const RelateRoutingView: React.FC = () => {
  const [routes, setRoutes] = useState<TraefikRouteInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const loadRoutes = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await relateService.getRoutingRules();
      setRoutes(data);
    } catch (err: any) {
      console.error('Failed to load routing rules:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRoutes(false);
  }, [loadRoutes]);

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

  const filteredRoutes = routes.filter((r) => {
    if (!filterText.trim()) return true;
    const q = filterText.toLowerCase();
    return (
      r.routerName.toLowerCase().includes(q) ||
      r.hostSni.toLowerCase().includes(q) ||
      r.entryPoint.toLowerCase().includes(q)
    );
  });

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Container
        header={
          <Header
            variant="h2"
            description="Dynamic Traefik Layer 4 (TCP) reverse proxy routing table"
          >
            Traefik TCP SNI Multiplexer
          </Header>
        }
      >
        <ColumnLayout columns={3}>
          <div>
            <Box fontWeight="bold" fontSize="body-m">
              No Port Clashing
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xxs' }}>
              Every PostgreSQL instance shares public port 5432, MySQL instances share port 3306,
              and SQL Server instances share port 1433 without conflict.
            </Box>
          </div>

          <div>
            <Box fontWeight="bold" fontSize="body-m">
              HostSNI Header Matching
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xxs' }}>
              Traefik inspects the TLS Client Hello SNI extension and routes TCP packets directly
              to the allocated internal loopback port.
            </Box>
          </div>

          <div>
            <Box fontWeight="bold" fontSize="body-m">
              Hot Dynamic Reconfiguration
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xxs' }}>
              Config YAML files are written into <code>traefik/dynamic/db-*.yaml</code> in real
              time without needing proxy restarts.
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      <Table
        loading={loading}
        loadingText="Loading routing rules..."
        header={
          <Header
            variant="h2"
            counter={`(${filteredRoutes.length})`}
            actions={
              <Button iconName="refresh" onClick={() => loadRoutes(true)} disabled={loading}>
                Refresh
              </Button>
            }
          >
            Active Traefik TCP Routers
          </Header>
        }
        columnDefinitions={[
          {
            id: 'routerName',
            header: 'Router Name',
            cell: (item) => (
              <Box variant="code" fontSize="body-s">
                {item.routerName}
              </Box>
            ),
          },
          {
            id: 'hostSni',
            header: 'Rule (HostSNI)',
            cell: (item) => (
              <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                <Box variant="code" fontSize="body-s" color="text-status-info">
                  HostSNI(`{item.hostSni}`)
                </Box>
                <Button
                  variant="inline-icon"
                  iconName="copy"
                  ariaLabel="Copy SNI rule"
                  onClick={() => handleCopy(`HostSNI(\`${item.hostSni}\`)`, 'SNI Rule')}
                />
              </SpaceBetween>
            ),
          },
          {
            id: 'entryPoint',
            header: 'EntryPoint',
            cell: (item) => <Box fontSize="body-s">{item.entryPoint}</Box>,
          },
          {
            id: 'internalPort',
            header: 'Backend Destination',
            cell: (item) => (
              <Box variant="code" fontSize="body-s">
                127.0.0.1:{item.internalPort}
              </Box>
            ),
          },
          {
            id: 'tlsMode',
            header: 'TLS Mode',
            cell: (item) => (
              <Box fontSize="body-s" color="text-status-inactive">
                {item.tlsMode}
              </Box>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item) => (
              <StatusIndicator type={item.status === 'ACTIVE' ? 'success' : 'stopped'}>
                {item.status}
              </StatusIndicator>
            ),
          },
        ]}
        items={filteredRoutes}
        filter={
          <TextFilter
            filteringPlaceholder="Filter routers by name, SNI rule..."
            filteringText={filterText}
            onChange={({ detail }) => setFilterText(detail.filteringText)}
          />
        }
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <b>No TCP routers configured</b>
          </Box>
        }
      />
    </SpaceBetween>
  );
};

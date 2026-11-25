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
  type DatabaseInstance,
  type RelateStatusResponse,
  relateService,
} from '../../../services/relateService';
import { EngineBadge } from '../components/EngineBadge';

interface RelateDashboardViewProps {
  onNavigateToFleet?: () => void;
}

export const RelateDashboardView: React.FC<RelateDashboardViewProps> = () => {
  const navigate = useNavigate();

  const [status, setStatus] = useState<RelateStatusResponse | null>(null);
  const [instances, setInstances] = useState<DatabaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const loadData = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const [statusRes, instsRes] = await Promise.all([
        relateService.getRelateStatus(),
        relateService.getInstances(),
      ]);
      setStatus(statusRes);
      setInstances(instsRes);
    } catch (err: any) {
      console.error('Failed to load Relate dashboard data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const totalStorage = instances.reduce((acc, curr) => acc + (curr.storageGb || 0), 0);
  const runningCount = instances.filter((i) => i.status === 'RUNNING').length;

  const pgCount = instances.filter((i) => i.engine === 'POSTGRESQL').length;
  const mysqlCount = instances.filter((i) => i.engine === 'MYSQL').length;
  const sqlserverCount = instances.filter((i) => i.engine === 'SQLSERVER').length;

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

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Main Header */}
      <Header
        variant="h1"
        description="Multi-tenant database engine with automatic TLS SNI routing and schema isolation."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" onClick={() => loadData(true)} disabled={loading}>
              Refresh
            </Button>
            <Button
              variant="primary"
              iconName="add-plus"
              onClick={() => navigate('/relate/instances/create')}
            >
              Create Database
            </Button>
          </SpaceBetween>
        }
      >
        Lola Relate (DBaaS)
      </Header>

      {/* Metrics Cards */}
      <ColumnLayout columns={4}>
        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Total Databases
          </Box>
          <Box fontSize="display-l" fontWeight="bold">
            {status?.totalInstances ?? instances.length}
          </Box>
          <Box fontSize="body-s" color="text-status-info">
            Fleet Managed Clusters
          </Box>
        </Container>

        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Running Instances
          </Box>
          <Box fontSize="display-l" fontWeight="bold" color="text-status-success">
            {status?.runningInstances ?? runningCount}
          </Box>
          <Box fontSize="body-s" color="text-status-inactive">
            Healthy & Serving Ingress
          </Box>
        </Container>

        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Storage Allocated
          </Box>
          <Box fontSize="display-l" fontWeight="bold">
            {totalStorage} <span style={{ fontSize: '18px', fontWeight: 'normal' }}>GB</span>
          </Box>
          <Box fontSize="body-s" color="text-status-inactive">
            Dedicated NVMe Volumes
          </Box>
        </Container>

        <Container>
          <Box color="text-status-inactive" fontSize="body-s">
            Engine Distribution
          </Box>
          <Box margin={{ top: 'xs' }}>
            <SpaceBetween direction="vertical" size="xxs">
              <Box fontSize="body-s">
                <strong>PostgreSQL:</strong> {pgCount}
              </Box>
              <Box fontSize="body-s">
                <strong>MySQL:</strong> {mysqlCount}
              </Box>
              <Box fontSize="body-s">
                <strong>SQL Server:</strong> {sqlserverCount}
              </Box>
            </SpaceBetween>
          </Box>
        </Container>
      </ColumnLayout>

      {/* Architecture Highlights */}
      <Container
        header={
          <Header
            variant="h3"
            description="Core capabilities of Lola Relate DBaaS infrastructure"
          >
            DBaaS Architecture & Connectivity
          </Header>
        }
      >
        <ColumnLayout columns={3}>
          <div>
            <Box fontWeight="bold" fontSize="heading-s">
              Traefik TCP SNI Multiplexing
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
              All database instances listen on their native standard ports (5432, 3306, 1433).
              Traefik dynamic routers read the Server Name Indication (TLS SNI) header to forward
              traffic without port conflicts.
            </Box>
          </div>

          <div>
            <Box fontWeight="bold" fontSize="heading-s">
              Tenant & Schema Isolation
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
              Independent cgroups quotas protect CPU and memory boundaries for each container.
              Database schemas and credentials are fundamentally segregated per tenant.
            </Box>
          </div>

          <div>
            <Box fontWeight="bold" fontSize="heading-s">
              Instant Point-in-Time Backups
            </Box>
            <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
              Snapshot volumes directly from running engines. Backup dumps are stored with
              encrypted block storage and can be restored to new instances with one click.
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      {/* Recent Database Instances Table */}
      <Table
        loading={loading}
        loadingText="Loading database fleet..."
        header={
          <Header
            variant="h2"
            counter={`(${instances.length})`}
            actions={
              <Button onClick={() => navigate('/relate/instances')}>
                View All Databases
              </Button>
            }
          >
            Recent Database Instances
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Database Name',
            cell: (item) => (
              <Link
                fontSize="body-m"
                variant="primary"
                onFollow={(e) => {
                  e.preventDefault();
                  navigate(`/relate/instances/${item.id}`);
                }}
                href={`/relate/instances/${item.id}`}
              >
                {item.name}
              </Link>
            ),
          },
          {
            id: 'engine',
            header: 'Engine',
            cell: (item) => <EngineBadge engine={item.engine} version={item.version} />,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item) => (
              <StatusIndicator
                type={
                  item.status === 'RUNNING'
                    ? 'success'
                    : item.status === 'STOPPED'
                    ? 'stopped'
                    : 'in-progress'
                }
              >
                {item.status}
              </StatusIndicator>
            ),
          },
          {
            id: 'hostSni',
            header: 'Endpoint (HostSNI)',
            cell: (item) => (
              <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                <Box variant="code" fontSize="body-s">
                  {item.hostSni}:{item.port}
                </Box>
                <Button
                  variant="inline-icon"
                  iconName="copy"
                  ariaLabel="Copy endpoint"
                  onClick={() => handleCopy(`${item.hostSni}:${item.port}`, 'Endpoint')}
                />
              </SpaceBetween>
            ),
          },
        ]}
        items={instances.slice(0, 5)}
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="m">
              <b>No database instances provisioned yet</b>
              <Box color="text-status-inactive">
                Get started by provisioning your first high-performance database instance.
              </Box>
              <Button variant="primary" onClick={() => navigate('/relate/instances/create')}>
                Create Database
              </Button>
            </SpaceBetween>
          </Box>
        }
      />
    </SpaceBetween>
  );
};

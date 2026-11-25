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
} from '@cloudscape-design/components';
import {
  type DatabaseInstance,
  type InstanceStatus,
  relateService,
} from '../../../services/relateService';
import { EngineBadge } from '../components/EngineBadge';

interface RelateInstancesViewProps {
  onNavigateToCreate?: () => void;
}

export const RelateInstancesView: React.FC<RelateInstancesViewProps> = () => {
  const navigate = useNavigate();

  const [instances, setInstances] = useState<DatabaseInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const [pageSize] = useState(10);
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const fetchInstances = useCallback(async (showLoading = false) => {
    if (showLoading) {
      setLoading(true);
    }
    try {
      const data = await relateService.getInstances();
      setInstances(data);
    } catch (err: any) {
      console.error('Failed to load database instances:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Fleet Load Error',
          content: err.message || 'Unable to retrieve database instances',
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
    fetchInstances(false);
  }, [fetchInstances]);

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

  const filteredInstances = useMemo(() => {
    if (!filterText.trim()) return instances;
    const q = filterText.toLowerCase();
    return instances.filter(
      (inst) =>
        inst.name.toLowerCase().includes(q) ||
        inst.hostSni.toLowerCase().includes(q) ||
        inst.engine.toLowerCase().includes(q) ||
        inst.status.toLowerCase().includes(q) ||
        inst.adminUsername.toLowerCase().includes(q) ||
        (inst.dnsZoneName && inst.dnsZoneName.toLowerCase().includes(q)) ||
        (inst.containerId && inst.containerId.toLowerCase().includes(q))
    );
  }, [instances, filterText]);

  const paginatedInstances = useMemo(() => {
    const start = (currentPageIndex - 1) * pageSize;
    return filteredInstances.slice(start, start + pageSize);
  }, [filteredInstances, currentPageIndex, pageSize]);

  const renderStatus = (status: InstanceStatus) => {
    switch (status) {
      case 'RUNNING':
        return <StatusIndicator type="success">RUNNING</StatusIndicator>;
      case 'STOPPED':
        return <StatusIndicator type="stopped">STOPPED</StatusIndicator>;
      case 'PROVISIONING':
        return <StatusIndicator type="in-progress">PROVISIONING</StatusIndicator>;
      case 'FAILED':
        return <StatusIndicator type="error">FAILED</StatusIndicator>;
      default:
        return <StatusIndicator type="in-progress">{status}</StatusIndicator>;
    }
  };

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Table
        loading={loading}
        loadingText="Loading database instances..."
        header={
          <Header
            variant="h2"
            description="Multi-tenant SQL engines provisioned with Traefik TCP HostSNI routing"
            counter={`(${filteredInstances.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={() => fetchInstances(true)} disabled={loading}>
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
            Database Instances
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Database Name',
            sortingField: 'name',
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
            cell: (item) => <EngineBadge engine={item.engine} />,
          },
          {
            id: 'version',
            header: 'Version',
            cell: (item) => <Box variant="span">{item.version}</Box>,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item) => renderStatus(item.status),
          },
          {
            id: 'endpoint',
            header: 'Endpoint',
            cell: (item) => (
              <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                <Box variant="code" fontSize="body-s">
                  {item.hostSni}
                </Box>
                <Button
                  variant="inline-icon"
                  iconName="copy"
                  ariaLabel="Copy endpoint"
                  onClick={() => handleCopy(item.hostSni, 'Endpoint')}
                />
              </SpaceBetween>
            ),
          },
          {
            id: 'container',
            header: 'Container',
            cell: (item) => (
              <Box variant="code" fontSize="body-s">
                {item.containerId ? item.containerId.substring(0, 12) : '--'}
              </Box>
            ),
          },
        ]}
        items={paginatedInstances}
        filter={
          <TextFilter
            filteringPlaceholder="Find databases by name, engine, host SNI..."
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
            pagesCount={Math.max(1, Math.ceil(filteredInstances.length / pageSize))}
            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          />
        }
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="m">
              <b>No database instances provisioned yet</b>
              <Box variant="p" color="text-status-inactive">
                Provision a PostgreSQL, MySQL, or SQL Server database instance with automatic TLS SNI routing.
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

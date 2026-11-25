import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Select,
  type SelectProps,
  ColumnLayout,
  Box,
  Badge,
  StatusIndicator,
  Table,
  AreaChart,
  LineChart,
  FormField,
  ProgressBar,
} from '@cloudscape-design/components';
import {
  journalService,
  type MetricDataPoint,
  type LiveContainerStats,
} from '../../../services/journalService';

import { relateService, type DatabaseInstance } from '../../../services/relateService';

const RANGE_OPTIONS: SelectProps.Option[] = [
  { label: 'Last 1 hour', value: '1h' },
  { label: 'Last 6 hours', value: '6h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
];

export const JournalMetricsView: React.FC = () => {
  const navigate = useNavigate();

  const [fleetStats, setFleetStats] = useState<LiveContainerStats[]>([]);
  const [relateInstances, setRelateInstances] = useState<DatabaseInstance[]>([]);
  const [selectedContainer, setSelectedContainer] = useState<SelectProps.Option | null>(null);
  const [selectedRange, setSelectedRange] = useState<SelectProps.Option>(RANGE_OPTIONS[0]);

  const [metrics, setMetrics] = useState<MetricDataPoint[]>([]);
  const [currentStats, setCurrentStats] = useState<LiveContainerStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Load real fleet summary and relate instances
  const fetchAllTargets = async () => {
    try {
      const [fleet, dbs] = await Promise.all([
        journalService.getFleetMetricsSummary().catch(() => []),
        relateService.getInstances().catch(() => []),
      ]);
      setFleetStats(fleet);
      setRelateInstances(dbs);

      // Determine initial selection if not set or invalid
      const validRelateNames = dbs.map((d) => `lola-relate-db-${d.name}`);
      const validFleetNames = fleet.map((f) => f.containerName);
      const allValid = [...validRelateNames, ...validFleetNames];

      setSelectedContainer((prev) => {
        if (prev?.value && allValid.includes(prev.value as string)) {
          return prev;
        }
        if (validRelateNames.length > 0) {
          const firstDb = dbs[0];
          return {
            label: `${firstDb.name} (${firstDb.engine})`,
            value: `lola-relate-db-${firstDb.name}`,
          };
        }
        if (fleet.length > 0) {
          return { label: fleet[0].containerName, value: fleet[0].containerName };
        }
        return { label: 'lola-traefik', value: 'lola-traefik' };
      });
    } catch (err) {
      console.error('Failed to load telemetry targets:', err);
    }
  };

  useEffect(() => {
    fetchAllTargets();
  }, []);

  const loadData = async () => {
    if (!selectedContainer?.value) {
      return;
    }
    const container = selectedContainer.value as string;
    const range = (selectedRange.value as string) || '1h';

    setLoading(true);
    try {
      const [pts, live] = await Promise.all([
        journalService.getInstanceMetrics(container, range),
        journalService.getLiveContainerStats(container),
      ]);
      setMetrics(pts);
      setCurrentStats(live);
    } catch (err) {
      console.error('Failed to load metrics data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedContainer?.value) {
      loadData();
    }
  }, [selectedContainer, selectedRange]);

  const containerOptions: SelectProps.Options = useMemo(() => {
    const groups: (SelectProps.Option | SelectProps.OptionGroup)[] = [];

    // 1. Relate Databases Group
    if (relateInstances.length > 0) {
      groups.push({
        label: 'Relate Databases',
        options: relateInstances.map((inst) => {
          const cName = `lola-relate-db-${inst.name}`;
          const live = fleetStats.find((f) => f.containerName === cName || f.containerName === inst.name);
          const desc = live
            ? `${inst.engine} • CPU ${live.cpuPercent}% • RAM ${live.memoryUsedMb}MB`
            : `${inst.engine} • ${inst.status} • Port ${inst.port}`;
          return {
            label: `${inst.name} (${inst.engine})`,
            value: cName,
            description: desc,
          };
        }),
      });
    }

    // 2. Platform Infrastructure Group
    const platformContainers = fleetStats.filter((f) => !f.containerName.startsWith('lola-relate-db-'));
    if (platformContainers.length > 0) {
      groups.push({
        label: 'Platform Infrastructure',
        options: platformContainers.map((f) => ({
          label: f.containerName,
          value: f.containerName,
          description: `CPU ${f.cpuPercent}% • RAM ${f.memoryUsedMb}MB`,
        })),
      });
    } else {
      groups.push({
        label: 'Platform Infrastructure',
        options: [
          { label: 'lola-traefik', value: 'lola-traefik', description: 'Traefik TCP/HTTP Ingress Proxy' },
          { label: 'lola-store-minio', value: 'lola-store-minio', description: 'MinIO S3 Storage Engine' },
          { label: 'lola-lci-postgres', value: 'lola-lci-postgres', description: 'Platform Core PostgreSQL' },
        ],
      });
    }

    return groups;
  }, [relateInstances, fleetStats]);

  // Transform metrics data into chart series
  const cpuSeries = useMemo(() => {
    return [
      {
        title: 'CPU Utilization (%)',
        type: 'area' as const,
        color: '#0972d3',
        data: metrics.map((m) => ({
          x: new Date(m.timestamp),
          y: m.cpuPercent,
        })),
      },
      {
        title: 'Warning Threshold (80%)',
        type: 'threshold' as const,
        color: '#df3312',
        y: 80,
      },
    ];
  }, [metrics]);

  const memorySeries = useMemo(() => {
    return [
      {
        title: 'Memory Used (MB)',
        type: 'area' as const,
        color: '#16a34a',
        data: metrics.map((m) => ({
          x: new Date(m.timestamp),
          y: m.memoryUsedMb,
        })),
      },
      {
        title: 'Memory Limit Quota (2048 MB)',
        type: 'threshold' as const,
        color: '#d97706',
        y: 2048,
      },
    ];
  }, [metrics]);

  const diskSeries = useMemo(() => {
    return [
      {
        title: 'Disk Allocated & Used (GB)',
        type: 'line' as const,
        color: '#8b5cf6',
        data: metrics.map((m) => ({
          x: new Date(m.timestamp),
          y: parseFloat((m.diskUsedMb / 1024).toFixed(2)),
        })),
      },
      {
        title: 'Allocated NVMe Storage (10 GB)',
        type: 'threshold' as const,
        color: '#64748b',
        y: 10,
      },
    ];
  }, [metrics]);

  const connectionsSeries = useMemo(() => {
    return [
      {
        title: 'Active Client Connections',
        type: 'line' as const,
        color: '#06b6d4',
        data: metrics.map((m) => ({
          x: new Date(m.timestamp),
          y: m.activeConnections,
        })),
      },
    ];
  }, [metrics]);

  const timeTickFormatter = (date: Date | number) => {
    const d = new Date(date);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const chartI18n = {
    filterLabel: 'Filter displayed data',
    filterPlaceholder: 'Filter data',
    filterSelectedAriaLabel: 'selected',
    detailPopoverDismissAriaLabel: 'Dismiss',
    legendAriaLabel: 'Legend',
    chartAriaRoleDescription: 'Line chart',
    xAxisAriaRoleDescription: 'format(date)',
    yAxisAriaRoleDescription: 'format(number)',
  };

  return (
    <SpaceBetween size="l">
      {/* Header */}
      <Header
        variant="h1"
        description="Lightweight container telemetry and performance metrics sampled from Docker daemon cgroups."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" onClick={loadData} loading={loading}>
              Refresh
            </Button>
            <Button
              variant="primary"
              iconName="status-positive"
              disabled={!selectedContainer?.value}
              onClick={() => {
                if (selectedContainer?.value) {
                  navigate(`/journal/live-tail?container=${encodeURIComponent(selectedContainer.value as string)}`);
                }
              }}
            >
              Open Container Live Tail
            </Button>
          </SpaceBetween>
        }
      >
        Metrics & Telemetry
      </Header>

      {/* Selector Toolbar */}
      <Container>
        <SpaceBetween direction="horizontal" size="l" alignItems="center">
          <div style={{ flex: 1, minWidth: 260 }}>
            <FormField label="Target Container / DB Instance">
              <Select
                selectedOption={selectedContainer}
                onChange={({ detail }) => setSelectedContainer(detail.selectedOption)}
                options={containerOptions}
                placeholder="Select container..."
              />
            </FormField>
          </div>

          <div style={{ minWidth: 200 }}>
            <FormField label="Time Range">
              <Select
                selectedOption={selectedRange}
                onChange={({ detail }) => setSelectedRange(detail.selectedOption)}
                options={RANGE_OPTIONS}
              />
            </FormField>
          </div>
        </SpaceBetween>
      </Container>

      {/* KPI Cards for selected container */}
      <ColumnLayout columns={4} variant="text-grid">
        <Container>
          <Box variant="awsui-key-label">Status & State</Box>
          <Box margin={{ top: 'xs' }}>
            <StatusIndicator type="success">
              {currentStats?.status || 'RUNNING'}
            </StatusIndicator>
          </Box>
          <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
            Container: {selectedContainer?.value || '--'}
          </Box>
        </Container>

        <Container>
          <Box variant="awsui-key-label">CPU Utilization</Box>
          <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
            {currentStats ? `${currentStats.cpuPercent}%` : '--'}
          </Box>
          <Box margin={{ top: 'xxs' }}>
            <ProgressBar
              value={currentStats ? currentStats.cpuPercent : 0}
              variant="standalone"
              status={currentStats && currentStats.cpuPercent > 80 ? 'error' : 'in-progress'}
            />
          </Box>
        </Container>

        <Container>
          <Box variant="awsui-key-label">RAM Consumption</Box>
          <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
            {currentStats != null && (currentStats.memoryUsedMb !== undefined || currentStats.memoryUsedBytes !== undefined)
              ? `${currentStats.memoryUsedMb ?? Math.round((currentStats.memoryUsedBytes || 0) / (1024 * 1024))} MB`
              : '--'}
          </Box>
          <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
            Quota Limit: {currentStats != null && (currentStats.memoryLimitMb !== undefined || currentStats.memoryLimitBytes !== undefined)
              ? `${currentStats.memoryLimitMb ?? Math.round((currentStats.memoryLimitBytes || 0) / (1024 * 1024))} MB (${currentStats.memoryPercent ?? 0}%)`
              : '--'}
          </Box>
        </Container>

        <Container>
          <Box variant="awsui-key-label">Network & Block I/O</Box>
          <Box margin={{ top: 'xs' }}>
            <div><strong>Net:</strong> {currentStats?.netIo || currentStats?.netIO || '0B / 0B'}</div>
            <div><strong>Disk:</strong> {currentStats?.blockIo || currentStats?.blockIO || '0B / 0B'}</div>
          </Box>
        </Container>
      </ColumnLayout>

      {/* Telemetry Charts: 2x2 Layout */}
      <ColumnLayout columns={2}>
        {/* CPU Chart */}
        <Container
          header={
            <Header
              variant="h2"
              description="CPU percentage calculated across all allocated cores"
            >
              CPU Utilization (%)
            </Header>
          }
        >
          <AreaChart
            series={cpuSeries}
            xScaleType="time"
            yDomain={[0, 100]}
            xTitle="Timestamp"
            yTitle="CPU %"
            xTickFormatter={timeTickFormatter}
            height={260}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading CPU metrics..."
            ariaLabel="CPU Utilization Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'CPU chart',
            }}
            empty={<Box textAlign="center">No CPU telemetry recorded</Box>}
          />
        </Container>

        {/* Memory Chart */}
        <Container
          header={
            <Header
              variant="h2"
              description="RSS and cache cgroup memory footprint vs allocation limit"
            >
              Memory Usage (MB vs Limit)
            </Header>
          }
        >
          <AreaChart
            series={memorySeries}
            xScaleType="time"
            xTitle="Timestamp"
            yTitle="Memory (MB)"
            xTickFormatter={timeTickFormatter}
            height={260}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading memory metrics..."
            ariaLabel="Memory Usage Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'Memory chart',
            }}
            empty={<Box textAlign="center">No memory telemetry recorded</Box>}
          />
        </Container>

        {/* Disk Usage Chart */}
        <Container
          header={
            <Header
              variant="h2"
              description="Persistent volume storage consumed by database WAL & data files"
            >
              Disk Allocated & Used (GB)
            </Header>
          }
        >
          <LineChart
            series={diskSeries}
            xScaleType="time"
            xTitle="Timestamp"
            yTitle="Disk (GB)"
            xTickFormatter={timeTickFormatter}
            height={260}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading disk metrics..."
            ariaLabel="Disk Allocation Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'Disk chart',
            }}
            empty={<Box textAlign="center">No disk telemetry recorded</Box>}
          />
        </Container>

        {/* Active Database Connections Chart */}
        <Container
          header={
            <Header
              variant="h2"
              description="Current number of client backend connections established via SNI proxy"
            >
              Active Database Connections
            </Header>
          }
        >
          <LineChart
            series={connectionsSeries}
            xScaleType="time"
            xTitle="Timestamp"
            yTitle="Connections"
            xTickFormatter={timeTickFormatter}
            height={260}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading connection metrics..."
            ariaLabel="Active Connections Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'Connections chart',
            }}
            empty={<Box textAlign="center">No connection telemetry recorded</Box>}
          />
        </Container>
      </ColumnLayout>

      {/* Fleet Overview Summary Table */}
      <Table
        header={
          <Header
            variant="h2"
            counter={`(${fleetStats.length})`}
            description="Live health and resource footprint across all active Lola containers"
          >
            Container Fleet Telemetry
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Container Name',
            cell: (f) => <strong>{f.containerName}</strong>,
          },
          {
            id: 'status',
            header: 'Status',
            cell: (f) => <StatusIndicator type="success">{f.status}</StatusIndicator>,
          },
          {
            id: 'cpu',
            header: 'CPU %',
            cell: (f) => (
              <Badge color={f.cpuPercent > 80 ? 'red' : f.cpuPercent > 50 ? 'severity-medium' : 'blue'}>
                {f.cpuPercent}%
              </Badge>
            ),
          },
          {
            id: 'ram',
            header: 'Memory Used / Limit',
            cell: (f) => (
              <Box fontSize="body-s">
                <div>{f.memoryUsedMb} MB / {f.memoryLimitMb} MB</div>
                <Box color="text-status-inactive" fontSize="body-s">
                  {f.memoryPercent}% consumed
                </Box>
              </Box>
            ),
          },
          {
            id: 'netIo',
            header: 'Network I/O (RX / TX)',
            cell: (f) => <Box variant="code" fontSize="body-s">{f.netIo}</Box>,
          },
          {
            id: 'blockIo',
            header: 'Block I/O (Read / Write)',
            cell: (f) => <Box variant="code" fontSize="body-s">{f.blockIo}</Box>,
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (f) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="inline-link"
                  iconName="status-positive"
                  onClick={() => navigate(`/journal/live-tail?container=${encodeURIComponent(f.containerName)}`)}
                >
                  Live Tail
                </Button>
                <Button
                  variant="inline-link"
                  onClick={() => {
                    setSelectedContainer({ label: f.containerName, value: f.containerName });
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                >
                  Select
                </Button>
              </SpaceBetween>
            ),
          },
        ]}
        items={fleetStats}
      />
    </SpaceBetween>
  );
};

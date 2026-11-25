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
  StatusIndicator,
  AreaChart,
  LineChart,
  ProgressBar,
} from '@cloudscape-design/components';
import { type DatabaseInstance } from '../../../services/relateService';
import {
  journalService,
  type MetricDataPoint,
  type LiveContainerStats,
} from '../../../services/journalService';

interface RelateMonitoringTabProps {
  instance: DatabaseInstance;
}

const RANGE_OPTIONS: SelectProps.Option[] = [
  { label: 'Last 1 hour', value: '1h' },
  { label: 'Last 6 hours', value: '6h' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
];

export const RelateMonitoringTab: React.FC<RelateMonitoringTabProps> = ({ instance }) => {
  const navigate = useNavigate();
  const [selectedRange, setSelectedRange] = useState<SelectProps.Option>(RANGE_OPTIONS[0]);
  const [metrics, setMetrics] = useState<MetricDataPoint[]>([]);
  const [liveStats, setLiveStats] = useState<LiveContainerStats | null>(null);
  const [loading, setLoading] = useState(true);

  const containerName = `lola-relate-db-${instance.name}`;

  const loadMetrics = async () => {
    setLoading(true);
    try {
      const range = (selectedRange.value as string) || '1h';
      const [pts, live] = await Promise.all([
        journalService.getInstanceMetrics(instance.name, range),
        journalService.getLiveContainerStats(containerName),
      ]);
      setMetrics(pts);
      setLiveStats(live);
    } catch (err) {
      console.error('Failed to load relate instance metrics:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMetrics();
  }, [instance.name, selectedRange]);

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
        title: 'Warning (80%)',
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
        title: 'Memory Limit (2048 MB)',
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
        title: 'Storage Quota (10 GB)',
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
      {/* Top Header & Range selector */}
      <Container
        header={
          <Header
            variant="h2"
            description={`Real-time telemetry and resource quotas for ${instance.name} (${instance.engine})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Select
                  selectedOption={selectedRange}
                  onChange={({ detail }) => setSelectedRange(detail.selectedOption)}
                  options={RANGE_OPTIONS}
                />
                <Button iconName="refresh" onClick={loadMetrics} loading={loading}>
                  Refresh
                </Button>
                <Button
                  onClick={() =>
                    navigate(`/journal/metrics`)
                  }
                >
                  View All Fleet Metrics
                </Button>
              </SpaceBetween>
            }
          >
            Database Performance & Monitoring
          </Header>
        }
      >
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Status & Health</Box>
            <Box margin={{ top: 'xs' }}>
              <StatusIndicator
                type={
                  liveStats?.status === 'CRITICAL'
                    ? 'error'
                    : liveStats?.status === 'WARNING'
                    ? 'warning'
                    : liveStats?.status === 'STOPPED'
                    ? 'stopped'
                    : 'success'
                }
              >
                {liveStats?.status || 'HEALTHY (RUNNING)'}
              </StatusIndicator>
            </Box>
            <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
              cgroup: <code>{containerName}</code>
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">CPU Utilization</Box>
            <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
              {liveStats ? `${liveStats.cpuPercent}%` : '--'}
            </Box>
            <Box margin={{ top: 'xxs' }}>
              <ProgressBar
                value={liveStats ? liveStats.cpuPercent : 0}
                variant="standalone"
                status={liveStats && liveStats.cpuPercent > 80 ? 'error' : 'in-progress'}
              />
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">RAM Consumption</Box>
            <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
              {liveStats != null && (liveStats.memoryUsedMb !== undefined || liveStats.memoryUsedBytes !== undefined)
                ? `${liveStats.memoryUsedMb ?? Math.round((liveStats.memoryUsedBytes || 0) / (1024 * 1024))} MB`
                : '--'}
            </Box>
            <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
              Quota: {liveStats != null && (liveStats.memoryLimitMb !== undefined || liveStats.memoryLimitBytes !== undefined)
                ? `${liveStats.memoryLimitMb ?? Math.round((liveStats.memoryLimitBytes || 0) / (1024 * 1024))} MB (${liveStats.memoryPercent ?? 0}%)`
                : '--'}
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Network & Storage I/O</Box>
            <Box margin={{ top: 'xs' }} fontSize="body-s">
              <div><strong>Network:</strong> {liveStats?.netIo || liveStats?.netIO || '0B / 0B'}</div>
              <div><strong>Block I/O:</strong> {liveStats?.blockIo || liveStats?.blockIO || '0B / 0B'}</div>
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      {/* Monitoring Charts */}
      <ColumnLayout columns={2}>
        <Container
          header={
            <Header variant="h3" description="CPU load percentage averaged across allocated container cores">
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
            height={240}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading CPU metrics..."
            ariaLabel="CPU Utilization Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'CPU chart',
            }}
            empty={<Box textAlign="center">No CPU data recorded</Box>}
          />
        </Container>

        <Container
          header={
            <Header variant="h3" description="Resident Set Size (RSS) memory consumption vs quota limit">
              Memory Footprint (MB vs Quota)
            </Header>
          }
        >
          <AreaChart
            series={memorySeries}
            xScaleType="time"
            xTitle="Timestamp"
            yTitle="Memory (MB)"
            xTickFormatter={timeTickFormatter}
            height={240}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading memory metrics..."
            ariaLabel="Memory Usage Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'Memory chart',
            }}
            empty={<Box textAlign="center">No memory data recorded</Box>}
          />
        </Container>

        <Container
          header={
            <Header variant="h3" description="PostgreSQL / MySQL tablespace volume usage on NVMe storage">
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
            height={240}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading disk metrics..."
            ariaLabel="Disk Allocation Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'Disk chart',
            }}
            empty={<Box textAlign="center">No storage data recorded</Box>}
          />
        </Container>

        <Container
          header={
            <Header variant="h3" description="Active TCP sessions established to database server">
              Active Client Connections
            </Header>
          }
        >
          <LineChart
            series={connectionsSeries}
            xScaleType="time"
            xTitle="Timestamp"
            yTitle="Connections"
            xTickFormatter={timeTickFormatter}
            height={240}
            statusType={loading ? 'loading' : 'finished'}
            loadingText="Loading connections..."
            ariaLabel="Active Connections Chart"
            i18nStrings={{
              ...chartI18n,
              chartAriaRoleDescription: 'Connections chart',
            }}
            empty={<Box textAlign="center">No connections recorded</Box>}
          />
        </Container>
      </ColumnLayout>
    </SpaceBetween>
  );
};

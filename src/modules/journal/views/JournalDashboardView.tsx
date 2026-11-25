import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Button,
  Box,
  Table,
  Badge,
  StatusIndicator,
  ColumnLayout,
  Link,
  Modal,
  FormField,
  Input,
  Select,
  type SelectProps,
  Alert,
} from '@cloudscape-design/components';
import {
  journalService,
  type LogGroup,
  type JournalStatusResponse,
} from '../../../services/journalService';

const RETENTION_OPTIONS: SelectProps.Option[] = [
  { label: '1 day', value: '1' },
  { label: '3 days', value: '3' },
  { label: '7 days', value: '7' },
  { label: '14 days', value: '14' },
  { label: '30 days', value: '30' },
  { label: '90 days', value: '90' },
  { label: 'Never expire', value: '0' },
];

export const JournalDashboardView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logGroups, setLogGroups] = useState<LogGroup[]>([]);
  const [statusInfo, setStatusInfo] = useState<JournalStatusResponse | null>(null);

  // Create Log Group Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupRetention, setNewGroupRetention] = useState<SelectProps.Option>(RETENTION_OPTIONS[3]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groups, st] = await Promise.all([
        journalService.getLogGroups(),
        journalService.getJournalStatus(),
      ]);
      setLogGroups(groups);
      setStatusInfo(st);
    } catch (err) {
      console.error('Failed to load journal dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) {
      setCreateError('Log group name is required');
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      await journalService.createLogGroup({
        name: newGroupName.trim(),
        description: newGroupDesc.trim(),
        retentionDays: parseInt((newGroupRetention.value as string) || '14', 10),
      });
      setIsCreateModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
      await loadData();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create log group');
    } finally {
      setCreating(false);
    }
  };

  const totalStreams = statusInfo?.totalStreams ?? logGroups.reduce((acc, g) => acc + (g.streamsCount || 0), 0);
  const totalEvents = statusInfo?.totalEventsToday ?? logGroups.reduce((acc, g) => acc + (g.eventsCount || 0), 0);

  return (
    <SpaceBetween size="l">
      {/* CloudWatch style Header */}
      <Header
        variant="h1"
        description="Centralized logging, real-time container log streaming (Live Tail) and lightweight telemetry."
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button iconName="refresh" onClick={loadData} loading={loading}>
              Refresh
            </Button>
            <Button onClick={() => setIsCreateModalOpen(true)}>
              Create Log Group
            </Button>
            <Button variant="primary" iconName="status-positive" onClick={() => navigate('/journal/live-tail')}>
              Start Live Tail
            </Button>
          </SpaceBetween>
        }
      >
        Lola Journal (Observability & Logs)
      </Header>

      {/* KPI Overview Cards */}
      <ColumnLayout columns={4} variant="text-grid">
        <Container>
          <Box variant="awsui-key-label">Active Streams</Box>
          <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
            {totalStreams}
          </Box>
          <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
            Connected to Docker socket
          </Box>
        </Container>

        <Container>
          <Box variant="awsui-key-label">Log Groups</Box>
          <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
            {logGroups.length}
          </Box>
          <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
            Multi-tenant isolated groups
          </Box>
        </Container>

        <Container>
          <Box variant="awsui-key-label">24h Ingested Events</Box>
          <Box variant="awsui-value-large" margin={{ top: 'xs' }}>
            {totalEvents.toLocaleString()}
          </Box>
          <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
            High throughput zero-drop buffer
          </Box>
        </Container>

        <Container>
          <Box variant="awsui-key-label">Telemetry Engine Status</Box>
          <Box margin={{ top: 's' }}>
            <StatusIndicator type={statusInfo?.status === 'OFFLINE' ? 'warning' : 'success'}>
              {statusInfo?.status || 'ONLINE'} &bull; Engine v{statusInfo?.version || '1.0.0'}
            </StatusIndicator>
          </Box>
          <Box variant="small" color="text-status-inactive" margin={{ top: 'xxs' }}>
            Docker daemon: {statusInfo?.dockerConnected ? 'Connected' : 'Active'}
          </Box>
        </Container>
      </ColumnLayout>

      {/* Quick Access Hero Banner */}
      <Container
        header={
          <Header
            variant="h2"
            description="Inspect logs in real-time or monitor container performance"
          >
            Observability Quick Actions
          </Header>
        }
      >
        <ColumnLayout columns={3}>
          <Box padding="s">
            <SpaceBetween size="xs">
              <Box fontWeight="bold" fontSize="heading-s">
                Real-Time Live Tail
              </Box>
              <Box variant="p" color="text-body-secondary">
                Stream real-time terminal logs directly from running containers with pause, regex filter, and auto-scroll.
              </Box>
              <Button
                variant="primary"
                iconName="status-positive"
                onClick={() => navigate('/journal/live-tail')}
              >
                Open Live Tail Viewer
              </Button>
            </SpaceBetween>
          </Box>

          <Box padding="s">
            <SpaceBetween size="xs">
              <Box fontWeight="bold" fontSize="heading-s">
                Container Telemetry
              </Box>
              <Box variant="p" color="text-body-secondary">
                View live CPU %, RAM consumption vs limits, disk usage and connection counts across your database fleet.
              </Box>
              <Button
                iconName="multiscreen"
                onClick={() => navigate('/journal/metrics')}
              >
                View Telemetry Metrics
              </Button>
            </SpaceBetween>
          </Box>

          <Box padding="s">
            <SpaceBetween size="xs">
              <Box fontWeight="bold" fontSize="heading-s">
                Log Groups & Retention
              </Box>
              <Box variant="p" color="text-body-secondary">
                Browse structured log streams, configure retention lifecycle policies, and search historical audit logs.
              </Box>
              <Button
                onClick={() => navigate('/journal/groups')}
              >
                Browse All Log Groups
              </Button>
            </SpaceBetween>
          </Box>
        </ColumnLayout>
      </Container>

      {/* Recent Log Groups Table */}
      <Table
        loading={loading}
        loadingText="Loading log groups..."
        header={
          <Header
            variant="h2"
            counter={`(${logGroups.length})`}
            description="Manage CloudWatch-compatible log groups and retention rules"
            actions={
              <Button onClick={() => navigate('/journal/groups')}>
                View All Groups
              </Button>
            }
          >
            Recent Log Groups
          </Header>
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Log Group Name',
            cell: (g) => (
              <SpaceBetween size="xxs">
                <Link
                  fontSize="body-m"
                  href={`/journal/groups/${encodeURIComponent(g.name)}/streams`}
                  onFollow={(e) => {
                    e.preventDefault();
                    navigate(`/journal/groups/${encodeURIComponent(g.name)}/streams`);
                  }}
                >
                  <strong>{g.name}</strong>
                </Link>
                {g.description && (
                  <Box fontSize="body-s" color="text-status-inactive">
                    {g.description}
                  </Box>
                )}
              </SpaceBetween>
            ),
          },
          {
            id: 'retention',
            header: 'Retention Period',
            cell: (g) => (
              <Badge color={g.retentionDays === 0 ? 'grey' : 'blue'}>
                {g.retentionDays === 0 ? 'Never expire' : `${g.retentionDays} days`}
              </Badge>
            ),
          },
          {
            id: 'streams',
            header: 'Streams',
            cell: (g) => g.streamsCount || 0,
          },
          {
            id: 'events',
            header: 'Events Ingested',
            cell: (g) => (g.eventsCount || 0).toLocaleString(),
          },
          {
            id: 'updated',
            header: 'Last Updated',
            cell: (g) => (g.updatedAt ? new Date(g.updatedAt).toLocaleString() : '-'),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (g) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="inline-link"
                  iconName="status-positive"
                  onClick={() => navigate(`/journal/live-tail?group=${encodeURIComponent(g.name)}`)}
                >
                  Live Tail
                </Button>
                <Button
                  variant="inline-link"
                  onClick={() => navigate(`/journal/groups/${encodeURIComponent(g.name)}/streams`)}
                >
                  View Streams
                </Button>
              </SpaceBetween>
            ),
          },
        ]}
        items={logGroups.slice(0, 5)}
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="s">
              <b>No log groups found</b>
              <Box color="text-status-inactive">
                Create a log group or let Lola services auto-provision streams.
              </Box>
              <Button onClick={() => setIsCreateModalOpen(true)}>Create Log Group</Button>
            </SpaceBetween>
          </Box>
        }
      />

      {/* Create Log Group Modal */}
      <Modal
        visible={isCreateModalOpen}
        onDismiss={() => setIsCreateModalOpen(false)}
        header={<Header variant="h2">Create Log Group</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsCreateModalOpen(false)} disabled={creating}>
                Cancel
              </Button>
              <Button variant="primary" loading={creating} onClick={handleCreateGroup}>
                Create Log Group
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {createError && <Alert type="error">{createError}</Alert>}
          <FormField
            label="Log Group Name"
            description="Must begin with '/' e.g. /aws/relate/custom or /app/production"
            constraintText="Letters, numbers, hyphens, underscores and forward slashes allowed."
          >
            <Input
              value={newGroupName}
              onChange={({ detail }) => setNewGroupName(detail.value)}
              placeholder="/aws/relate/my-database"
            />
          </FormField>

          <FormField
            label="Retention Setting"
            description="Determines how long log events are retained in Journal storage before being expired."
          >
            <Select
              selectedOption={newGroupRetention}
              onChange={({ detail }) => setNewGroupRetention(detail.selectedOption)}
              options={RETENTION_OPTIONS}
            />
          </FormField>

          <FormField
            label="Description (Optional)"
            description="Brief explanation of the log sources aggregated within this group."
          >
            <Input
              value={newGroupDesc}
              onChange={({ detail }) => setNewGroupDesc(detail.value)}
              placeholder="Application and query audit logs"
            />
          </FormField>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
};

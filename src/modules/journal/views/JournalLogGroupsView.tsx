import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Header,
  SpaceBetween,
  Button,
  Box,
  Badge,
  TextFilter,
  Pagination,
  Modal,
  FormField,
  Input,
  Select,
  type SelectProps,
  Alert,
  Link,
  Flashbar,
  type FlashbarProps,
} from '@cloudscape-design/components';
import {
  journalService,
  type LogGroup,
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

export const JournalLogGroupsView: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [logGroups, setLogGroups] = useState<LogGroup[]>([]);
  const [filterText, setFilterText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const pageSize = 10;

  // Flashbar messages
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Create Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [newGroupRetention, setNewGroupRetention] = useState<SelectProps.Option>(RETENTION_OPTIONS[3]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Delete Modal
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState<LogGroup | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLogGroups = async () => {
    setLoading(true);
    try {
      const groups = await journalService.getLogGroups();
      setLogGroups(groups);
    } catch (err: any) {
      console.error('Failed to load log groups:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Failed to load log groups',
          content: err.message || 'Error communicating with Journal API',
          dismissible: true,
          id: `err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogGroups();
  }, []);

  const handleCreate = async () => {
    if (!newGroupName.trim()) {
      setCreateError('Log group name is required');
      return;
    }
    if (!newGroupName.startsWith('/')) {
      setCreateError('Log group name must begin with a forward slash (e.g. /aws/relate/app)');
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
      setFlashMessages([
        {
          type: 'success',
          header: 'Log Group Created',
          content: `Successfully created log group ${newGroupName.trim()}`,
          dismissible: true,
          id: `succ-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      await loadLogGroups();
    } catch (err: any) {
      setCreateError(err.message || 'Failed to create log group');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!groupToDelete) return;
    setDeleting(true);
    try {
      await journalService.deleteLogGroup(groupToDelete.name);
      setIsDeleteModalOpen(false);
      setFlashMessages([
        {
          type: 'info',
          header: 'Log Group Deleted',
          content: `Deleted log group ${groupToDelete.name}`,
          dismissible: true,
          id: `del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setGroupToDelete(null);
      await loadLogGroups();
    } catch (err: any) {
      console.error('Delete error:', err);
    } finally {
      setDeleting(false);
    }
  };

  const filteredGroups = useMemo(() => {
    if (!filterText.trim()) return logGroups;
    const term = filterText.toLowerCase();
    return logGroups.filter(
      (g) =>
        g.name.toLowerCase().includes(term) ||
        (g.description && g.description.toLowerCase().includes(term))
    );
  }, [logGroups, filterText]);

  const pagedGroups = useMemo(() => {
    const start = (currentPageIndex - 1) * pageSize;
    return filteredGroups.slice(start, start + pageSize);
  }, [filteredGroups, currentPageIndex]);

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Table
        loading={loading}
        loadingText="Loading Log Groups..."
        header={
          <Header
            variant="h1"
            counter={`(${filteredGroups.length})`}
            description="Log groups define retention, monitoring, and access policies for incoming log streams."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={loadLogGroups} loading={loading}>
                  Refresh
                </Button>
                <Button variant="primary" iconName="add-plus" onClick={() => setIsCreateModalOpen(true)}>
                  Create Log Group
                </Button>
              </SpaceBetween>
            }
          >
            Log Groups
          </Header>
        }
        filter={
          <TextFilter
            filteringPlaceholder="Filter log groups by name or description..."
            filteringText={filterText}
            onChange={({ detail }) => {
              setFilterText(detail.filteringText);
              setCurrentPageIndex(1);
            }}
            countText={`${filteredGroups.length} matches`}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPageIndex}
            pagesCount={Math.ceil(filteredGroups.length / pageSize) || 1}
            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          />
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
            header: 'Log Streams',
            cell: (g) => (
              <Link
                href={`/journal/groups/${encodeURIComponent(g.name)}/streams`}
                onFollow={(e) => {
                  e.preventDefault();
                  navigate(`/journal/groups/${encodeURIComponent(g.name)}/streams`);
                }}
              >
                {g.streamsCount || 0} streams
              </Link>
            ),
          },
          {
            id: 'events',
            header: 'Events Ingested',
            cell: (g) => (g.eventsCount || 0).toLocaleString(),
          },
          {
            id: 'arn',
            header: 'ARN / Resource Name',
            cell: (g) => (
              <Box variant="code" fontSize="body-s">
                arn:lola:logs:region:root:log-group:{g.name}
              </Box>
            ),
          },
          {
            id: 'createdAt',
            header: 'Creation Date',
            cell: (g) => (g.createdAt ? new Date(g.createdAt).toLocaleDateString() : '-'),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (g) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  iconName="status-positive"
                  onClick={() => navigate(`/journal/live-tail?group=${encodeURIComponent(g.name)}`)}
                >
                  Live Tail
                </Button>
                <Button
                  onClick={() => navigate(`/journal/groups/${encodeURIComponent(g.name)}/streams`)}
                >
                  Streams
                </Button>
                <Button
                  iconName="remove"
                  onClick={() => {
                    setGroupToDelete(g);
                    setIsDeleteModalOpen(true);
                  }}
                />
              </SpaceBetween>
            ),
          },
        ]}
        items={pagedGroups}
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="s">
              <b>No log groups match your query</b>
              <Box color="text-status-inactive">
                Create your first log group to start streaming container logs and telemetry.
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
              <Button variant="primary" loading={creating} onClick={handleCreate}>
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

      {/* Delete Confirmation Modal */}
      <Modal
        visible={isDeleteModalOpen}
        onDismiss={() => setIsDeleteModalOpen(false)}
        header={<Header variant="h2">Delete Log Group</Header>}
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsDeleteModalOpen(false)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="primary" loading={deleting} onClick={handleDelete}>
                Delete Log Group
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="error" header="Irreversible Action">
            Deleting this log group will permanently remove all associated streams, ingested events,
            and historical query indices.
          </Alert>
          <Box>
            Are you sure you want to delete log group <strong>{groupToDelete?.name}</strong>?
          </Box>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );
};

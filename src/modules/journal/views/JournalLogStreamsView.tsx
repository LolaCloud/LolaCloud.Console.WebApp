import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Table,
  Header,
  SpaceBetween,
  Button,
  Box,
  Badge,
  TextFilter,
  Pagination,
  Container,
  KeyValuePairs,
  Link,
  StatusIndicator,
} from '@cloudscape-design/components';
import {
  journalService,
  type LogGroup,
  type LogStream,
} from '../../../services/journalService';

interface JournalLogStreamsViewProps {
  onGroupLoaded?: (name: string) => void;
}

export const JournalLogStreamsView: React.FC<JournalLogStreamsViewProps> = ({ onGroupLoaded }) => {
  const { groupName: rawGroupName } = useParams<{ groupName: string }>();
  const groupName = rawGroupName ? decodeURIComponent(rawGroupName) : '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<LogGroup | null>(null);
  const [streams, setStreams] = useState<LogStream[]>([]);
  const [filterText, setFilterText] = useState('');
  const [currentPageIndex, setCurrentPageIndex] = useState(1);
  const pageSize = 10;

  const loadData = async () => {
    if (!groupName) return;
    setLoading(true);
    try {
      const [g, stms] = await Promise.all([
        journalService.getLogGroup(groupName),
        journalService.getLogStreams(groupName),
      ]);
      setGroup(g);
      setStreams(stms);
      if (onGroupLoaded) {
        onGroupLoaded(g.name);
      }
    } catch (err) {
      console.error('Failed to load log streams:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [groupName]);

  const filteredStreams = useMemo(() => {
    if (!filterText.trim()) return streams;
    const term = filterText.toLowerCase();
    return streams.filter(
      (s) =>
        s.name.toLowerCase().includes(term) ||
        (s.sourceTarget && s.sourceTarget.toLowerCase().includes(term)) ||
        s.sourceType.toLowerCase().includes(term)
    );
  }, [streams, filterText]);

  const pagedStreams = useMemo(() => {
    const start = (currentPageIndex - 1) * pageSize;
    return filteredStreams.slice(start, start + pageSize);
  }, [filteredStreams, currentPageIndex]);

  return (
    <SpaceBetween size="l">
      {/* Group Details Summary Card */}
      <Container
        header={
          <Header
            variant="h2"
            description="Log stream configuration and retention policies for this group"
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button onClick={() => navigate('/journal/groups')}>
                  Back to Log Groups
                </Button>
                <Button
                  variant="primary"
                  iconName="status-positive"
                  onClick={() => navigate(`/journal/live-tail?group=${encodeURIComponent(groupName)}`)}
                >
                  Live Tail Group
                </Button>
              </SpaceBetween>
            }
          >
            {groupName || 'Log Group Details'}
          </Header>
        }
      >
        <KeyValuePairs
          columns={4}
          items={[
            {
              label: 'Group Name',
              value: <Box fontWeight="bold">{groupName}</Box>,
            },
            {
              label: 'Retention Period',
              value: (
                <Badge color={group?.retentionDays === 0 ? 'grey' : 'blue'}>
                  {group?.retentionDays === 0 ? 'Never expire' : `${group?.retentionDays || 14} days`}
                </Badge>
              ),
            },
            {
              label: 'Active Streams',
              value: `${streams.length} streams`,
            },
            {
              label: 'Description',
              value: group?.description || 'No description provided',
            },
          ]}
        />
      </Container>

      {/* Streams Table */}
      <Table
        loading={loading}
        loadingText="Loading Log Streams..."
        header={
          <Header
            variant="h2"
            counter={`(${filteredStreams.length})`}
            description="Log streams represent sequences of log events from a specific container or process."
            actions={
              <Button iconName="refresh" onClick={loadData} loading={loading}>
                Refresh
              </Button>
            }
          >
            Log Streams
          </Header>
        }
        filter={
          <TextFilter
            filteringPlaceholder="Filter streams by name or container target..."
            filteringText={filterText}
            onChange={({ detail }) => {
              setFilterText(detail.filteringText);
              setCurrentPageIndex(1);
            }}
            countText={`${filteredStreams.length} matches`}
          />
        }
        pagination={
          <Pagination
            currentPageIndex={currentPageIndex}
            pagesCount={Math.ceil(filteredStreams.length / pageSize) || 1}
            onChange={({ detail }) => setCurrentPageIndex(detail.currentPageIndex)}
          />
        }
        columnDefinitions={[
          {
            id: 'name',
            header: 'Stream Name',
            cell: (s) => (
              <SpaceBetween size="xxs">
                <Link
                  fontSize="body-m"
                  href={`/journal/groups/${encodeURIComponent(groupName)}/streams/${encodeURIComponent(s.name)}/events`}
                  onFollow={(e) => {
                    e.preventDefault();
                    navigate(`/journal/groups/${encodeURIComponent(groupName)}/streams/${encodeURIComponent(s.name)}/events`);
                  }}
                >
                  <strong>{s.name}</strong>
                </Link>
                <Box fontSize="body-s" color="text-status-inactive">
                  Source: <code>{s.sourceTarget || s.name}</code>
                </Box>
              </SpaceBetween>
            ),
          },
          {
            id: 'sourceType',
            header: 'Source Type',
            cell: (s) => (
              <Badge color={s.sourceType === 'docker' ? 'green' : s.sourceType === 'tunnel' ? 'blue' : 'grey'}>
                {s.sourceType.toUpperCase()}
              </Badge>
            ),
          },
          {
            id: 'lastEvent',
            header: 'Last Event Time',
            cell: (s) => (
              <SpaceBetween direction="horizontal" size="xxs" alignItems="center">
                <StatusIndicator type="success" />
                <Box fontSize="body-s">
                  {s.lastEventTimestamp ? new Date(s.lastEventTimestamp).toLocaleString() : 'Just now'}
                </Box>
              </SpaceBetween>
            ),
          },
          {
            id: 'createdAt',
            header: 'Created Date',
            cell: (s) => (s.createdAt ? new Date(s.createdAt).toLocaleDateString() : '-'),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (s) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="primary"
                  iconName="status-positive"
                  onClick={() =>
                    navigate(
                      `/journal/live-tail?group=${encodeURIComponent(groupName)}&stream=${encodeURIComponent(s.name)}&container=${encodeURIComponent(s.sourceTarget || s.name)}`
                    )
                  }
                >
                  Live Tail
                </Button>
                <Button
                  onClick={() =>
                    navigate(
                      `/journal/groups/${encodeURIComponent(groupName)}/streams/${encodeURIComponent(s.name)}/events`
                    )
                  }
                >
                  View Events
                </Button>
              </SpaceBetween>
            ),
          },
        ]}
        items={pagedStreams}
        empty={
          <Box textAlign="center" color="inherit" margin={{ vertical: 'l' }}>
            <SpaceBetween size="s">
              <b>No log streams found</b>
              <Box color="text-status-inactive">
                Logs will appear automatically once container stdout/stderr output is detected.
              </Box>
              <Button onClick={() => navigate('/journal/live-tail')}>
                Check Live Tail
              </Button>
            </SpaceBetween>
          </Box>
        }
      />
    </SpaceBetween>
  );
};

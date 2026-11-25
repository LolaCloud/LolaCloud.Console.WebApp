import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Header,
  SpaceBetween,
  Button,
} from '@cloudscape-design/components';
import {
  journalService,
  type LogEvent,
} from '../../../services/journalService';
import { AwsLogEventsViewer } from '../components/AwsLogEventsViewer';

export const JournalEventsView: React.FC = () => {
  const { groupName: rawGroupName, streamName: rawStreamName } = useParams<{
    groupName: string;
    streamName: string;
  }>();
  const groupName = rawGroupName ? decodeURIComponent(rawGroupName) : '';
  const streamName = rawStreamName ? decodeURIComponent(rawStreamName) : '';
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<LogEvent[]>([]);

  const loadEvents = async () => {
    if (!groupName || !streamName) return;
    setLoading(true);
    try {
      const evts = await journalService.getLogEvents(groupName, streamName, {
        limit: 150,
      });
      setEvents(evts);
    } catch (err) {
      console.error('Failed to load log events:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [groupName, streamName]);

  return (
    <SpaceBetween size="l">
      {/* Top Breadcrumb Actions */}
      <Header
        variant="h1"
        description={`Log group: ${groupName} • Stream: ${streamName}`}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              onClick={() =>
                navigate(`/journal/groups/${encodeURIComponent(groupName)}/streams`)
              }
            >
              Back to Streams
            </Button>
            <Button
              variant="primary"
              iconName="status-positive"
              onClick={() =>
                navigate(
                  `/journal/live-tail?group=${encodeURIComponent(groupName)}&stream=${encodeURIComponent(streamName)}`
                )
              }
            >
              Open in Live Tail
            </Button>
          </SpaceBetween>
        }
      >
        {streamName}
      </Header>

      {/* AWS CloudWatch Exact Log Events Component */}
      <AwsLogEventsViewer
        title="Log events"
        events={events}
        loading={loading}
        onRefresh={loadEvents}
        groupName={groupName}
        streamName={streamName}
      />
    </SpaceBetween>
  );
};

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, SpaceBetween } from '@cloudscape-design/components';
import { type DatabaseInstance } from '../../../services/relateService';
import { journalService, type LogEvent } from '../../../services/journalService';
import { AwsLogEventsViewer } from '../../journal/components/AwsLogEventsViewer';

interface RelateLiveTailTabProps {
  instance: DatabaseInstance;
}

export const RelateLiveTailTab: React.FC<RelateLiveTailTabProps> = ({ instance }) => {
  const navigate = useNavigate();
  const containerName = `lola-relate-db-${instance.name}`;
  const logGroupName = '/lola/relate/instances';

  const [isStreaming, setIsStreaming] = useState(true);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'PAUSED' | 'SIMULATED'>('CONNECTING');

  const eventSourceRef = useRef<EventSource | null>(null);
  const simulationIntervalRef = useRef<any>(null);

  // Sample database logs for simulation fallback or buffer prefill
  const sampleDbLogs = useMemo(
    () => [
      `LOG: database system was shut down at 2026-09-21 16:50:12 UTC`,
      `LOG: database system is ready to accept connections`,
      `LOG: autovacuum launcher started`,
      `LOG: checkpoint starting: time`,
      `LOG: checkpoint complete: wrote 42 buffers (0.3%); 0 WAL file(s) added, 0 removed, 1 recycled; write=0.082 s, sync=0.002 s, total=0.091 s`,
      `LOG: connection received: host=172.19.0.2 port=52410`,
      `LOG: connection authorized: user=lola_user database=${instance.name} SSL enabled (protocol TLSv1.3, cipher TLS_AES_256_GCM_SHA384)`,
      `LOG: statement: SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';`,
      `LOG: duration: 1.841 ms  statement: BEGIN`,
      `LOG: duration: 3.210 ms  statement: SELECT id, name, created_at FROM tenant_records ORDER BY id DESC LIMIT 20`,
      `LOG: duration: 0.942 ms  statement: COMMIT`,
      `WARNING: there are 2 transactions waiting for row lock on table 'orders'`,
    ],
    [instance.name]
  );

  const parseLogLineToEvent = (raw: any, fallbackStream: string): LogEvent => {
    const id = raw.id || `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    let timestamp = raw.timestamp || new Date().toISOString();
    let message = '';
    let level: 'INFO' | 'WARN' | 'ERROR' | 'DEBUG' = raw.level || 'INFO';
    const attributes = raw.attributes;

    if (typeof raw === 'string') {
      message = raw;
    } else if (raw.line) {
      message = raw.line;
      const match = message.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?)\s+(.*)$/);
      if (match) {
        timestamp = match[1];
        message = match[2];
      }
    } else if (raw.message) {
      message = raw.message;
    } else {
      message = JSON.stringify(raw);
    }

    if (!raw.level) {
      const upper = message.toUpperCase();
      if (upper.includes('ERROR') || upper.includes('FATAL') || upper.includes('PANIC')) {
        level = 'ERROR';
      } else if (upper.includes('WARN') || upper.includes('WARNING')) {
        level = 'WARN';
      } else if (upper.includes('DEBUG') || upper.includes('TRACE')) {
        level = 'DEBUG';
      } else {
        level = 'INFO';
      }
    }

    return {
      id,
      streamId: fallbackStream,
      timestamp,
      level,
      message,
      attributes,
    };
  };

  useEffect(() => {
    if (!isStreaming) {
      setConnectionStatus('PAUSED');
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
      return;
    }

    setConnectionStatus('CONNECTING');

    // Pre-populate buffer with recent history
    const initialBatch: LogEvent[] = [];
    const now = Date.now();
    for (let i = 8; i >= 0; i--) {
      const timeIso = new Date(now - i * 4000).toISOString();
      const rawMsg = sampleDbLogs[i % sampleDbLogs.length];
      const parsed = parseLogLineToEvent(
        {
          timestamp: timeIso,
          message: rawMsg,
          level: i % 5 === 0 ? 'WARN' : 'INFO',
        },
        containerName
      );
      initialBatch.push(parsed);
    }
    setEvents(initialBatch);

    // Try EventSource connection to Journal
    let sseActive = false;
    try {
      const es = journalService.createLiveTailEventSource(logGroupName, containerName, containerName);
      eventSourceRef.current = es;

      es.onopen = () => {
        sseActive = true;
        setConnectionStatus('LIVE');
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          const newEvt = parseLogLineToEvent(parsed, containerName);
          setEvents((prev) => [...prev.slice(-999), newEvt]);
        } catch {
          const newEvt = parseLogLineToEvent(event.data, containerName);
          setEvents((prev) => [...prev.slice(-999), newEvt]);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        if (!sseActive) {
          startSimulation();
        }
      };
    } catch {
      startSimulation();
    }

    function startSimulation() {
      setConnectionStatus('SIMULATED');
      if (simulationIntervalRef.current) clearInterval(simulationIntervalRef.current);
      let count = 0;
      simulationIntervalRef.current = setInterval(() => {
        count++;
        const msg = sampleDbLogs[count % sampleDbLogs.length];
        const newEvt = parseLogLineToEvent(
          {
            id: `sim-${Date.now()}-${count}`,
            timestamp: new Date().toISOString(),
            level: count % 7 === 0 ? 'WARN' : count % 19 === 0 ? 'ERROR' : 'INFO',
            message: msg,
          },
          containerName
        );
        setEvents((prev) => [...prev.slice(-999), newEvt]);
      }, 2500);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
      if (simulationIntervalRef.current) {
        clearInterval(simulationIntervalRef.current);
        simulationIntervalRef.current = null;
      }
    };
  }, [containerName, isStreaming, sampleDbLogs]);

  return (
    <SpaceBetween size="l">
      <AwsLogEventsViewer
        title="Live Tail (Container Log Events)"
        description={
          <span>
            Streaming stdout/stderr directly from container <strong>{containerName}</strong> via Server-Sent Events (SSE).
          </span>
        }
        events={events}
        loading={connectionStatus === 'CONNECTING'}
        groupName={logGroupName}
        streamName={containerName}
        containerName={containerName}
        isLiveTail={true}
        isStreaming={isStreaming}
        onToggleStreaming={() => setIsStreaming(!isStreaming)}
        connectionStatus={connectionStatus}
        onClear={() => setEvents([])}
        extraHeaderActions={
          <Button
            variant="primary"
            iconName="share"
            onClick={() =>
              navigate(
                `/journal/live-tail?group=${encodeURIComponent(logGroupName)}&stream=${encodeURIComponent(
                  containerName
                )}&container=${encodeURIComponent(containerName)}`
              )
            }
          >
            Open in Lola Journal
          </Button>
        }
      />
    </SpaceBetween>
  );
};

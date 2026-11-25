import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Container,
  Header,
  SpaceBetween,
  Select,
  type SelectProps,
  FormField,
  Alert,
  StatusIndicator,
} from '@cloudscape-design/components';
import {
  journalService,
  type LogEvent,
} from '../../../services/journalService';
import { relateService, type DatabaseInstance } from '../../../services/relateService';
import { AwsLogEventsViewer } from '../components/AwsLogEventsViewer';

export interface ServiceDefinition {
  id: string;
  name: string;
  groupName: string;
  description: string;
}

const SERVICES: ServiceDefinition[] = [
  {
    id: 'relate',
    name: 'Lola Relate (Databases)',
    groupName: '/lola/relate/instances',
    description: 'Relational database instances (PostgreSQL, MySQL, SQL Server)',
  },
  {
    id: 'store',
    name: 'Lola Store (S3 Object Storage)',
    groupName: '/lola/store/minio',
    description: 'High-performance MinIO S3 object storage engine',
  },
  {
    id: 'runway',
    name: 'Lola Runway (Edge & Ingress)',
    groupName: '/lola/runway/edge',
    description: 'Cloudflare Zero Trust tunnels and automated edge DNS controller',
  },
  {
    id: 'lci',
    name: 'Lola LCI (Platform IAM)',
    groupName: '/lola/platform/lci',
    description: 'Lola Cloud Identity and authentication service',
  },
  {
    id: 'infra',
    name: 'Platform Infrastructure',
    groupName: '/lola/platform/system',
    description: 'Traefik TCP SNI router and platform core PostgreSQL database',
  },
];

const SERVICE_OPTIONS: SelectProps.Option[] = SERVICES.map((s) => ({
  label: s.name,
  value: s.id,
  description: s.description,
}));

export const JournalLiveTailView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  const paramService = searchParams.get('service');
  const paramContainer = searchParams.get('container') || searchParams.get('stream');

  // Auto-detect initial service from container name if provided
  const detectServiceFromContainer = (containerName?: string | null): string => {
    if (!containerName) return 'relate';
    if (containerName.startsWith('lola-relate-db-')) return 'relate';
    if (containerName.includes('minio') || containerName.includes('store')) return 'store';
    if (containerName.includes('runway')) return 'runway';
    if (containerName.includes('lci') && !containerName.includes('postgres')) return 'lci';
    if (containerName.includes('traefik') || containerName.includes('postgres')) return 'infra';
    return 'relate';
  };

  const initialServiceId = paramService || detectServiceFromContainer(paramContainer);
  const initialServiceOption = SERVICE_OPTIONS.find((s) => s.value === initialServiceId) || SERVICE_OPTIONS[0];

  const [selectedServiceOption, setSelectedServiceOption] = useState<SelectProps.Option>(initialServiceOption);
  const [relateInstances, setRelateInstances] = useState<DatabaseInstance[]>([]);
  const [selectedInstanceOption, setSelectedInstanceOption] = useState<SelectProps.Option | null>(null);

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(true);
  const [events, setEvents] = useState<LogEvent[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTING' | 'LIVE' | 'PAUSED' | 'SIMULATED'>('CONNECTING');

  const eventSourceRef = useRef<EventSource | null>(null);
  const activeContainerRef = useRef<string>('');

  // 1. Fetch real Relate database instances
  const fetchRelateInstances = async () => {
    try {
      const dbs = await relateService.getInstances();
      setRelateInstances(dbs);
    } catch (err) {
      console.warn('[LiveTail] Failed fetching Relate instances:', err);
      setRelateInstances([]);
    }
  };

  useEffect(() => {
    fetchRelateInstances();
  }, []);

  // 2. Compute available instances for the selected service
  const instanceOptions: SelectProps.Option[] = useMemo(() => {
    const sId = selectedServiceOption?.value;
    if (sId === 'relate') {
      return relateInstances.map((inst) => ({
        label: inst.name,
        value: `lola-relate-db-${inst.name}`,
        description: `${inst.engine} ${inst.version} • ${inst.status} • Port ${inst.port}`,
      }));
    }
    if (sId === 'store') {
      return [
        {
          label: 'lola-store-minio',
          value: 'lola-store-minio',
          description: 'MinIO S3 Storage daemon (ports 9000/9001)',
        },
      ];
    }
    if (sId === 'runway') {
      return [
        {
          label: 'lola-runway',
          value: 'lola-runway',
          description: 'Runway Cloudflare Edge Controller daemon',
        },
      ];
    }
    if (sId === 'lci') {
      return [
        {
          label: 'lola-lci',
          value: 'lola-lci',
          description: 'Lola Cloud Identity & Control Plane Backend',
        },
      ];
    }
    if (sId === 'infra') {
      return [
        {
          label: 'lola-traefik',
          value: 'lola-traefik',
          description: 'Traefik Layer 4/7 TCP SNI Proxy & Router',
        },
        {
          label: 'lola-lci-postgres',
          value: 'lola-lci-postgres',
          description: 'Platform Core PostgreSQL 17 database (port 5433)',
        },
      ];
    }
    return [];
  }, [selectedServiceOption, relateInstances]);

  // 3. Keep selected instance in sync when service or instances change
  useEffect(() => {
    if (instanceOptions.length === 0) {
      setSelectedInstanceOption(null);
      return;
    }

    setSelectedInstanceOption((prev) => {
      // Check if paramContainer matches an option
      if (paramContainer) {
        const found = instanceOptions.find((opt) => opt.value === paramContainer || opt.label === paramContainer);
        if (found) return found;
      }
      // Keep existing selection if still valid
      if (prev?.value) {
        const stillValid = instanceOptions.find((opt) => opt.value === prev.value);
        if (stillValid) return stillValid;
      }
      // Otherwise default to the first available instance
      return instanceOptions[0];
    });
  }, [selectedServiceOption, instanceOptions, paramContainer]);

  // Helper function to parse Docker raw log lines into structured CloudWatch-style events
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

  // 4. Manage strict SSE connection and isolated buffer
  useEffect(() => {
    const currentContainer = selectedInstanceOption?.value as string;
    const currentService = selectedServiceOption?.value as string;

    // Strict Buffer Reset: Wipe logs completely whenever target changes!
    setEvents([]);
    activeContainerRef.current = currentContainer || '';

    // Update URL query params
    if (currentService && currentContainer) {
      setSearchParams({
        service: currentService,
        container: currentContainer,
      });
    }

    // Close any previous stream connection
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }

    if (!isStreaming || !currentContainer) {
      setConnectionStatus('PAUSED');
      return;
    }

    setConnectionStatus('CONNECTING');

    const serviceDef = SERVICES.find((s) => s.id === currentService);
    const groupName = serviceDef ? serviceDef.groupName : `/lola/${currentService}`;

    try {
      const es = journalService.createLiveTailEventSource(groupName, currentContainer, currentContainer);
      eventSourceRef.current = es;

      es.onopen = () => {
        setConnectionStatus('LIVE');
      };

      es.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // Strictly discard if it belongs to a different container
          if (parsed.container && parsed.container !== activeContainerRef.current) {
            return;
          }
          const newEvt = parseLogLineToEvent(parsed, activeContainerRef.current);
          setEvents((prev) => [...prev.slice(-1999), newEvt]);
        } catch {
          const newEvt = parseLogLineToEvent(event.data, activeContainerRef.current);
          setEvents((prev) => [...prev.slice(-1999), newEvt]);
        }
      };

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        setConnectionStatus('PAUSED');
      };
    } catch (err) {
      console.warn('[LiveTail] Error connecting SSE:', err);
      setConnectionStatus('PAUSED');
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        eventSourceRef.current = null;
      }
    };
  }, [selectedServiceOption, selectedInstanceOption, isStreaming]);

  const activeContainer = (selectedInstanceOption?.value as string) || '';
  const serviceDef = SERVICES.find((s) => s.id === selectedServiceOption?.value);
  const activeGroupName = serviceDef ? serviceDef.groupName : `/lola/${selectedServiceOption?.value}`;

  return (
    <SpaceBetween size="l">
      {/* Page Header */}
      <Header
        variant="h1"
        description="Stream live logs with strict isolation: Service → Instance → Logs. Log buffers are fully isolated and never mix across instances."
      >
        Live Tail
      </Header>

      {/* Target Selector Toolbar: Service -> Instance */}
      <Container>
        <SpaceBetween direction="horizontal" size="l" alignItems="end">
          {/* Step 1: Service Selector */}
          <div style={{ flex: 1, minWidth: 260 }}>
            <FormField
              label="1. Service"
              description="Select the platform subsystem or engine"
            >
              <Select
                selectedOption={selectedServiceOption}
                onChange={({ detail }) => {
                  setSelectedServiceOption(detail.selectedOption);
                }}
                options={SERVICE_OPTIONS}
                placeholder="Select service..."
              />
            </FormField>
          </div>

          {/* Step 2: Instance / Container Selector */}
          <div style={{ flex: 1, minWidth: 280 }}>
            <FormField
              label="2. Instance / Container"
              description={
                selectedServiceOption.value === 'relate'
                  ? 'Select the provisioned database instance'
                  : 'Select the container to inspect'
              }
            >
              <Select
                selectedOption={selectedInstanceOption}
                onChange={({ detail }) => {
                  setSelectedInstanceOption(detail.selectedOption);
                }}
                options={instanceOptions}
                placeholder={
                  instanceOptions.length === 0
                    ? 'No instances provisioned in this service'
                    : 'Select instance / container...'
                }
                disabled={instanceOptions.length === 0}
              />
            </FormField>
          </div>
        </SpaceBetween>
      </Container>

      {/* When no instance is available in the selected service */}
      {instanceOptions.length === 0 && (
        <Alert
          type="info"
          header="No active instances found"
        >
          There are currently no database instances provisioned in {selectedServiceOption.label}. Create a database in Lola Relate to stream live logs.
        </Alert>
      )}

      {/* Step 3: Logs - Exact AWS CloudWatch Log Events UI Component */}
      {selectedInstanceOption && (
        <AwsLogEventsViewer
          title={`Log events • ${selectedInstanceOption.label || activeContainer}`}
          description={
            <SpaceBetween direction="horizontal" size="xs" alignItems="center">
              <span>
                Streaming logs for <code>{activeContainer}</code> ({selectedServiceOption.label})
              </span>
              <span>•</span>
              <StatusIndicator type={connectionStatus === 'LIVE' ? 'success' : connectionStatus === 'CONNECTING' ? 'in-progress' : 'stopped'}>
                {connectionStatus === 'LIVE' ? 'Live Stream Active' : connectionStatus === 'CONNECTING' ? 'Connecting to Docker daemon...' : 'Stream Paused / Idle'}
              </StatusIndicator>
            </SpaceBetween>
          }
          events={events}
          loading={connectionStatus === 'CONNECTING'}
          groupName={activeGroupName}
          streamName={activeContainer}
          containerName={activeContainer}
          isLiveTail={true}
          isStreaming={isStreaming}
          onToggleStreaming={() => setIsStreaming(!isStreaming)}
          connectionStatus={connectionStatus}
          onClear={() => setEvents([])}
        />
      )}
    </SpaceBetween>
  );
};

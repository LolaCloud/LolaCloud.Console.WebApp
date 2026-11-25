import React, { useEffect, useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  ColumnLayout,
  Box,
  StatusIndicator,
  Badge,
  Button,
  Alert,
  Cards,
} from '@cloudscape-design/components';
import { type OperatorIdentity, apiClient } from '../../../services/api';

interface LciDashboardViewProps {
  operator: OperatorIdentity;
  onNavigate: (tabId: string) => void;
}

export const LciDashboardView: React.FC<LciDashboardViewProps> = ({ operator, onNavigate }) => {
  const [healthStatus, setHealthStatus] = useState<'UP' | 'DOWN' | 'CHECKING'>('CHECKING');
  const [requestId, setRequestId] = useState<string | null>(null);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);

  useEffect(() => {
    let isMounted = true;
    const checkHealth = async () => {
      const start = performance.now();
      try {
        const res = await apiClient.get('/health');
        if (isMounted) {
          setLatencyMs(Math.round(performance.now() - start));
          setHealthStatus(res.data?.data?.status === 'UP' ? 'UP' : 'DOWN');
          setRequestId(res.data?.request_id || null);
        }
      } catch {
        if (isMounted) {
          setHealthStatus('DOWN');
        }
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 15000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <SpaceBetween size="l">
      <Alert
        type={healthStatus === 'UP' ? 'info' : 'warning'}
        header="Lola Core Identity (LCI) Status"
      >
        LCI is operational as the central IAM authority. Inter-service authentication, JWT signing,
        and wildcard RBAC permission matching are active in memory.
      </Alert>

      <Container
        header={
          <Header
            variant="h2"
            description="Security overview, authorization metrics and live gateway health"
          >
            IAM & Identity Summary
          </Header>
        }
      >
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Active Operators</Box>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'inherit', marginTop: '4px' }}>
              1
            </div>
            <Box variant="small" color="text-body-secondary">
              1 super admin with full bypass
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">RBAC Policy Engine</Box>
            <div style={{ fontSize: '28px', fontWeight: 700, color: '#1d8102', marginTop: '4px' }}>
              Hierarchical
            </div>
            <Box variant="small" color="text-body-secondary">
              Zero-DB in-memory evaluation
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Service Health (Port 8080)</Box>
            <div style={{ marginTop: '8px' }}>
              {healthStatus === 'UP' ? (
                <StatusIndicator type="success">
                  Operational {latencyMs !== null ? `(${latencyMs}ms)` : ''}
                </StatusIndicator>
              ) : healthStatus === 'CHECKING' ? (
                <StatusIndicator type="loading">Checking...</StatusIndicator>
              ) : (
                <StatusIndicator type="error">Offline</StatusIndicator>
              )}
            </div>
            {requestId && (
              <Box variant="small" color="text-body-secondary">
                Trace: {requestId.substring(0, 8)}...
              </Box>
            )}
          </div>

          <div>
            <Box variant="awsui-key-label">Token Protocol</Box>
            <div style={{ fontSize: '28px', fontWeight: 700, color: 'inherit', marginTop: '4px' }}>
              JWT HS512
            </div>
            <Box variant="small" color="text-body-secondary">
              Stateless 24h bearer tokens
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      <Cards
        cardDefinition={{
          header: (item) => (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600 }}>{item.title}</span>
              <Badge color={item.badgeColor as any}>{item.badge}</Badge>
            </div>
          ),
          sections: [
            {
              id: 'desc',
              content: (item) => item.description,
            },
            {
              id: 'action',
              content: (item) => (
                <Button onClick={() => onNavigate(item.targetTab)} variant="normal">
                  {item.actionText}
                </Button>
              ),
            },
          ],
        }}
        cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 3 }]}
        items={[
          {
            title: 'Operators Directory',
            badge: '1 Operator',
            badgeColor: 'blue',
            description:
              'Manage operator credentials, assign RBAC permission strings and view identity UUIDs.',
            targetTab: 'operators',
            actionText: 'Manage Operators',
          },
          {
            title: 'RBAC Permission Matrix',
            badge: 'In-Memory',
            badgeColor: 'green',
            description:
              'Evaluate permission slugs in the format service::resource::action with prefix wildcards.',
            targetTab: 'rbac-policies',
            actionText: 'Test Permissions',
          },
          {
            title: 'Active JWT Session',
            badge: 'Authenticated',
            badgeColor: 'green',
            description:
              `Inspect current claims for operator ${operator.username}, expiry timestamp and cryptographic payload.`,
            targetTab: 'sessions',
            actionText: 'Inspect Session',
          },
        ]}
      />
    </SpaceBetween>
  );
};

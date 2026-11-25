import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AppLayout,
  BreadcrumbGroup,
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Cards,
  Badge,
  StatusIndicator,
  Alert,
  ColumnLayout,
} from '@cloudscape-design/components';
import { type OperatorIdentity } from '../services/api';

interface HomeDashboardProps {
  operator: OperatorIdentity;
  onSelectService?: (serviceKey: string) => void;
}

export const HomeDashboard: React.FC<HomeDashboardProps> = ({ operator, onSelectService }) => {
  const navigate = useNavigate();

  const handleSelectService = (serviceKey: string) => {
    if (serviceKey === 'lci') {
      navigate('/lci/dashboard');
    } else if (serviceKey === 'runway') {
      navigate('/runway/dashboard');
    } else if (serviceKey === 'relate') {
      navigate('/relate/dashboard');
    } else if (serviceKey === 'store') {
      navigate('/store/dashboard');
    } else if (serviceKey === 'journal') {
      navigate('/journal/dashboard');
    }
    if (onSelectService) {
      onSelectService(serviceKey);
    }
  };
  const services = [
    {
      key: 'lci',
      name: 'Lola Core Identity (LCI)',
      status: 'active',
      description: 'Central IAM authority, operator authentication, in-memory RBAC and JWT token issuance.',
      port: '8080',
      actionable: true,
    },
    {
      key: 'relate',
      name: 'Lola Relate (DBaaS)',
      status: 'active',
      description: 'Multi-tenant database engine with automatic TLS SNI routing, schema isolation, and resource quotas.',
      port: '8084',
      actionable: true,
    },
    {
      key: 'stacker',
      name: 'Lola Stacker (Containers)',
      status: 'pending',
      description: 'Docker Engine daemon orchestration via Unix socket, cgroups quotas and virtual bridges.',
      port: '8082',
      actionable: false,
    },
    {
      key: 'runway',
      name: 'Lola Runway (Edge & Networking)',
      status: 'active',
      description: 'Cloudflare DNS auto-sync, Auto-IP Fix daemon and reverse NAT traversal tunnels.',
      port: '8083',
      actionable: true,
    },
    {
      key: 'journal',
      name: 'Lola Journal (Observability & Logs)',
      status: 'active',
      description: 'Centralized observability, live container log streaming (Live Tail) and telemetry metrics engine.',
      port: '8087',
      actionable: true,
    },
    {
      key: 'store',
      name: 'Lola Store (S3 Object Storage)',
      status: 'active',
      description: 'AWS S3-compatible high-performance object storage engine powered by MinIO with pre-signed URLs and multi-bucket isolation.',
      port: '8086',
      actionable: true,
    },
  ];

  return (
    <AppLayout
      contentType="dashboard"
      headerSelector="#top-navigation"
      navigationHide
      toolsHide
      breadcrumbs={
        <BreadcrumbGroup
          items={[{ text: 'LolaCloud Console', href: '/' }]}
          onFollow={(event) => {
            event.preventDefault();
            navigate('/');
          }}
        />
      }
      content={
        <SpaceBetween size="l">
          <Header
            variant="h1"
            description="Unified control plane for container orchestration, edge networking, DBaaS, and identity."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button variant="primary" onClick={() => handleSelectService('lci')}>
                  Open LCI Console
                </Button>
              </SpaceBetween>
            }
          >
            LolaCloud Console
          </Header>

          <Alert
              type="info"
              header={`Welcome to LolaCloud, ${operator.username}!`}
            >
              Use the top search bar to find and launch services (e.g., search for <strong>LCI</strong> or <strong>IAM</strong>).
              Lola Core Identity is currently active and listening on port 8080.
            </Alert>

            <Container
              header={
                <Header
                  variant="h2"
                  description="Quick launch for active platform subsystems"
                >
                  Featured Service: Lola Core Identity
                </Header>
              }
            >
              <ColumnLayout columns={2}>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'inherit' }}>
                    Lola Core Identity (LCI)
                  </div>
                  <div style={{ marginTop: '8px' }}>
                    <Box variant="p" color="text-body-secondary">
                      Manage operators, in-memory RBAC permission slugs with wildcards, and cryptographic
                      bearer tokens for inter-service communication.
                    </Box>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <Button variant="primary" onClick={() => handleSelectService('lci')}>
                      Launch LCI Service Console
                    </Button>
                  </div>
                </div>

                <div>
                  <Box variant="awsui-key-label">Status</Box>
                  <div style={{ marginTop: '4px' }}>
                    <StatusIndicator type="success">Operational on Port 8080</StatusIndicator>
                  </div>

                  <div style={{ marginTop: '16px' }}>
                    <Box variant="awsui-key-label">Architectural Role</Box>
                    <div style={{ marginTop: '4px' }}>
                      <Badge color="blue">IAM Core / Inter-Service Authority</Badge>
                    </div>
                  </div>
                </div>
              </ColumnLayout>
            </Container>

            <Container
              header={
                <Header
                  variant="h2"
                  description="Ecosystem of specialized Linux-native microservices"
                >
                  All Platform Services
                </Header>
              }
            >
              <Cards
                cardDefinition={{
                  header: (item) => (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 600 }}>{item.name}</span>
                      {item.status === 'active' ? (
                        <Badge color="green">ONLINE</Badge>
                      ) : (
                        <Badge color="grey">STANDBY</Badge>
                      )}
                    </div>
                  ),
                  sections: [
                    {
                      id: 'description',
                      content: (item) => item.description,
                    },
                    {
                      id: 'port',
                      header: 'Port / Gateway',
                      content: (item) => (
                        <Box color="text-body-secondary">
                          <code>http://localhost:{item.port}</code>
                        </Box>
                      ),
                    },
                    {
                      id: 'action',
                      content: (item) =>
                        item.actionable ? (
                          <Button variant="normal" onClick={() => handleSelectService(item.key)}>
                            Open Console
                          </Button>
                        ) : (
                          <Button disabled variant="normal">
                            Initializing
                          </Button>
                        ),
                    },
                  ],
                }}
                cardsPerRow={[{ cards: 1 }, { minWidth: 500, cards: 2 }, { minWidth: 900, cards: 3 }]}
                items={services}
              />
            </Container>
          </SpaceBetween>
      }
    />
  );
};

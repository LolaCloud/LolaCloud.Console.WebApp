import React, { useState, useEffect, useMemo } from 'react';
import {
  Modal,
  FormField,
  Select,
  type SelectProps,
  Button,
  Alert,
  Box,
  SpaceBetween,
  StatusIndicator,
  Badge,
  Table,
  ColumnLayout,
  Link,
  Container,
  Header,
} from '@cloudscape-design/components';
import {
  runwayService,
  type EdgeTunnel,
  type ExposedService,
  type ExposePlatformResponse,
} from '../../../services/runwayService';

export interface ExposePlatformModalProps {
  visible: boolean;
  onDismiss: () => void;
  targetTunnel?: EdgeTunnel | null;
  tunnels?: EdgeTunnel[];
  onSuccess?: (response: ExposePlatformResponse) => void;
}

const DEFAULT_ZONES: SelectProps.Option[] = [
  { label: 'lola-cloud.dev', value: 'lola-cloud.dev', description: 'Primary LolaCloud Zero Trust Zone' },
  { label: 'benoapp.club', value: 'benoapp.club', description: 'Secondary Edge Gateway Zone' },
];

export const ExposePlatformModal: React.FC<ExposePlatformModalProps> = ({
  visible,
  onDismiss,
  targetTunnel,
  tunnels: initialTunnels,
  onSuccess,
}) => {
  const [selectedZone, setSelectedZone] = useState<SelectProps.Option>(DEFAULT_ZONES[0]);
  const [zoneOptions, setZoneOptions] = useState<SelectProps.Option[]>(DEFAULT_ZONES);
  const [allTunnels, setAllTunnels] = useState<EdgeTunnel[]>(initialTunnels || []);
  const [selectedTunnelOption, setSelectedTunnelOption] = useState<SelectProps.Option | null>(null);

  const [isExposing, setIsExposing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [result, setResult] = useState<ExposePlatformResponse | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Initialize data when modal becomes visible
  useEffect(() => {
    if (!visible) return;

    // Load zones
    runwayService
      .getZones()
      .then((zones) => {
        if (zones && zones.length > 0) {
          const zoneMap = new Map<string, SelectProps.Option>();
          DEFAULT_ZONES.forEach((dz) => zoneMap.set(dz.value as string, dz));
          zones.forEach((z) => {
            if (!zoneMap.has(z.name)) {
              zoneMap.set(z.name, {
                label: z.name,
                value: z.name,
                description: `Zone ID: ${z.id.substring(0, 10)}...`,
              });
            }
          });
          setZoneOptions(Array.from(zoneMap.values()));
        }
      })
      .catch((err) => {
        console.warn('Could not load dynamic zones, using defaults:', err);
      });

    // Resolve target tunnel
    if (targetTunnel) {
      setAllTunnels([targetTunnel]);
      setSelectedTunnelOption({
        label: `${targetTunnel.name} (${targetTunnel.tunnelId.substring(0, 8)}...)`,
        value: targetTunnel.id || targetTunnel.tunnelId,
        description: targetTunnel.isHostServer ? 'Host Server' : targetTunnel.status,
      });
    } else {
      runwayService
        .getTunnels()
        .then((tuns) => {
          setAllTunnels(tuns);
          if (tuns.length > 0) {
            const hostTunnel = tuns.find((t) => t.isHostServer) || tuns.find((t) => t.name.toLowerCase() === 'kali') || tuns[0];
            setSelectedTunnelOption({
              label: `${hostTunnel.name} (${hostTunnel.tunnelId.substring(0, 8)}...)`,
              value: hostTunnel.id || hostTunnel.tunnelId,
              description: hostTunnel.isHostServer ? 'Host Server' : hostTunnel.status,
            });
          }
        })
        .catch((err) => {
          console.warn('Could not fetch tunnels for modal:', err);
        });
    }
  }, [visible, targetTunnel]);

  const activeTunnel = useMemo(() => {
    if (targetTunnel) return targetTunnel;
    if (!selectedTunnelOption) return allTunnels[0] || null;
    return allTunnels.find((t) => (t.id || t.tunnelId) === selectedTunnelOption.value) || allTunnels[0] || null;
  }, [targetTunnel, selectedTunnelOption, allTunnels]);

  const domain = (selectedZone.value as string) || 'lola-cloud.dev';

  const previewServices = useMemo(() => [
    {
      name: 'Lola Console Frontend',
      subdomain: `console-lola.${domain}`,
      targetUrl: 'http://localhost:5173',
      type: 'Web Application UI',
      port: 5173,
    },
    {
      name: 'LCI Identity & Auth Backend',
      subdomain: `lci-lola.${domain}`,
      targetUrl: 'http://localhost:8080',
      type: 'REST API & JWT Service',
      port: 8080,
    },
    {
      name: 'Runway Edge Microservice',
      subdomain: `runway-lola.${domain}`,
      targetUrl: 'http://localhost:8083',
      type: 'Ingress Engine & SSE Tail',
      port: 8083,
    },
    {
      name: 'Relate DBaaS Microservice',
      subdomain: `relate-lola.${domain}`,
      targetUrl: 'http://localhost:8084',
      type: 'DBaaS REST API & Orchestrator',
      port: 8084,
    },
    {
      name: 'Store S3 Control Plane',
      subdomain: `store-lola.${domain}`,
      targetUrl: 'http://localhost:8086',
      type: 'S3 REST Control Plane & IAM',
      port: 8086,
    },
    {
      name: 'MinIO S3 Engine API',
      subdomain: `s3-lola.${domain}`,
      targetUrl: 'http://localhost:9000',
      type: 'S3 Engine & Object Data Plane',
      port: 9000,
    },
    {
      name: 'Lola Journal (Observability & Logs)',
      subdomain: `journal-lola.${domain}`,
      targetUrl: 'http://localhost:8087',
      type: 'Observability & Live Tail SSE',
      port: 8087,
    },
  ], [domain]);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    }
  };

  const handleExposeNow = async () => {
    setIsExposing(true);
    setErrorMessage(null);

    const tunnelId = activeTunnel?.id || activeTunnel?.tunnelId;

    try {
      const response = await runwayService.exposePlatform({
        zoneName: domain,
        tunnelId,
      });

      setResult(response);
      onSuccess?.(response);
    } catch (err: unknown) {
      console.error('Platform exposure failed:', err);
      const msg = err instanceof Error ? err.message : 'Failed to expose platform over Cloudflare Tunnel';
      setErrorMessage(msg);
    } finally {
      setIsExposing(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setErrorMessage(null);
    onDismiss();
  };

  const consoleExposed = result?.services.find(
    (s) => s.subdomain === 'console-lola' || s.hostname.startsWith('console-lola.')
  );
  const consoleUrl = consoleExposed ? consoleExposed.publicUrl : `https://console-lola.${domain}`;

  return (
    <Modal
      visible={visible}
      onDismiss={handleClose}
      size="large"
      header="Expose Lola Platform via Cloudflare Zero Trust"
      closeAriaLabel="Close modal"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            {result ? (
              <>
                <Button variant="link" onClick={() => setResult(null)}>
                  Configure Again
                </Button>
                <Button variant="primary" onClick={handleClose}>
                  Done
                </Button>
              </>
            ) : (
              <>
                <Button variant="link" onClick={handleClose} disabled={isExposing}>
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  iconName="share"
                  loading={isExposing}
                  onClick={handleExposeNow}
                >
                  Expose Platform Now
                </Button>
              </>
            )}
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="m">
        {/* Subtitle */}
        <Box variant="p" color="text-body-secondary">
          Publish Lola Console, LCI Auth, and Runway Edge to the public internet using Cloudflare Tunnel with zero open ports and automatic HTTPS.
        </Box>

        {errorMessage && (
          <Alert type="error" dismissible onDismiss={() => setErrorMessage(null)} header="Exposure Failed">
            {errorMessage}
          </Alert>
        )}

        {/* Success View */}
        {result ? (
          <SpaceBetween size="l">
            <Alert
              type="success"
              header="Platform Successfully Exposed via Cloudflare Zero Trust!"
            >
              DNS records and Cloudflare Ingress routes have been provisioned. Traffic is encrypted end-to-end via Cloudflare Edge.
            </Alert>

            <Container
              header={
                <Header
                  variant="h2"
                  description="Live public endpoints secured with automated Cloudflare TLS/SSL certificates."
                  actions={
                    <Button
                      variant="primary"
                      iconName="external"
                      iconAlign="right"
                      href={consoleUrl}
                      target="_blank"
                    >
                      Open Console in New Tab
                    </Button>
                  }
                >
                  Published Service Endpoints
                </Header>
              }
            >
              <Table
                columnDefinitions={[
                  {
                    id: 'name',
                    header: 'Service',
                    cell: (item: ExposedService) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#5f6b7a' }}>Local target: {item.targetUrl}</div>
                      </div>
                    ),
                  },
                  {
                    id: 'publicUrl',
                    header: 'Public HTTPS URL',
                    cell: (item: ExposedService) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Link href={item.publicUrl} target="_blank" external>
                          {item.publicUrl}
                        </Link>
                        <Button
                          variant="inline-icon"
                          iconName="copy"
                          ariaLabel={`Copy URL for ${item.name}`}
                          onClick={() => handleCopy(item.publicUrl, item.name)}
                        />
                        {copiedKey === item.name && (
                          <Badge color="green">Copied!</Badge>
                        )}
                      </div>
                    ),
                  },
                  {
                    id: 'status',
                    header: 'Status',
                    cell: () => <StatusIndicator type="success">Active</StatusIndicator>,
                  },
                ]}
                items={result.services}
                trackBy="name"
              />
            </Container>

            <Alert type="info">
              <div>
                <strong>Automatic Remote Routing Active:</strong> When accessing <code>{consoleUrl}</code>, Lola Console dynamically connects to <code>https://lci-lola.{result.zoneName}</code> and <code>https://runway-lola.{result.zoneName}</code>. No port forwarding or localhost reconfiguration is required.
              </div>
            </Alert>
          </SpaceBetween>
        ) : (
          /* Configuration & Preview View */
          <SpaceBetween size="l">
            <ColumnLayout columns={2}>
              <FormField
                label="Target Cloudflare Zone / Domain"
                description="Select authoritative root domain for public access"
              >
                <Select
                  selectedOption={selectedZone}
                  onChange={({ detail }) => setSelectedZone(detail.selectedOption)}
                  options={zoneOptions}
                />
              </FormField>

              <FormField
                label="Target Zero Trust Tunnel"
                description="Tunnel agent establishing secure egress to Cloudflare edge"
              >
                {allTunnels.length > 1 && !targetTunnel ? (
                  <Select
                    selectedOption={selectedTunnelOption}
                    onChange={({ detail }) => setSelectedTunnelOption(detail.selectedOption)}
                    options={allTunnels.map((t) => ({
                      label: `${t.name} (${t.tunnelId.substring(0, 8)}...)`,
                      value: t.id || t.tunnelId,
                      description: t.isHostServer ? 'Host Server' : t.status,
                    }))}
                  />
                ) : (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontWeight: 600, fontSize: '15px' }}>{activeTunnel?.name || 'Kali'}</span>
                    <Badge color="blue">Host Server</Badge>
                    <Badge color="green">Healthy</Badge>
                    <code style={{ fontSize: '12px', color: '#5f6b7a' }}>
                      {activeTunnel?.tunnelId ? `${activeTunnel.tunnelId.substring(0, 8)}...` : ''}
                    </code>
                  </div>
                )}
              </FormField>
            </ColumnLayout>

            <Container
              header={
                <Header
                  variant="h3"
                  counter={`(${previewServices.length} services)`}
                  description="Cloudflare Ingress rules and CNAME records will be provisioned simultaneously."
                >
                  Architecture &amp; Routing Preview
                </Header>
              }
            >
              <Table
                columnDefinitions={[
                  {
                    id: 'name',
                    header: 'Lola Component',
                    cell: (item) => (
                      <div>
                        <div style={{ fontWeight: 600 }}>{item.name}</div>
                        <div style={{ fontSize: '12px', color: '#5f6b7a' }}>{item.type}</div>
                      </div>
                    ),
                  },
                  {
                    id: 'subdomain',
                    header: 'Public Ingress Route',
                    cell: (item) => (
                      <div>
                        <code style={{ fontWeight: 600, color: '#0972d3' }}>
                          https://{item.subdomain}
                        </code>
                      </div>
                    ),
                  },
                  {
                    id: 'target',
                    header: 'Local Origin Port',
                    cell: (item) => (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <code>{item.targetUrl}</code>
                        <StatusIndicator type="success">Listening</StatusIndicator>
                      </div>
                    ),
                  },
                  {
                    id: 'encryption',
                    header: 'Security',
                    cell: () => (
                      <SpaceBetween direction="horizontal" size="xxs">
                        <Badge color="green">Auto HTTPS</Badge>
                        <Badge color="blue">Zero Trust</Badge>
                      </SpaceBetween>
                    ),
                  },
                ]}
                items={previewServices}
                trackBy="name"
              />
            </Container>

            <Alert type="info">
              DNS records and Cloudflare Ingress routes will be provisioned. Traffic is encrypted end-to-end via Cloudflare Edge with 0 inbound firewall rules required.
            </Alert>
          </SpaceBetween>
        )}
      </SpaceBetween>
    </Modal>
  );
};

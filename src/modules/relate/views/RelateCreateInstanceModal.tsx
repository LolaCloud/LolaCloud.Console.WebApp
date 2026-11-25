import React, { useState, useEffect } from 'react';
import {
  Modal,
  Box,
  SpaceBetween,
  FormField,
  Input,
  Select,
  Button,
  Alert,
  ColumnLayout,
  Container,
  Header,
  Toggle,
  Checkbox,
  type SelectProps,
} from '@cloudscape-design/components';
import {
  type EngineType,
  type InstanceTier,
  type CreateInstanceRequest,
  type DatabaseInstance,
  type RunwayZoneDto,
  relateService,
} from '../../../services/relateService';

interface RelateCreateInstanceModalProps {
  visible: boolean;
  onDismiss: () => void;
  onCreated: (instance: DatabaseInstance) => void;
}

const ENGINE_OPTIONS: SelectProps.Option[] = [
  {
    label: 'PostgreSQL',
    value: 'POSTGRESQL',
    description: 'Advanced open-source relational database with native JSON and pgvector support',
  },
  {
    label: 'MySQL',
    value: 'MYSQL',
    description: 'Fast, reliable and ubiquitous relational database system',
  },
  {
    label: 'Microsoft SQL Server',
    value: 'SQLSERVER',
    description: 'Enterprise enterprise-grade relational database management system',
  },
];

const VERSION_OPTIONS: Record<EngineType, SelectProps.Option[]> = {
  POSTGRESQL: [
    { label: 'PostgreSQL 17 (Latest stable)', value: '17' },
    { label: 'PostgreSQL 16 (LTS)', value: '16' },
    { label: 'PostgreSQL 15', value: '15' },
  ],
  MYSQL: [
    { label: 'MySQL 8.0 (General Availability)', value: '8.0' },
    { label: 'MySQL 8.4 (LTS)', value: '8.4' },
  ],
  SQLSERVER: [
    { label: 'SQL Server 2022 (Developer Edition)', value: '2022' },
    { label: 'SQL Server 2019', value: '2019' },
  ],
};

const TIER_OPTIONS: SelectProps.Option[] = [
  {
    label: 'Micro (512 MB RAM, 0.5 vCPU)',
    value: 'MICRO_512MB',
    description: 'Lightweight development, test environments, and sandbox workloads',
  },
  {
    label: 'Standard (1 GB RAM, 1.0 vCPU)',
    value: 'STANDARD_1GB',
    description: 'Recommended for standard web services, staging, and microservices',
  },
  {
    label: 'Pro (2 GB RAM, 2.0 vCPU)',
    value: 'PRO_2GB',
    description: 'High throughput, caching, analytical queries, and production loads',
  },
];

export const RelateCreateInstanceModal: React.FC<RelateCreateInstanceModalProps> = ({
  visible,
  onDismiss,
  onCreated,
}) => {
  const [engine, setEngine] = useState<EngineType>('POSTGRESQL');
  const [version, setVersion] = useState<string>('17');
  const [name, setName] = useState('');
  const [tier, setTier] = useState<InstanceTier>('STANDARD_1GB');
  const [storageGb, setStorageGb] = useState('10');
  const [adminUsername, setAdminUsername] = useState('lola_admin');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [defaultDatabase, setDefaultDatabase] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Runway DNS & DDNS Integration states
  const [enableRunway, setEnableRunway] = useState(true);
  const [zones, setZones] = useState<RunwayZoneDto[]>([]);
  const [selectedZone, setSelectedZone] = useState<RunwayZoneDto | null>(null);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [enableDdns, setEnableDdns] = useState(true);

  // Fetch available zones on modal open
  useEffect(() => {
    if (visible) {
      let isMounted = true;
      setIsLoadingZones(true);
      relateService
        .getRunwayZones()
        .then((availableZones) => {
          if (!isMounted) return;
          setZones(availableZones);
          if (availableZones.length > 0) {
            setSelectedZone((prev) =>
              prev ? availableZones.find((z) => z.id === prev.id) || availableZones[0] : availableZones[0]
            );
          }
        })
        .catch((err) => {
          console.error('Failed to load Runway DNS zones:', err);
        })
        .finally(() => {
          if (isMounted) setIsLoadingZones(false);
        });
      return () => {
        isMounted = false;
      };
    }
  }, [visible]);

  // Derive generated fields - strictly enforce 1-level subdomain under zone
  const cleanName = name.trim().toLowerCase();
  const activeZone = selectedZone || (zones.length > 0 ? zones[0] : null);
  const activeZoneName = activeZone?.name || 'lola-cloud.dev';
  const defaultSubdomain = cleanName ? `${cleanName}-db` : 'app-db';
  const effectiveSubdomain = (subdomain.trim() || defaultSubdomain).toLowerCase();
  const effectiveHost = enableRunway
    ? `${effectiveSubdomain}.${activeZoneName}`
    : `${effectiveSubdomain}.lola-cloud.dev`;
  const effectiveDatabase = defaultDatabase.trim() || (cleanName ? cleanName.replace(/-/g, '_') : 'app_db');
  const effectiveUsername = adminUsername.trim() || 'lola_admin';
  const port = engine === 'MYSQL' ? 3306 : engine === 'SQLSERVER' ? 1433 : 5432;
  const hostSniPreview = `${effectiveHost}:${port}`;

  const connectionStringPreview = (() => {
    const passDisplay = adminPassword.trim() ? adminPassword.trim() : '••••••••';
    switch (engine) {
      case 'POSTGRESQL':
        return `postgresql://${effectiveUsername}:${passDisplay}@${effectiveHost}:${port}/${effectiveDatabase}?sslmode=require`;
      case 'MYSQL':
        return `mysql://${effectiveUsername}:${passDisplay}@${effectiveHost}:${port}/${effectiveDatabase}?useSSL=true&requireSSL=true`;
      case 'SQLSERVER':
        return `sqlserver://${effectiveHost}:${port};databaseName=${effectiveDatabase};user=${effectiveUsername};password=${passDisplay};encrypt=true;trustServerCertificate=false`;
    }
  })();

  const handleEngineChange = (newEngine: EngineType) => {
    setEngine(newEngine);
    const defaultVer = VERSION_OPTIONS[newEngine][0]?.value || '17';
    setVersion(defaultVer);
  };

  const validateName = (val: string): string | null => {
    if (!val.trim()) return 'Database name is required';
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$/.test(val)) {
      return 'Name must contain only alphanumeric characters and hyphens, and cannot start or end with a hyphen';
    }
    if (val.length < 3 || val.length > 63) {
      return 'Name must be between 3 and 63 characters long';
    }
    return null;
  };

  const validateSubdomain = (val: string): string | null => {
    if (!val.trim()) return null;
    const clean = val.trim().toLowerCase();
    if (clean.includes('.')) {
      return 'Multi-level subdomains with dots are not supported (e.g. a.b.c). Cloudflare certificates only support 1-level subdomains. Use hyphens instead (e.g. loja-db).';
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(clean)) {
      return 'Subdomain must contain only lowercase letters, numbers, and hyphens (cannot start or end with a hyphen).';
    }
    if (clean.length > 63) {
      return 'Subdomain cannot exceed 63 characters.';
    }
    return null;
  };

  const nameError = name ? validateName(name) : null;
  const subdomainError = subdomain ? validateSubdomain(subdomain) : null;

  const handleSubmit = async () => {
    const validation = validateName(name);
    if (validation) {
      setErrorMessage(validation);
      return;
    }

    const subValidation = validateSubdomain(subdomain);
    if (subValidation) {
      setErrorMessage(subValidation);
      return;
    }

    setErrorMessage(null);
    setIsSubmitting(true);

    try {
      const payload: CreateInstanceRequest = {
        name: name.trim(),
        engine,
        version,
        tier,
        storageGb: parseInt(storageGb, 10) || 10,
        adminUsername: effectiveUsername,
        adminPassword: adminPassword.trim() || undefined,
        defaultDatabase: effectiveDatabase,
        enableRunwayIntegration: enableRunway,
        zoneId: enableRunway && activeZone ? activeZone.id : undefined,
        zoneName: enableRunway ? activeZoneName : undefined,
        hostname: effectiveHost,
        enableDdns: enableRunway ? enableDdns : false,
      };

      const created = await relateService.createInstance(payload);
      onCreated(created);
      onDismiss();
    } catch (err: any) {
      console.error('Failed to create database instance:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to provision database instance';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      onDismiss={onDismiss}
      header={<Header variant="h2">Provision Database Instance</Header>}
      size="large"
      footer={
        <Box float="right">
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onDismiss} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              onClick={handleSubmit}
              disabled={!name.trim() || Boolean(nameError)}
            >
              Provision Database
            </Button>
          </SpaceBetween>
        </Box>
      }
    >
      <SpaceBetween size="l">
        {errorMessage && (
          <Alert type="error" dismissible onDismiss={() => setErrorMessage(null)}>
            {errorMessage}
          </Alert>
        )}

        {/* Engine Specification */}
        <Container header={<Header variant="h3">Database Engine</Header>}>
          <ColumnLayout columns={2}>
            <FormField label="Engine Architecture" description="Select the relational database engine type">
              <Select
                selectedOption={ENGINE_OPTIONS.find((o) => o.value === engine) || null}
                onChange={({ detail }) => {
                  if (detail.selectedOption.value) {
                    handleEngineChange(detail.selectedOption.value as EngineType);
                  }
                }}
                options={ENGINE_OPTIONS}
              />
            </FormField>

            <FormField label="Engine Version" description="Database engine major release">
              <Select
                selectedOption={VERSION_OPTIONS[engine].find((o) => o.value === version) || null}
                onChange={({ detail }) => {
                  if (detail.selectedOption.value) {
                    setVersion(detail.selectedOption.value);
                  }
                }}
                options={VERSION_OPTIONS[engine]}
              />
            </FormField>
          </ColumnLayout>
        </Container>

        {/* Instance Identity */}
        <Container header={<Header variant="h3">Instance Identity</Header>}>
          <FormField
            label="Database Identifier"
            description="Unique cluster identifier used for Traefik SNI routing and container naming"
            errorText={nameError}
          >
            <Input
              value={name}
              onChange={({ detail }) => setName(detail.value)}
              placeholder="e.g. ecommerce-db"
            />
          </FormField>
        </Container>

        {/* Runway DNS & DDNS Section */}
        <Container
          header={
            <Header
              variant="h3"
              description="Edge DNS routing and Dynamic DNS synchronization via Cloudflare & Runway"
            >
              Runway DNS & DDNS Integration
            </Header>
          }
        >
          <SpaceBetween size="m">
            <Toggle
              checked={enableRunway}
              onChange={({ detail }) => setEnableRunway(detail.checked)}
            >
              Integrate with Runway DNS & Cloudflare (Recommended)
            </Toggle>

            {enableRunway ? (
              <SpaceBetween size="m">
                <ColumnLayout columns={2}>
                  <FormField
                    label="Cloudflare DNS Zone"
                    description="Select the registered domain zone managed by Runway"
                  >
                    <Select
                      selectedOption={
                        activeZone
                          ? {
                              label: activeZone.name,
                              value: activeZone.id,
                              description: activeZone.accountName
                                ? `${activeZone.accountName} (${activeZone.recordsCount || 0} records)`
                                : undefined,
                            }
                          : null
                      }
                      onChange={({ detail }) => {
                        const found = zones.find((z) => z.id === detail.selectedOption.value);
                        if (found) setSelectedZone(found);
                      }}
                      options={zones.map((z) => ({
                        label: z.name,
                        value: z.id,
                        description: z.accountName
                          ? `${z.accountName} (${z.recordsCount || 0} records)`
                          : undefined,
                      }))}
                      statusType={isLoadingZones ? 'loading' : 'finished'}
                      placeholder="Select a DNS zone..."
                    />
                  </FormField>

                  <FormField
                    label="Subdomain (1-level only)"
                    description={`Subdomain prefix under .${activeZoneName} (e.g. loja-db). No dots allowed.`}
                    errorText={subdomainError}
                  >
                    <Input
                      value={subdomain}
                      onChange={({ detail }) => setSubdomain(detail.value.toLowerCase().replace(/\s+/g, '-'))}
                      placeholder={defaultSubdomain}
                    />
                  </FormField>
                </ColumnLayout>

                {/* Live Computed HostSNI Preview */}
                <div
                  style={{
                    backgroundColor: 'rgba(59, 130, 246, 0.08)',
                    padding: '12px 16px',
                    borderRadius: '8px',
                    border: '1px solid rgba(59, 130, 246, 0.3)',
                  }}
                >
                  <Box fontSize="body-s" color="text-status-inactive">
                    Live Computed HostSNI Preview:
                  </Box>
                  <Box fontSize="heading-s" variant="code" color="text-status-info">
                    {hostSniPreview}
                  </Box>
                  <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xxs' }}>
                    Clients will connect to this endpoint via Traefik Layer 4 TCP HostSNI with end-to-end TLS passthrough.
                  </Box>
                </div>

                <Checkbox
                  checked={enableDdns}
                  onChange={({ detail }) => setEnableDdns(detail.checked)}
                >
                  Enable DDNS (Auto-IP Fix) - Automatically keep DNS synced with server's dynamic public IP
                </Checkbox>

                <Alert type="info">
                  Cloudflare DNS: An <strong>A</strong> record with <strong>DNS only</strong> (Proxy disabled) will be provisioned in Cloudflare. This ensures clients connect directly to Traefik's Layer 4 TCP HostSNI router on port 5432 with end-to-end TLS encryption.
                </Alert>
              </SpaceBetween>
            ) : (
              <div
                style={{
                  backgroundColor: 'rgba(120, 120, 120, 0.1)',
                  padding: '12px 16px',
                  borderRadius: '8px',
                  border: '1px solid rgba(120, 120, 120, 0.2)',
                }}
              >
                <Box fontSize="body-s" color="text-status-inactive">
                  Local HostSNI Ingress Domain:
                </Box>
                <Box fontSize="heading-s" variant="code" color="text-status-inactive">
                  {effectiveHost}:{port}
                </Box>
                <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xxs' }}>
                  Cloudflare DNS and DDNS auto-sync disabled. You must configure DNS records manually.
                </Box>
              </div>
            )}
          </SpaceBetween>
        </Container>

        {/* Compute & Storage */}
        <Container header={<Header variant="h3">Compute & Storage Sizing</Header>}>
          <ColumnLayout columns={2}>
            <FormField label="Compute Tier" description="vCPU quotas and cgroups memory limits">
              <Select
                selectedOption={TIER_OPTIONS.find((o) => o.value === tier) || null}
                onChange={({ detail }) => {
                  if (detail.selectedOption.value) {
                    setTier(detail.selectedOption.value as InstanceTier);
                  }
                }}
                options={TIER_OPTIONS}
              />
            </FormField>

            <FormField label="Allocated Storage (GB)" description="Persistent NVMe block storage volume">
              <Input
                type="number"
                value={storageGb}
                onChange={({ detail }) => setStorageGb(detail.value)}
                inputMode="numeric"
              />
            </FormField>
          </ColumnLayout>
        </Container>

        {/* Master Credentials & Database Setup */}
        <Container header={<Header variant="h3">Initial Database & Master Credentials</Header>}>
          <ColumnLayout columns={2}>
            <FormField
              label="Initial Database Name"
              description="Default database schema created upon instance initialization"
            >
              <Input
                value={defaultDatabase}
                onChange={({ detail }) => setDefaultDatabase(detail.value)}
                placeholder={cleanName ? cleanName.replace(/-/g, '_') : 'app_db'}
              />
            </FormField>

            <FormField label="Master Username" description="Superuser administrator role">
              <Input
                value={adminUsername}
                onChange={({ detail }) => setAdminUsername(detail.value)}
                placeholder="lola_admin"
              />
            </FormField>

            <FormField
              label="Master Password"
              description="Leave blank to generate a high-entropy 24-character password"
            >
              <SpaceBetween direction="horizontal" size="xs">
                <div style={{ flex: 1 }}>
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={adminPassword}
                    onChange={({ detail }) => setAdminPassword(detail.value)}
                    placeholder="Auto-generated secure password"
                  />
                </div>
                <Button
                  variant="normal"
                  iconName={showPassword ? 'lock-private' : 'unlocked'}
                  onClick={() => setShowPassword(!showPassword)}
                  ariaLabel={showPassword ? 'Hide password' : 'Show password'}
                />
              </SpaceBetween>
            </FormField>
          </ColumnLayout>
        </Container>

        {/* Connection String Preview */}
        <Container header={<Header variant="h3">Connection String Preview</Header>}>
          <div
            style={{
              padding: '12px 14px',
              backgroundColor: 'rgba(0, 0, 0, 0.25)',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '13px',
              wordBreak: 'break-all',
              border: '1px solid rgba(120, 120, 120, 0.2)',
            }}
          >
            {connectionStringPreview}
          </div>
          <Box fontSize="body-s" color="text-status-inactive" margin={{ top: 'xs' }}>
            Requires TLS/SSL enabled connection string (`sslmode=require`).
          </Box>
        </Container>
      </SpaceBetween>
    </Modal>
  );
};

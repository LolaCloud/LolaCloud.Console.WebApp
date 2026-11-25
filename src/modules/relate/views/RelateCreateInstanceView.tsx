import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Form,
  Container,
  Header,
  FormField,
  Input,
  Select,
  Tiles,
  Button,
  SpaceBetween,
  Alert,
  Box,
  Toggle,
  Checkbox,
  ColumnLayout,
  KeyValuePairs,
  type SelectProps,
} from '@cloudscape-design/components';
import {
  type EngineType,
  type CreateInstanceRequest,
  type RunwayZoneDto,
  type DatabaseBackup,
  relateService,
  formatBytes,
} from '../../../services/relateService';

const ENGINE_TILES = [
  {
    value: 'POSTGRESQL',
    label: 'PostgreSQL',
    description: 'Advanced open-source relational database with native JSON and pgvector support',
  },
  {
    value: 'MYSQL',
    label: 'MySQL',
    description: 'Fast, reliable and ubiquitous relational database system',
  },
  {
    value: 'SQLSERVER',
    label: 'Microsoft SQL Server',
    description: 'Enterprise-grade relational database management system (Developer Edition)',
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

export const RelateCreateInstanceView: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const queryRestoreId = searchParams.get('restoreFromBackupId') || '';

  // Restore from snapshot state
  const [availableBackups, setAvailableBackups] = useState<DatabaseBackup[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [enableRestore, setEnableRestore] = useState(Boolean(queryRestoreId));
  const [selectedBackupOption, setSelectedBackupOption] = useState<SelectProps.Option | null>(null);

  // Engine state
  const [engine, setEngine] = useState<EngineType>('POSTGRESQL');
  const [version, setVersion] = useState<string>('17');

  // Settings state
  const [name, setName] = useState('');
  const [defaultDatabase, setDefaultDatabase] = useState('postgres');
  const [adminUsername, setAdminUsername] = useState('postgres');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Runway DNS & DDNS state
  const [enableRunway, setEnableRunway] = useState(true);
  const [zones, setZones] = useState<RunwayZoneDto[]>([]);
  const [selectedZone, setSelectedZone] = useState<RunwayZoneDto | null>(null);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [subdomain, setSubdomain] = useState('');
  const [enableDdns, setEnableDdns] = useState(true);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch available zones on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingZones(true);
    relateService
      .getRunwayZones()
      .then((availableZones) => {
        if (!isMounted) return;
        setZones(availableZones);
        if (availableZones.length > 0) {
          setSelectedZone(availableZones[0]);
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
  }, []);

  const handleEngineChange = React.useCallback((newEngine: EngineType) => {
    setEngine(newEngine);
    const defaultVer = VERSION_OPTIONS[newEngine][0]?.value || '17';
    setVersion(defaultVer);

    if (newEngine === 'POSTGRESQL') {
      setAdminUsername((u) => (u === 'root' || u === 'sa' || u === 'lola_admin' ? 'postgres' : u));
      setDefaultDatabase((d) => (d === 'app_db' || !d ? 'postgres' : d));
    } else if (newEngine === 'MYSQL') {
      setAdminUsername((u) => (u === 'postgres' || u === 'sa' ? 'lola_admin' : u));
      setDefaultDatabase((d) => (d === 'postgres' ? 'app_db' : d));
    } else if (newEngine === 'SQLSERVER') {
      setAdminUsername((u) => (u === 'postgres' ? 'sa' : u));
      setDefaultDatabase((d) => (d === 'postgres' ? 'app_db' : d));
    }
  }, []);

  // Fetch available backups for snapshot restoration
  useEffect(() => {
    let isMounted = true;
    setIsLoadingBackups(true);
    relateService
      .getBackups()
      .then((bList) => {
        if (!isMounted) return;
        setAvailableBackups(bList);
        if (queryRestoreId) {
          const targetB = bList.find((b) => b.id === queryRestoreId);
          if (targetB) {
            setEnableRestore(true);
            setSelectedBackupOption({
              label: `${targetB.name} (${targetB.engine} - ${formatBytes(targetB.sizeBytes)}) [${targetB.instanceName}]`,
              value: targetB.id,
            });
            handleEngineChange(targetB.engine);
            setName(`${targetB.name}-restored`);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load database backups:', err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingBackups(false);
      });
    return () => {
      isMounted = false;
    };
  }, [queryRestoreId, handleEngineChange]);

  const handleBackupSelect = (opt: SelectProps.Option) => {
    setSelectedBackupOption(opt);
    const b = availableBackups.find((item) => item.id === opt.value);
    if (b) {
      handleEngineChange(b.engine);
      setName((prev) => (!prev || prev.includes('snapshot') || prev.includes('-restored') ? `${b.name}-restored` : prev));
    }
  };

  const handleGeneratePassword = (e?: any) => {
    if (e && typeof e.preventDefault === 'function') {
      e.preventDefault();
    }
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%&*';
    const array = new Uint8Array(20);
    crypto.getRandomValues(array);
    const generated = Array.from(array, (byte) => chars[byte % chars.length]).join('');
    setAdminPassword(generated);
    setShowPassword(true);
  };

  // Derive generated host and credentials
  const cleanName = name.trim().toLowerCase();
  const activeZone = selectedZone || (zones.length > 0 ? zones[0] : null);
  const activeZoneName = activeZone?.name || 'lola-cloud.dev';
  const defaultSubdomain = cleanName ? `${cleanName}-db` : 'app-db';
  const effectiveSubdomain = (subdomain.trim() || defaultSubdomain).toLowerCase();
  const effectiveHost = enableRunway
    ? `${effectiveSubdomain}.${activeZoneName}`
    : `${effectiveSubdomain}.lola-cloud.dev`;
  const effectiveDatabase =
    defaultDatabase.trim() || (engine === 'POSTGRESQL' ? 'postgres' : 'app_db');
  const effectiveUsername =
    adminUsername.trim() || (engine === 'POSTGRESQL' ? 'postgres' : 'lola_admin');
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

  const validateName = (val: string): string | null => {
    const clean = val.trim();
    if (!clean) return 'Database instance identifier is required';
    if (clean.includes('.')) {
      return 'Database identifier cannot contain dots (.)';
    }
    if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?$/.test(clean)) {
      return 'Identifier must contain only lowercase letters, numbers, and hyphens (cannot start or end with a hyphen)';
    }
    if (clean.length < 3 || clean.length > 63) {
      return 'Identifier must be between 3 and 63 characters long';
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
        name: cleanName,
        engine,
        version,
        tier: 'STANDARD_1GB',
        storageGb: 10,
        adminUsername: effectiveUsername,
        adminPassword: adminPassword.trim() || undefined,
        defaultDatabase: effectiveDatabase,
        enableRunwayIntegration: enableRunway,
        zoneId: enableRunway && activeZone ? activeZone.id : undefined,
        zoneName: enableRunway ? activeZoneName : undefined,
        hostname: effectiveHost,
        enableDdns: enableRunway ? enableDdns : false,
        restoreFromBackupId: enableRestore && selectedBackupOption?.value ? selectedBackupOption.value : undefined,
      };

      const created = await relateService.createInstance(payload);
      navigate(`/relate/instances/${created.id}`);
    } catch (err: any) {
      console.error('Failed to create database instance:', err);
      const msg =
        err.response?.data?.message || err.message || 'Failed to provision database instance';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form
        header={
          <Header
            variant="h1"
            description="Provision a multi-tenant PostgreSQL, MySQL, or SQL Server database with automatic Traefik Layer 4 TCP HostSNI routing and optional Runway Cloudflare DNS integration."
          >
            Create database instance
          </Header>
        }
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              variant="link"
              onClick={() => navigate('/relate/instances')}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              loading={isSubmitting}
              onClick={handleSubmit}
              disabled={!name.trim() || Boolean(nameError)}
            >
              Create Database
            </Button>
          </SpaceBetween>
        }
      >
        <SpaceBetween size="l">
          {errorMessage && (
            <Alert type="error" dismissible onDismiss={() => setErrorMessage(null)}>
              {errorMessage}
            </Alert>
          )}

          {/* Snapshot restoration container */}
          <Container
            header={
              <Header
                variant="h2"
                description="Initialize database storage with an existing point-in-time snapshot archive from Lola Store S3"
              >
                Snapshot restoration (Clone / Restore to new)
              </Header>
            }
          >
            <SpaceBetween size="m">
              <Toggle
                checked={enableRestore}
                onChange={({ detail }) => {
                  setEnableRestore(detail.checked);
                  if (!detail.checked) {
                    setSelectedBackupOption(null);
                  } else if (availableBackups.length > 0 && !selectedBackupOption) {
                    const firstB = availableBackups[0];
                    handleBackupSelect({
                      label: `${firstB.name} (${firstB.engine} - ${formatBytes(firstB.sizeBytes)}) [${firstB.instanceName}]`,
                      value: firstB.id,
                    });
                  }
                }}
              >
                Restore from existing snapshot / backup
              </Toggle>

              {enableRestore && (
                <SpaceBetween size="s">
                  <FormField
                    label="Select snapshot / backup archive"
                    description="Choose the backup file to restore initial databases, tables, and schemas from"
                  >
                    <Select
                      selectedOption={selectedBackupOption}
                      onChange={({ detail }) => handleBackupSelect(detail.selectedOption)}
                      options={availableBackups.map((b) => ({
                        label: `${b.name} (${b.engine} - ${formatBytes(b.sizeBytes)}) [${b.instanceName}]`,
                        value: b.id,
                      }))}
                      placeholder="Select a database snapshot"
                      loadingText="Loading snapshots from S3..."
                      statusType={isLoadingBackups ? 'loading' : undefined}
                      empty="No snapshots available in fleet"
                    />
                  </FormField>

                  {selectedBackupOption && (
                    <Alert type="info">
                      Restoring this new database will clone all schemas and data from snapshot archive{' '}
                      <strong>{selectedBackupOption.label}</strong> upon first boot. Engine selection is locked to match the snapshot.
                    </Alert>
                  )}
                </SpaceBetween>
              )}
            </SpaceBetween>
          </Container>

          {/* Container 1: Engine options */}
          <Container header={<Header variant="h2">Engine options</Header>}>
            <SpaceBetween size="m">
              {enableRestore && selectedBackupOption && (
                <Alert type="info">
                  Engine is locked to <strong>{engine}</strong> to match the snapshot architecture.
                </Alert>
              )}
              <FormField
                label="Engine type"
                description="Select the relational database management engine architecture"
              >
                <Tiles
                  items={ENGINE_TILES.map((t) => ({
                    ...t,
                    disabled: enableRestore && Boolean(selectedBackupOption?.value) && t.value !== engine,
                  }))}
                  value={engine}
                  onChange={({ detail }) => handleEngineChange(detail.value as EngineType)}
                />
              </FormField>

              <FormField
                label="Engine version"
                description="Select the engine release version"
              >
                <Select
                  selectedOption={
                    VERSION_OPTIONS[engine].find((o) => o.value === version) || null
                  }
                  onChange={({ detail }) => {
                    if (detail.selectedOption.value) {
                      setVersion(detail.selectedOption.value);
                    }
                  }}
                  options={VERSION_OPTIONS[engine]}
                />
              </FormField>
            </SpaceBetween>
          </Container>

          {/* Container 2: Settings */}
          <Container header={<Header variant="h2">Settings</Header>}>
            <SpaceBetween size="m">
              <FormField
                label="Database instance identifier"
                description="Unique identifier for the database instance. Must contain only lowercase letters, numbers, and hyphens, and cannot contain dots."
                errorText={nameError}
              >
                <Input
                  value={name}
                  onChange={({ detail }) => setName(detail.value.toLowerCase())}
                  placeholder="e.g. ecommerce-db"
                />
              </FormField>

              <ColumnLayout columns={2}>
                <FormField
                  label="Initial database name"
                  description="Default database schema created upon instance initialization"
                >
                  <Input
                    value={defaultDatabase}
                    onChange={({ detail }) => setDefaultDatabase(detail.value)}
                    placeholder={engine === 'POSTGRESQL' ? 'postgres' : 'app_db'}
                  />
                </FormField>

                <FormField
                  label="Master username"
                  description="Superuser administrator login username"
                >
                  <Input
                    value={adminUsername}
                    onChange={({ detail }) => setAdminUsername(detail.value)}
                    placeholder={engine === 'POSTGRESQL' ? 'postgres' : 'lola_admin'}
                  />
                </FormField>
              </ColumnLayout>

              <FormField
                label="Master password"
                description="Master login password. Leave blank to let the system generate a secure password, or use the generate button."
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
                  <Button iconName="refresh" onClick={handleGeneratePassword}>
                    Generate Password
                  </Button>
                </SpaceBetween>
              </FormField>
            </SpaceBetween>
          </Container>

          {/* Container 3: Runway Edge & DNS Integration */}
          <Container
            header={
              <Header
                variant="h2"
                description="Automated DNS records and Dynamic DNS synchronization via Cloudflare & Runway"
              >
                Runway Edge & DNS Integration
              </Header>
            }
          >
            <SpaceBetween size="m">
              <Toggle
                checked={enableRunway}
                onChange={({ detail }) => setEnableRunway(detail.checked)}
              >
                Integrate with Runway DNS (Cloudflare)
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
                      constraintText={`Endpoint will be ${hostSniPreview}`}
                      errorText={subdomainError}
                    >
                      <Input
                        value={subdomain}
                        onChange={({ detail }) =>
                          setSubdomain(detail.value.toLowerCase().replace(/\s+/g, '-'))
                        }
                        placeholder={defaultSubdomain}
                      />
                    </FormField>
                  </ColumnLayout>

                  <KeyValuePairs
                    columns={3}
                    items={[
                      {
                        label: 'Public endpoint',
                        value: <span>{effectiveHost}</span>,
                      },
                      {
                        label: 'Port',
                        value: port,
                      },
                      {
                        label: 'Routing',
                        value: 'TCP / TLS SNI (DNS-only)',
                      },
                    ]}
                  />

                  <Checkbox
                    checked={enableDdns}
                    onChange={({ detail }) => setEnableDdns(detail.checked)}
                  >
                    Enable DDNS (Auto-IP Fix) - Automatically keep DNS synced with server's dynamic public IP
                  </Checkbox>

                  <Alert type="info">
                    An <strong>A</strong> record with <strong>DNS only</strong> (Proxy disabled) will be provisioned in Cloudflare. Database traffic connects directly via Traefik Layer 4 TCP SNI router on port {port}.
                  </Alert>
                </SpaceBetween>
              ) : (
                <SpaceBetween size="m">
                  <KeyValuePairs
                    columns={3}
                    items={[
                      {
                        label: 'Endpoint',
                        value: <span>{effectiveHost}</span>,
                      },
                      {
                        label: 'Port',
                        value: port,
                      },
                      {
                        label: 'Routing',
                        value: 'Local Traefik TCP SNI',
                      },
                    ]}
                  />
                  <Alert type="info">
                    Cloudflare DNS and DDNS auto-sync disabled. You must configure external DNS records manually.
                  </Alert>
                </SpaceBetween>
              )}
            </SpaceBetween>
          </Container>

          {/* Container 4: Connection Preview */}
          <Container
            header={
              <Header
                variant="h2"
                description="Preview of the connection URI for client applications and drivers"
                actions={
                  <Button
                    iconName="copy"
                    onClick={() => navigator.clipboard.writeText(connectionStringPreview)}
                  >
                    Copy URI
                  </Button>
                }
              >
                Connection preview
              </Header>
            }
          >
            <SpaceBetween size="xs">
              <Box variant="code">
                {connectionStringPreview}
              </Box>
              <Box variant="small" color="text-status-inactive">
                Requires TLS/SSL enabled connection (`sslmode=require`).
              </Box>
            </SpaceBetween>
          </Container>
        </SpaceBetween>
      </Form>
  );
};

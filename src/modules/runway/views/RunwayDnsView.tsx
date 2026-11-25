import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  Badge,
  Input,
  Box,
  StatusIndicator,
  Flashbar,
  type FlashbarProps,
  Container,
  ColumnLayout,
  Tabs,
  Link,
  Modal,
  FormField,
  Select,
  type SelectProps,
  Toggle,
  Alert,
} from '@cloudscape-design/components';
import {
  runwayService,
  type DnsZone,
  type DnsRecord,
  type EdgeIpStatus,
} from '../../../services/runwayService';
import { type OperatorIdentity } from '../../../services/api';

interface RunwayDnsViewProps {
  currentOperator: OperatorIdentity;
}

const RECORD_TYPES: SelectProps.Option[] = [
  { label: 'A', value: 'A', description: 'Points to an IPv4 address (e.g. 189.122.45.198)' },
  { label: 'AAAA', value: 'AAAA', description: 'Points to an IPv6 address' },
  { label: 'CNAME', value: 'CNAME', description: 'Points to another canonical hostname' },
  { label: 'TXT', value: 'TXT', description: 'Arbitrary text / SPF / DKIM verification' },
  { label: 'MX', value: 'MX', description: 'Mail exchange server routing' },
];

const TTL_OPTIONS: SelectProps.Option[] = [
  { label: 'Auto (1)', value: '1', description: 'Cloudflare automatically manages TTL' },
  { label: '2 minutes (120)', value: '120' },
  { label: '5 minutes (300)', value: '300' },
  { label: '1 hour (3600)', value: '3600' },
];

export const RunwayDnsView: React.FC<RunwayDnsViewProps> = () => {
  const navigate = useNavigate();
  const [zones, setZones] = useState<DnsZone[]>([]);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [edgeIp, setEdgeIp] = useState<EdgeIpStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFixingIp, setIsFixingIp] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Create Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createZoneOption, setCreateZoneOption] = useState<SelectProps.Option | null>(null);
  const [createTypeOption, setCreateTypeOption] = useState<SelectProps.Option>(RECORD_TYPES[0]);
  const [createHostname, setCreateHostname] = useState('');
  const [createContent, setCreateContent] = useState('');
  const [createProxied, setCreateProxied] = useState(true);
  const [createTtlOption, setCreateTtlOption] = useState<SelectProps.Option>(TTL_OPTIONS[0]);
  const [createAutoSync, setCreateAutoSync] = useState(true);
  const [createFormErrors, setCreateFormErrors] = useState<Record<string, string>>({});
  const [isCreating, setIsCreating] = useState(false);

  // Edit Modal State
  const [recordToEdit, setRecordToEdit] = useState<DnsRecord | null>(null);
  const [editTypeOption, setEditTypeOption] = useState<SelectProps.Option>(RECORD_TYPES[0]);
  const [editHostname, setEditHostname] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editProxied, setEditProxied] = useState(true);
  const [editTtlOption, setEditTtlOption] = useState<SelectProps.Option>(TTL_OPTIONS[0]);
  const [editAutoSync, setEditAutoSync] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [recordToDelete, setRecordToDelete] = useState<DnsRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [z, r, ip] = await Promise.all([
        runwayService.getZones(),
        runwayService.getRecords(),
        runwayService.getEdgeIpStatus(),
      ]);
      setZones(z);
      setRecords(r);
      setEdgeIp(ip);
    } catch (err) {
      console.error('Failed to load DNS data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRunAutoIpFix = async () => {
    setIsFixingIp(true);
    try {
      const res = await runwayService.triggerAutoIpFix();
      await fetchData();
      setFlashMessages([
        {
          type: 'success',
          header: 'Dynamic Edge IP Synchronized',
          content: `Detected public WAN IP ${res.newIp}. Successfully updated ${res.updatedRecords} DNS record(s) across Cloudflare edge zones.`,
          dismissible: true,
          id: `flash-ip-sync-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      console.error('Auto IP fix failed:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Auto-IP Fix Failed',
          content: 'Unable to synchronize dynamic IP address with Cloudflare edge API.',
          dismissible: true,
          id: `flash-ip-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsFixingIp(false);
    }
  };

  const handleToggleRecordAutoSync = async (record: DnsRecord) => {
    if (record.type !== 'A' && !record.autoSync) {
      setFlashMessages([
        {
          type: 'warning',
          header: 'Unsupported Record Type',
          content: 'DDNS Auto-IP sync can only be enabled for Type A records.',
          dismissible: true,
          id: `flash-rec-sync-warn-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      return;
    }
    try {
      const updated = await runwayService.toggleRecordAutoSync(record.id, !record.autoSync);
      setRecords((prev) => prev.map((r) => (r.id === record.id ? updated : r)));
      setFlashMessages([
        {
          type: 'info',
          header: `Auto-IP Sync ${updated.autoSync ? 'Enabled' : 'Disabled'}`,
          content: `Record ${record.name} will ${updated.autoSync ? 'now automatically track' : 'no longer track'} WAN IP changes.`,
          dismissible: true,
          id: `flash-rec-sync-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      console.error('Failed to toggle auto sync:', err);
    }
  };

  const zoneOptions: SelectProps.Option[] = zones.map((z) => ({
    label: `${z.name} (${z.accountName})`,
    value: z.id,
    description: `Status: ${z.status} • ${z.recordsCount} record(s)`,
  }));

  const handleOpenCreateModal = () => {
    if (zones.length > 0) {
      setCreateZoneOption({
        label: `${zones[0].name} (${zones[0].accountName})`,
        value: zones[0].id,
      });
    } else {
      setCreateZoneOption(null);
    }
    setCreateTypeOption(RECORD_TYPES[0]);
    setCreateHostname('');
    setCreateContent(edgeIp?.currentWanIp || '187.74.41.93');
    setCreateProxied(true);
    setCreateTtlOption(TTL_OPTIONS[0]);
    setCreateAutoSync(false);
    setCreateFormErrors({});
    setIsCreateModalOpen(true);
  };

  const handleCreateSubmit = async () => {
    const errors: Record<string, string> = {};
    if (!createZoneOption?.value) {
      errors.zoneId = 'Please select a DNS zone.';
    }
    const cleanName = createHostname.trim();
    if (!cleanName) {
      errors.name = 'Hostname is required.';
    } else if (/\s/.test(cleanName)) {
      errors.name = 'Hostname cannot contain whitespace.';
    }

    let cleanContent = createContent.trim();
    if (createAutoSync && !cleanContent) {
      cleanContent = edgeIp?.currentWanIp || '187.74.41.93';
    }

    if (!cleanContent) {
      errors.content = 'Value / Target content is required.';
    } else if (createTypeOption.value === 'A') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (!ipv4Regex.test(cleanContent)) {
        errors.content = 'Please enter a valid IPv4 address (e.g. 187.74.41.93).';
      }
    } else if (createTypeOption.value === 'CNAME') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (ipv4Regex.test(cleanContent)) {
        errors.content = 'CNAME target must be a hostname/domain, not an IP address.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setCreateFormErrors(errors);
      return;
    }

    const zone = zones.find((z) => z.id === createZoneOption!.value);
    let finalHostname = cleanName;
    if (zone && !cleanName.includes('.') && cleanName !== '@') {
      finalHostname = `${cleanName}.${zone.name}`;
    }

    setIsCreating(true);
    try {
      const created = await runwayService.createDnsRecord({
        zoneId: createZoneOption!.value!,
        name: finalHostname,
        type: createTypeOption.value as any,
        content: cleanContent,
        proxied: createProxied,
        ttl: Number(createTtlOption.value) || 1,
        autoSync: createAutoSync,
      });

      setFlashMessages([
        {
          type: 'success',
          header: 'DNS Record Created',
          content: `Record "${created.name}" (${created.type} → ${created.content}) created successfully.`,
          dismissible: true,
          id: `flash-create-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setIsCreateModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to create DNS record:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Creation Failed',
          content: 'Failed to create DNS record on Cloudflare edge API.',
          dismissible: true,
          id: `flash-create-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsCreating(false);
    }
  };

  const handleOpenEditModal = (record: DnsRecord) => {
    setRecordToEdit(record);
    setEditTypeOption(
      RECORD_TYPES.find((t) => t.value === record.type) || { label: record.type, value: record.type }
    );
    setEditHostname(record.name);
    setEditContent(record.content);
    setEditProxied(record.proxied);
    setEditTtlOption(
      TTL_OPTIONS.find((t) => t.value === String(record.ttl)) || {
        label: record.ttl === 1 ? 'Auto (1)' : `${record.ttl} seconds`,
        value: String(record.ttl),
      }
    );
    setEditAutoSync(record.autoSync && record.type === 'A');
    setEditFormErrors({});
  };

  const handleEditSubmit = async () => {
    if (!recordToEdit) return;

    const errors: Record<string, string> = {};
    const cleanName = editHostname.trim();
    if (!cleanName) {
      errors.name = 'Hostname is required.';
    } else if (/\s/.test(cleanName)) {
      errors.name = 'Hostname cannot contain whitespace.';
    }

    let cleanContent = editContent.trim();
    if (editAutoSync && !cleanContent) {
      cleanContent = edgeIp?.currentWanIp || recordToEdit.content || '187.74.41.93';
    }

    if (!cleanContent) {
      errors.content = 'Value / Target content is required.';
    } else if (editTypeOption.value === 'A') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (!ipv4Regex.test(cleanContent)) {
        errors.content = 'Please enter a valid IPv4 address (e.g. 187.74.41.93).';
      }
    } else if (editTypeOption.value === 'CNAME') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (ipv4Regex.test(cleanContent)) {
        errors.content = 'CNAME target must be a hostname/domain, not an IP address.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setEditFormErrors(errors);
      return;
    }

    setIsUpdating(true);
    try {
      const updated = await runwayService.updateDnsRecord(recordToEdit.id, {
        name: cleanName,
        type: editTypeOption.value as any,
        content: cleanContent,
        proxied: editProxied,
        ttl: Number(editTtlOption.value) || 1,
        autoSync: editAutoSync,
      });

      setFlashMessages([
        {
          type: 'success',
          header: 'DNS Record Updated',
          content: `Record "${updated.name}" updated successfully (${updated.type} → ${updated.content}).`,
          dismissible: true,
          id: `flash-update-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setRecordToEdit(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to update DNS record:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Update Failed',
          content: 'Failed to update DNS record on Cloudflare edge API.',
          dismissible: true,
          id: `flash-update-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await runwayService.deleteDnsRecord(recordToDelete.id);
      setFlashMessages([
        {
          type: 'success',
          header: 'DNS Record Deleted',
          content: `Record "${recordToDelete.name}" (${recordToDelete.type}) was successfully deleted.`,
          dismissible: true,
          id: `flash-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setRecordToDelete(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete record:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Delete Failed',
          content: 'Failed to delete DNS record from Cloudflare edge API.',
          dismissible: true,
          id: `flash-del-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeleting(false);
    }
  };

  const ddnsRecords = records.filter((r) => r.autoSync);

  const filteredDdnsRecords = ddnsRecords.filter(
    (r) =>
      r.name.toLowerCase().includes(filterText.toLowerCase()) ||
      r.zoneName.toLowerCase().includes(filterText.toLowerCase()) ||
      r.content.toLowerCase().includes(filterText.toLowerCase()) ||
      r.type.toLowerCase().includes(filterText.toLowerCase())
  );

  const filteredZones = zones.filter(
    (z) =>
      z.name.toLowerCase().includes(filterText.toLowerCase()) ||
      z.accountName.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Edge WAN IP Status & Auto-IP Fix Controls */}
      <Container
        header={
          <Header
            variant="h2"
            description="Dynamic public IP detection daemon and automated Cloudflare DNS A-record patcher."
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={fetchData} loading={loading}>
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  iconName="upload"
                  loading={isFixingIp}
                  onClick={handleRunAutoIpFix}
                >
                  Run Auto-IP Fix Now
                </Button>
              </SpaceBetween>
            }
          >
            Edge Dynamic IP &amp; Auto-Fix Daemon
          </Header>
        }
      >
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Current External WAN IP</Box>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                marginTop: '4px',
                fontFamily: 'monospace',
                color: '#0972d3',
              }}
            >
              {edgeIp?.currentWanIp || '189.122.45.198'}
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              Detected via STUN / Cloudflare trace
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Active DDNS Records</Box>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                marginTop: '4px',
                fontFamily: 'monospace',
                color: ddnsRecords.length > 0 ? '#037f0c' : '#5f6b7a',
              }}
            >
              {ddnsRecords.length}
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              {ddnsRecords.length === 1 ? '1 record receiving IP updates' : `${ddnsRecords.length} records receiving IP updates`}
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Edge Sync Status</Box>
            <div style={{ marginTop: '8px' }}>
              <StatusIndicator type="success">
                {edgeIp?.syncStatus || 'SYNCHRONIZED'}
              </StatusIndicator>
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              All auto-sync records match WAN IP
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Last Evaluated</Box>
            <div style={{ fontSize: '14px', marginTop: '6px' }}>
              {edgeIp?.lastCheckedAt ? new Date(edgeIp.lastCheckedAt).toLocaleTimeString() : 'Just now'}
            </div>
            <Box variant="small" color="text-body-secondary">
              Zero DNS drift detected
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      {/* Tabs for DNS Records & Zones */}
      <Tabs
        tabs={[
          {
            id: 'records',
            label: `Dynamic DNS Records (${ddnsRecords.length})`,
            content: (
              <Table
                loading={loading}
                loadingText="Loading DDNS records..."
                columnDefinitions={[
                  {
                    id: 'name',
                    header: 'Record Hostname',
                    cell: (item: DnsRecord) => (
                      <Link
                        external
                        href={`https://${item.name}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <code style={{ fontWeight: 600 }}>{item.name}</code>
                      </Link>
                    ),
                    sortingField: 'name',
                  },
                  {
                    id: 'type',
                    header: 'Type',
                    cell: (item: DnsRecord) => (
                      <Badge color={item.type === 'CNAME' ? 'blue' : 'green'}>{item.type}</Badge>
                    ),
                    sortingField: 'type',
                  },
                  {
                    id: 'content',
                    header: 'Value / Target',
                    cell: (item: DnsRecord) => (
                      <Box color="text-body-secondary">
                        <code style={{ fontSize: '13px' }}>{item.content}</code>
                      </Box>
                    ),
                  },
                  {
                    id: 'proxied',
                    header: 'Proxy',
                    cell: (item: DnsRecord) =>
                      item.proxied ? (
                        <StatusIndicator type="success">Proxied</StatusIndicator>
                      ) : (
                        <StatusIndicator type="stopped">DNS Only</StatusIndicator>
                      ),
                  },
                  {
                    id: 'autoSync',
                    header: 'Auto-IP',
                    cell: (item: DnsRecord) => (
                      <span
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleToggleRecordAutoSync(item)}
                        title="Click to toggle Auto-IP Sync"
                      >
                        <Badge color={item.autoSync ? 'blue' : 'grey'}>
                          {item.autoSync ? 'Enabled' : 'Disabled'}
                        </Badge>
                      </span>
                    ),
                  },
                  {
                    id: 'zoneName',
                    header: 'Zone',
                    cell: (item: DnsRecord) => (
                      <Link
                        href={`/runway/dns/zones/${item.zoneId}`}
                        onFollow={(e) => {
                          e.preventDefault();
                          navigate(`/runway/dns/zones/${item.zoneId}`);
                        }}
                      >
                        {item.zoneName}
                      </Link>
                    ),
                    sortingField: 'zoneName',
                  },
                  {
                    id: 'lastSyncedAt',
                    header: 'Last Synced',
                    cell: (item: DnsRecord) => {
                      const d = new Date(item.lastSyncedAt);
                      return isNaN(d.getTime()) ? item.lastSyncedAt : d.toLocaleTimeString();
                    },
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    width: 120,
                    minWidth: 110,
                    cell: (item: DnsRecord) => (
                      <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'nowrap', alignItems: 'center', gap: '8px', width: 'max-content' }}>
                        <span style={{ display: 'inline-flex', flexShrink: 0 }} title="Edit record">
                          <Button
                            variant="inline-icon"
                            iconName="edit"
                            ariaLabel={`Edit record ${item.name}`}
                            onClick={() => handleOpenEditModal(item)}
                          />
                        </span>
                        <span style={{ display: 'inline-flex', flexShrink: 0 }} title="Delete record">
                          <Button
                            variant="inline-icon"
                            iconName="remove"
                            ariaLabel={`Delete record ${item.name}`}
                            onClick={() => setRecordToDelete(item)}
                          />
                        </span>
                      </div>
                    ),
                  },
                ]}
                items={filteredDdnsRecords}
                header={
                  <Header
                    variant="h2"
                    description="Authoritative A records with Dynamic DNS (DDNS) auto-fix active. Lola Runway periodically synchronizes these records with your server's WAN IP."
                    counter={`(${filteredDdnsRecords.length})`}
                    actions={
                      <SpaceBetween direction="horizontal" size="xs">
                        <Button
                          variant="normal"
                          iconName="upload"
                          loading={isFixingIp}
                          onClick={handleRunAutoIpFix}
                        >
                          Run Auto-IP Fix Now
                        </Button>
                        <Button
                          variant="primary"
                          iconName="add-plus"
                          onClick={handleOpenCreateModal}
                        >
                          Create DNS Record
                        </Button>
                      </SpaceBetween>
                    }
                  >
                    Dynamic DNS Records (DDNS)
                  </Header>
                }
                filter={
                  <Input
                    value={filterText}
                    onChange={({ detail }) => setFilterText(detail.value)}
                    placeholder="Filter DDNS records by hostname, value, or zone..."
                    type="search"
                    clearAriaLabel="Clear filter"
                  />
                }
                empty={
                  <Box textAlign="center" color="inherit" padding={{ vertical: 'l' }}>
                    <b>No active DDNS records found</b>
                    <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs', bottom: 'm' }}>
                      No records currently have Dynamic IP auto-fix (DDNS) enabled. You can enable DDNS on any A record in the DNS Zones tab below or click "Create DNS Record".
                    </Box>
                    <Button iconName="add-plus" onClick={handleOpenCreateModal}>
                      Create DNS Record
                    </Button>
                  </Box>
                }
              />
            ),
          },
          {
            id: 'zones',
            label: `DNS Zones (${zones.length})`,
            content: (
              <Table
                loading={loading}
                loadingText="Loading DNS zones..."
                columnDefinitions={[
                  {
                    id: 'name',
                    header: 'Zone Domain',
                    cell: (item: DnsZone) => (
                      <Link
                        href={`/runway/dns/zones/${item.id}`}
                        onFollow={(e) => {
                          e.preventDefault();
                          navigate(`/runway/dns/zones/${item.id}`);
                        }}
                      >
                        <span style={{ fontWeight: 600 }}>{item.name}</span>
                      </Link>
                    ),
                    sortingField: 'name',
                  },
                  {
                    id: 'accountName',
                    header: 'Cloudflare Account',
                    cell: (item: DnsZone) => <span>{item.accountName}</span>,
                    sortingField: 'accountName',
                  },
                  {
                    id: 'status',
                    header: 'Zone Status',
                    cell: (item: DnsZone) => (
                      <StatusIndicator type={item.status === 'active' ? 'success' : 'warning'}>
                        {item.status.toUpperCase()}
                      </StatusIndicator>
                    ),
                  },
                  {
                    id: 'recordsCount',
                    header: 'Managed Records',
                    cell: (item: DnsZone) => (
                      <Badge color="blue">{item.recordsCount}</Badge>
                    ),
                  },
                  {
                    id: 'actions',
                    header: 'Actions',
                    cell: (item: DnsZone) => (
                      <span title="View / Manage DNS Records">
                        <Button
                          variant="inline-icon"
                          iconName="external"
                          ariaLabel={`View and manage DNS records for ${item.name}`}
                          onClick={() => navigate(`/runway/dns/zones/${item.id}`)}
                        />
                      </span>
                    ),
                  },
                ]}
                items={filteredZones}
                header={
                  <Header
                    variant="h2"
                    description="Authoritative DNS zones discovered from connected Cloudflare accounts."
                    counter={`(${filteredZones.length})`}
                  >
                    Connected DNS Zones
                  </Header>
                }
                filter={
                  <Input
                    value={filterText}
                    onChange={({ detail }) => setFilterText(detail.value)}
                    placeholder="Filter zones by domain or account..."
                    type="search"
                    clearAriaLabel="Clear filter"
                  />
                }
                empty={
                  <Box textAlign="center" color="inherit">
                    <b>No DNS zones found</b>
                    <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs' }}>
                      Connect a Cloudflare account with active domains to populate DNS zones.
                    </Box>
                  </Box>
                }
              />
            ),
          },
        ]}
      />

      {/* Create DNS Record Modal */}
      <Modal
        visible={isCreateModalOpen}
        onDismiss={() => setIsCreateModalOpen(false)}
        size="medium"
        header="Create DNS Record"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsCreateModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isCreating}
                disabled={zones.length === 0}
                onClick={handleCreateSubmit}
              >
                Create DNS Record
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {zones.length === 0 ? (
            <Alert type="error" header="No DNS Zones Found">
              You must connect a Cloudflare account with at least one active DNS zone before adding DNS records.
            </Alert>
          ) : (
            <>
              <FormField
                label="DNS Zone"
                description="Select the authoritative Cloudflare DNS zone for this record."
                errorText={createFormErrors.zoneId}
              >
                <Select
                  selectedOption={createZoneOption}
                  onChange={({ detail }) => {
                    setCreateZoneOption(detail.selectedOption);
                    if (createFormErrors.zoneId) {
                      setCreateFormErrors((prev) => ({ ...prev, zoneId: '' }));
                    }
                  }}
                  options={zoneOptions}
                  placeholder="Select a DNS zone"
                />
              </FormField>

              <ColumnLayout columns={2}>
                <FormField
                  label="Record Type"
                  description="Resource record type."
                >
                  <Select
                    selectedOption={createTypeOption}
                    onChange={({ detail }) => {
                      setCreateTypeOption(detail.selectedOption);
                      const t = detail.selectedOption.value;
                      if (t !== 'A' && t !== 'AAAA' && t !== 'CNAME') {
                        setCreateProxied(false);
                      }
                      if (t !== 'A') {
                        setCreateAutoSync(false);
                      }
                    }}
                    options={RECORD_TYPES}
                  />
                </FormField>

                <FormField
                  label="TTL"
                  description="DNS Time To Live cache duration."
                >
                  <Select
                    selectedOption={createTtlOption}
                    onChange={({ detail }) => setCreateTtlOption(detail.selectedOption)}
                    options={TTL_OPTIONS}
                  />
                </FormField>
              </ColumnLayout>

              <FormField
                label="Record Hostname"
                description={`Hostname subdomain or root (@). ${
                  createZoneOption
                    ? `Resolves as: ${createHostname.trim() ? (createHostname.includes('.') ? createHostname : `${createHostname}.${createZoneOption.label?.split(' ')[0]}`) : '(hostname)'}`
                    : ''
                }`}
                errorText={createFormErrors.name}
              >
                <Input
                  value={createHostname}
                  onChange={({ detail }) => {
                    setCreateHostname(detail.value);
                    if (createFormErrors.name) {
                      setCreateFormErrors((prev) => ({ ...prev, name: '' }));
                    }
                  }}
                  placeholder="e.g. api or api.lolacloud.internal"
                />
              </FormField>

              <FormField
                label="Value / Target Content"
                description={
                  createAutoSync
                    ? 'Target IPv4 address is dynamically maintained by the server daemon (DDNS).'
                    : createTypeOption.value === 'A'
                    ? 'Target IPv4 address (e.g. 187.74.41.93)'
                    : createTypeOption.value === 'AAAA'
                    ? 'Target IPv6 address (e.g. 2606:4700:4700::1111)'
                    : createTypeOption.value === 'CNAME'
                    ? 'Target canonical domain (e.g. cname.target.com)'
                    : 'Target content value'
                }
                errorText={createFormErrors.content}
              >
                <Input
                  value={createAutoSync ? (createContent || edgeIp?.currentWanIp || '187.74.41.93') : createContent}
                  disabled={createAutoSync}
                  onChange={({ detail }) => {
                    setCreateContent(detail.value);
                    if (createFormErrors.content) {
                      setCreateFormErrors((prev) => ({ ...prev, content: '' }));
                    }
                  }}
                  placeholder={
                    createAutoSync
                      ? (edgeIp?.currentWanIp || '187.74.41.93')
                      : createTypeOption.value === 'A'
                      ? (edgeIp?.currentWanIp || '187.74.41.93')
                      : createTypeOption.value === 'CNAME'
                      ? 'cname.target.com'
                      : 'Content value'
                  }
                />
              </FormField>

              <FormField
                label="Cloudflare Proxy"
                description="Route HTTP/S traffic through Cloudflare's edge network for DDoS protection, SSL, and CDN caching."
              >
                <Toggle
                  checked={createProxied}
                  disabled={createTypeOption.value === 'TXT' || createTypeOption.value === 'MX'}
                  onChange={({ detail }) => setCreateProxied(detail.checked)}
                >
                  {createProxied
                    ? 'Orange Cloud (Proxied) - Web traffic accelerated & protected'
                    : 'Grey Cloud (DNS Only) - Direct DNS resolution only'}
                </Toggle>
              </FormField>

              <FormField
                label="Edge Auto-IP Sync"
                description="Automatically update this record's IP when the edge dynamic public WAN IP changes (Type A records only)."
              >
                <Toggle
                  checked={createAutoSync}
                  disabled={createTypeOption.value !== 'A'}
                  onChange={({ detail }) => {
                    setCreateAutoSync(detail.checked);
                    if (detail.checked && !createContent) {
                      setCreateContent(edgeIp?.currentWanIp || '187.74.41.93');
                    }
                    if (detail.checked && createFormErrors.content) {
                      setCreateFormErrors((prev) => ({ ...prev, content: '' }));
                    }
                  }}
                >
                  {createAutoSync
                    ? 'Enabled - Automatically sync with WAN IP changes'
                    : 'Disabled - Static IP assignment'}
                </Toggle>
              </FormField>
            </>
          )}
        </SpaceBetween>
      </Modal>

      {/* Edit DNS Record Modal */}
      <Modal
        visible={recordToEdit !== null}
        onDismiss={() => setRecordToEdit(null)}
        size="medium"
        header={`Edit DNS Record: ${recordToEdit?.name || ''}`}
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setRecordToEdit(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isUpdating}
                onClick={handleEditSubmit}
              >
                Save Changes
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {recordToEdit && (
          <SpaceBetween size="m">
            <FormField label="Zone">
              <Input value={recordToEdit.zoneName} disabled />
            </FormField>

            <ColumnLayout columns={2}>
              <FormField
                label="Record Type"
                description="DNS record type."
              >
                <Select
                  selectedOption={editTypeOption}
                  onChange={({ detail }) => {
                    setEditTypeOption(detail.selectedOption);
                    const t = detail.selectedOption.value;
                    if (t !== 'A' && t !== 'AAAA' && t !== 'CNAME') {
                      setEditProxied(false);
                    }
                    if (t !== 'A') {
                      setEditAutoSync(false);
                    }
                  }}
                  options={RECORD_TYPES}
                />
              </FormField>

              <FormField
                label="TTL"
                description="Time To Live cache duration."
              >
                <Select
                  selectedOption={editTtlOption}
                  onChange={({ detail }) => setEditTtlOption(detail.selectedOption)}
                  options={TTL_OPTIONS}
                />
              </FormField>
            </ColumnLayout>

            <FormField
              label="Record Hostname"
              description="Fully qualified or subdomain hostname."
              errorText={editFormErrors.name}
            >
              <Input
                value={editHostname}
                onChange={({ detail }) => {
                  setEditHostname(detail.value);
                  if (editFormErrors.name) {
                    setEditFormErrors((prev) => ({ ...prev, name: '' }));
                  }
                }}
                placeholder="e.g. api.lolacloud.internal"
              />
            </FormField>

            <FormField
              label="Value / Target Content"
              description={
                editAutoSync
                  ? 'Target IPv4 address is dynamically maintained by the server daemon (DDNS).'
                  : editTypeOption.value === 'A'
                  ? 'Target IPv4 address'
                  : editTypeOption.value === 'AAAA'
                  ? 'Target IPv6 address'
                  : editTypeOption.value === 'CNAME'
                  ? 'Target domain / CNAME target'
                  : 'Target value'
              }
              errorText={editFormErrors.content}
            >
              <Input
                value={editAutoSync ? (editContent || edgeIp?.currentWanIp || recordToEdit?.content || '187.74.41.93') : editContent}
                disabled={editAutoSync}
                onChange={({ detail }) => {
                  setEditContent(detail.value);
                  if (editFormErrors.content) {
                    setEditFormErrors((prev) => ({ ...prev, content: '' }));
                  }
                }}
              />
            </FormField>

            <FormField
              label="Cloudflare Proxy"
              description="Cloudflare edge proxy routing status."
            >
              <Toggle
                checked={editProxied}
                disabled={editTypeOption.value === 'TXT' || editTypeOption.value === 'MX'}
                onChange={({ detail }) => setEditProxied(detail.checked)}
              >
                {editProxied
                  ? 'Orange Cloud (Proxied) - Web traffic accelerated & protected'
                  : 'Grey Cloud (DNS Only) - Direct DNS resolution only'}
              </Toggle>
            </FormField>

            <FormField
              label="Edge Auto-IP Sync"
              description="Automatically update this record when the WAN IP changes (Type A records only)."
            >
              <Toggle
                checked={editAutoSync}
                disabled={editTypeOption.value !== 'A'}
                onChange={({ detail }) => {
                  setEditAutoSync(detail.checked);
                  if (detail.checked && !editContent) {
                    setEditContent(edgeIp?.currentWanIp || recordToEdit?.content || '187.74.41.93');
                  }
                  if (detail.checked && editFormErrors.content) {
                    setEditFormErrors((prev) => ({ ...prev, content: '' }));
                  }
                }}
              >
                {editAutoSync
                  ? 'Enabled - Automatically sync with WAN IP changes'
                  : 'Disabled - Static IP assignment'}
              </Toggle>
            </FormField>
          </SpaceBetween>
        )}
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={recordToDelete !== null}
        onDismiss={() => setRecordToDelete(null)}
        header="Delete DNS Record"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setRecordToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeleting}
                onClick={handleDeleteConfirm}
              >
                Delete Record
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {recordToDelete && (
          <SpaceBetween size="m">
            <Box variant="p">
              Are you sure you want to delete the DNS record <strong>{recordToDelete.name}</strong>?
            </Box>
            <Container>
              <ColumnLayout columns={2} variant="text-grid">
                <div>
                  <Box variant="awsui-key-label">Record Hostname</Box>
                  <code style={{ fontSize: '13px' }}>{recordToDelete.name}</code>
                </div>
                <div>
                  <Box variant="awsui-key-label">Record Type</Box>
                  <Badge color={recordToDelete.type === 'CNAME' ? 'blue' : 'green'}>
                    {recordToDelete.type}
                  </Badge>
                </div>
                <div>
                  <Box variant="awsui-key-label">Value / Target</Box>
                  <code style={{ fontSize: '13px' }}>{recordToDelete.content}</code>
                </div>
                <div>
                  <Box variant="awsui-key-label">Zone</Box>
                  <span>{recordToDelete.zoneName}</span>
                </div>
              </ColumnLayout>
            </Container>
            <Alert type="warning">
              This will permanently delete this record from Cloudflare authoritative DNS. Any services resolving to <code>{recordToDelete.name}</code> will become unreachable.
            </Alert>
          </SpaceBetween>
        )}
      </Modal>
    </SpaceBetween>
  );
};

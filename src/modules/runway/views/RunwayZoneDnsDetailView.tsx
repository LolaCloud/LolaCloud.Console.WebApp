import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  AppLayout,
  SideNavigation,
  BreadcrumbGroup,
  Container,
  Header,
  SpaceBetween,
  Box,
  Button,
  Table,
  Badge,
  StatusIndicator,
  Modal,
  FormField,
  Input,
  Select,
  type SelectProps,
  Toggle,
  ColumnLayout,
  Alert,
  Flashbar,
  type FlashbarProps,
  Link,
} from '@cloudscape-design/components';
import {
  runwayService,
  type DnsRecord,
  type DnsZone,
  type EdgeIpStatus,
} from '../../../services/runwayService';

interface RunwayZoneDnsDetailViewProps {
  standalone?: boolean;
}

const RECORD_TYPES: SelectProps.Option[] = [
  { label: 'A', value: 'A', description: 'Points to an IPv4 address (e.g. 189.122.45.198)' },
  { label: 'AAAA', value: 'AAAA', description: 'Points to an IPv6 address' },
  { label: 'CNAME', value: 'CNAME', description: 'Points to another canonical hostname / domain' },
  { label: 'MX', value: 'MX', description: 'Mail exchange routing server destination' },
  { label: 'TXT', value: 'TXT', description: 'Arbitrary text / SPF / DKIM verification payload' },
];

const TTL_OPTIONS: SelectProps.Option[] = [
  { label: 'Auto (1)', value: '1', description: 'Cloudflare automatically manages TTL' },
  { label: '1 minute (60)', value: '60' },
  { label: '2 minutes (120)', value: '120' },
  { label: '5 minutes (300)', value: '300' },
  { label: '1 hour (3600)', value: '3600' },
];

const formatTtl = (ttl: number): string => {
  if (ttl === 1) return 'Auto';
  if (ttl === 60) return '1 min';
  if (ttl === 120) return '2 min';
  if (ttl === 300) return '5 min';
  if (ttl === 3600) return '1 hr';
  if (ttl >= 3600) return `${Math.round(ttl / 3600)} hr`;
  if (ttl >= 60) return `${Math.round(ttl / 60)} min`;
  return `${ttl}s`;
};

const renderTypeBadge = (type: string) => {
  switch (type) {
    case 'A':
    case 'AAAA':
      return <Badge color="blue">{type}</Badge>;
    case 'CNAME':
      return <Badge color="green">{type}</Badge>;
    case 'MX':
      return <Badge color="blue">{type}</Badge>;
    case 'TXT':
    case 'NS':
    case 'SRV':
    case 'CAA':
    default:
      return <Badge color="grey">{type}</Badge>;
  }
};

const renderProxyStatus = (proxied: boolean) => {
  return proxied ? (
    <StatusIndicator type="success">Proxied</StatusIndicator>
  ) : (
    <StatusIndicator type="stopped">DNS only</StatusIndicator>
  );
};

export const RunwayZoneDnsDetailView: React.FC<RunwayZoneDnsDetailViewProps> = ({
  standalone = true,
}) => {
  const { zoneId } = useParams<{ zoneId: string }>();
  const navigate = useNavigate();

  const [zone, setZone] = useState<DnsZone | null>(null);
  const [records, setRecords] = useState<DnsRecord[]>([]);
  const [edgeIp, setEdgeIp] = useState<EdgeIpStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterText, setFilterText] = useState('');
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);
  const [navigationOpen, setNavigationOpen] = useState(true);

  // Add Record Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTypeOption, setAddTypeOption] = useState<SelectProps.Option>(RECORD_TYPES[0]);
  const [addName, setAddName] = useState('');
  const [addContent, setAddContent] = useState('');
  const [addProxied, setAddProxied] = useState(true);
  const [addTtlOption, setAddTtlOption] = useState<SelectProps.Option>(TTL_OPTIONS[0]);
  const [addAutoSync, setAddAutoSync] = useState(false);
  const [addFormErrors, setAddFormErrors] = useState<Record<string, string>>({});
  const [isAdding, setIsAdding] = useState(false);

  // Edit Record Modal state
  const [recordToEdit, setRecordToEdit] = useState<DnsRecord | null>(null);
  const [editTypeOption, setEditTypeOption] = useState<SelectProps.Option>(RECORD_TYPES[0]);
  const [editName, setEditName] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editProxied, setEditProxied] = useState(true);
  const [editTtlOption, setEditTtlOption] = useState<SelectProps.Option>(TTL_OPTIONS[0]);
  const [editAutoSync, setEditAutoSync] = useState(false);
  const [editFormErrors, setEditFormErrors] = useState<Record<string, string>>({});
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Record Modal state
  const [recordToDelete, setRecordToDelete] = useState<DnsRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    if (!zoneId) return;
    setLoading(true);
    try {
      const [foundZone, foundRecords, edgeStatus] = await Promise.all([
        runwayService.getZoneById(zoneId),
        runwayService.getRecords(zoneId),
        runwayService.getEdgeIpStatus().catch(() => null),
      ]);
      setZone(foundZone);
      setRecords(foundRecords);
      if (edgeStatus) setEdgeIp(edgeStatus);
    } catch (err) {
      console.error('Failed to load zone records:', err);
    } finally {
      setLoading(false);
    }
  }, [zoneId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Clean zone name resolution
  const resolvedZoneName = zone?.name || (zoneId?.startsWith('zone-') ? zoneId.replace(/^zone-/, '').replace(/-/g, '.') : zoneId) || 'Zone';

  const handleCopyContent = (text: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setFlashMessages([
        {
          type: 'info',
          content: `Copied "${text.length > 32 ? text.slice(0, 32) + '...' : text}" to clipboard.`,
          dismissible: true,
          id: `flash-copy-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  const handleToggleAutoSync = async (record: DnsRecord) => {
    if (record.type !== 'A' && !record.autoSync) {
      setFlashMessages([
        {
          type: 'warning',
          header: 'Unsupported Record Type',
          content: 'DDNS Auto-IP sync can only be enabled for Type A records.',
          dismissible: true,
          id: `flash-sync-warn-${Date.now()}`,
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
          header: `DDNS Auto-IP Sync ${updated.autoSync ? 'Enabled' : 'Disabled'}`,
          content: `Record ${record.name} will ${updated.autoSync ? 'now dynamically synchronize' : 'no longer track'} WAN IP changes.`,
          dismissible: true,
          id: `flash-sync-toggle-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      console.error('Failed to toggle auto-sync:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Toggle Failed',
          content: 'Unable to update DDNS Auto-IP sync status.',
          dismissible: true,
          id: `flash-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    }
  };

  // Add Record Modal handlers
  const handleOpenAddModal = () => {
    setAddTypeOption(RECORD_TYPES[0]);
    setAddName('@');
    setAddContent(edgeIp?.currentWanIp || '187.74.41.93');
    setAddProxied(true);
    setAddTtlOption(TTL_OPTIONS[0]);
    setAddAutoSync(false);
    setAddFormErrors({});
    setIsAddModalOpen(true);
  };

  const handleAddSubmit = async () => {
    const errors: Record<string, string> = {};
    const cleanName = addName.trim();
    let cleanContent = addContent.trim();

    if (addAutoSync && !cleanContent) {
      cleanContent = edgeIp?.currentWanIp || '187.74.41.93';
    }

    if (!cleanName) {
      errors.name = 'Record name / hostname is required (use @ for root domain).';
    }
    if (!cleanContent) {
      errors.content = 'Content / Target value is required.';
    } else if (addTypeOption.value === 'A') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (!ipv4Regex.test(cleanContent)) {
        errors.content = 'Content must be a valid IPv4 address (e.g. 187.74.41.93).';
      }
    } else if (addTypeOption.value === 'CNAME') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (ipv4Regex.test(cleanContent)) {
        errors.content = 'CNAME target must be a hostname, not an IP address.';
      }
    }

    if (Object.keys(errors).length > 0) {
      setAddFormErrors(errors);
      return;
    }

    setIsAdding(true);
    try {
      // Determine fully qualified record name
      const finalName =
        cleanName === '@'
          ? resolvedZoneName
          : cleanName.endsWith(`.${resolvedZoneName}`)
          ? cleanName
          : `${cleanName}.${resolvedZoneName}`;

      const newRecord = await runwayService.createDnsRecord({
        zoneId: zone?.id || zoneId || `zone-${resolvedZoneName}`,
        name: finalName,
        type: addTypeOption.value as any,
        content: cleanContent,
        proxied: addProxied,
        ttl: Number(addTtlOption.value) || 1,
        autoSync: addAutoSync,
      });

      setFlashMessages([
        {
          type: 'success',
          header: 'DNS Record Created',
          content: `Record "${newRecord.name}" (${newRecord.type}) was successfully published to Cloudflare edge.`,
          dismissible: true,
          id: `flash-add-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setIsAddModalOpen(false);
      await fetchData();
    } catch (err) {
      console.error('Failed to create DNS record:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Creation Failed',
          content: 'Unable to publish DNS record to Cloudflare edge API.',
          dismissible: true,
          id: `flash-add-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsAdding(false);
    }
  };

  // Edit Record Modal handlers
  const handleOpenEditModal = (record: DnsRecord) => {
    setRecordToEdit(record);
    const matchedType = RECORD_TYPES.find((t) => t.value === record.type) || RECORD_TYPES[0];
    const matchedTtl = TTL_OPTIONS.find((t) => t.value === String(record.ttl)) || TTL_OPTIONS[0];

    setEditTypeOption(matchedType);
    setEditName(record.name);
    setEditContent(record.content);
    setEditProxied(record.proxied);
    setEditTtlOption(matchedTtl);
    setEditAutoSync(record.autoSync && record.type === 'A');
    setEditFormErrors({});
  };

  const handleEditSubmit = async () => {
    if (!recordToEdit) return;

    const errors: Record<string, string> = {};
    const cleanName = editName.trim();
    let cleanContent = editContent.trim();

    if (editAutoSync && !cleanContent) {
      cleanContent = edgeIp?.currentWanIp || recordToEdit.content || '187.74.41.93';
    }

    if (!cleanName) {
      errors.name = 'Record name is required.';
    }
    if (!cleanContent) {
      errors.content = 'Content is required.';
    } else if (editTypeOption.value === 'A') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (!ipv4Regex.test(cleanContent)) {
        errors.content = 'Content must be a valid IPv4 address (e.g. 187.74.41.93).';
      }
    } else if (editTypeOption.value === 'CNAME') {
      const ipv4Regex = /^(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}$/;
      if (ipv4Regex.test(cleanContent)) {
        errors.content = 'CNAME target must be a hostname, not an IP address.';
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
          content: 'Unable to update record on Cloudflare edge API.',
          dismissible: true,
          id: `flash-update-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsUpdating(false);
    }
  };

  // Delete Record Modal handlers
  const handleDeleteConfirm = async () => {
    if (!recordToDelete) return;
    setIsDeleting(true);
    try {
      await runwayService.deleteDnsRecord(recordToDelete.id);
      setFlashMessages([
        {
          type: 'success',
          header: 'DNS Record Deleted',
          content: `Record "${recordToDelete.name}" (${recordToDelete.type}) was successfully removed.`,
          dismissible: true,
          id: `flash-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setRecordToDelete(null);
      await fetchData();
    } catch (err) {
      console.error('Failed to delete DNS record:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Delete Failed',
          content: 'Unable to delete DNS record from Cloudflare edge API.',
          dismissible: true,
          id: `flash-del-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeleting(false);
    }
  };

  const filteredRecords = records.filter(
    (r) =>
      r.name.toLowerCase().includes(filterText.toLowerCase()) ||
      r.content.toLowerCase().includes(filterText.toLowerCase()) ||
      r.type.toLowerCase().includes(filterText.toLowerCase())
  );

  const mainContent = (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      {/* Top Header */}
      <Header
        variant="h1"
        description={`Authoritative Cloudflare DNS zone records for ${resolvedZoneName}. You have used ${records.length} of 200 available DNS records in this domain.`}
        actions={
          <Button iconName="refresh" onClick={fetchData} loading={loading}>
            Refresh
          </Button>
        }
      >
        {resolvedZoneName}
      </Header>

      {/* Status / Summary Container */}
      <Container
        header={
          <Header variant="h2">Zone Status &amp; Metrics</Header>
        }
      >
        <ColumnLayout columns={4} variant="text-grid">
          <div>
            <Box variant="awsui-key-label">Domain Status</Box>
            <div style={{ marginTop: '4px' }}>
              <StatusIndicator type="success">Active</StatusIndicator>
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              Cloudflare authoritative DNS active
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Cloudflare Account</Box>
            <div style={{ fontSize: '15px', fontWeight: 600, marginTop: '4px' }}>
              {zone?.accountName || 'Lola Cloudflare (Primary)'}
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              Linked authoritative tenant
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">Total DNS Records</Box>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                marginTop: '4px',
                color: '#0972d3',
              }}
            >
              {records.length}
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              Records published on edge
            </Box>
          </div>

          <div>
            <Box variant="awsui-key-label">DDNS Auto-IP Sync Records</Box>
            <div
              style={{
                fontSize: '24px',
                fontWeight: 700,
                marginTop: '4px',
                color: '#1d8102',
              }}
            >
              {records.filter((r) => r.autoSync).length}
            </div>
            <Box variant="small" color="text-body-secondary" margin={{ top: 'xxs' }}>
              Actively tracking edge WAN IP
            </Box>
          </div>
        </ColumnLayout>
      </Container>

      {/* DNS Records Table */}
      <Table
        loading={loading}
        loadingText="Loading DNS zone records from Cloudflare..."
        columnDefinitions={[
          {
            id: 'name',
            header: 'Name',
            cell: (item: DnsRecord) => (
              <Link
                onFollow={(e) => {
                  e.preventDefault();
                  handleOpenEditModal(item);
                }}
              >
                <span style={{ fontWeight: 600 }}>{item.name}</span>
              </Link>
            ),
            sortingField: 'name',
          },
          {
            id: 'type',
            header: 'Type',
            cell: (item: DnsRecord) => renderTypeBadge(item.type),
            sortingField: 'type',
          },
          {
            id: 'content',
            header: 'Content',
            cell: (item: DnsRecord) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', maxWidth: '420px' }}>
                <code
                  style={{
                    fontSize: '12px',
                    wordBreak: 'break-all',
                    fontFamily: 'monospace',
                    color: 'inherit',
                  }}
                >
                  {item.content}
                </code>
                <span title="Copy content to clipboard">
                  <Button
                    variant="inline-icon"
                    iconName="copy"
                    ariaLabel={`Copy content for ${item.name}`}
                    onClick={() => handleCopyContent(item.content)}
                  />
                </span>
              </div>
            ),
          },
          {
            id: 'proxied',
            header: 'Proxy status',
            cell: (item: DnsRecord) => renderProxyStatus(item.proxied),
          },
          {
            id: 'ttl',
            header: 'TTL',
            cell: (item: DnsRecord) => (
              <span style={{ color: 'inherit', fontSize: '13px' }}>{formatTtl(item.ttl)}</span>
            ),
          },
          {
            id: 'autoSync',
            header: 'DDNS',
            cell: (item: DnsRecord) => {
              if (item.type !== 'A') {
                return (
                  <span title="DDNS is only supported for Type A records">
                    <Badge color="grey">N/A</Badge>
                  </span>
                );
              }
              return (
                <span
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleToggleAutoSync(item)}
                  title="Click to toggle DDNS auto-sync"
                >
                  <Badge color={item.autoSync ? 'green' : 'grey'}>
                    {item.autoSync ? 'Enabled' : 'Disabled'}
                  </Badge>
                </span>
              );
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
        items={filteredRecords}
        header={
          <Header
            variant="h2"
            description="All DNS records for this authoritative zone synchronized with Cloudflare."
            counter={`(${filteredRecords.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={fetchData} loading={loading}>
                  Refresh
                </Button>
                <Button
                  variant="primary"
                  iconName="add-plus"
                  onClick={handleOpenAddModal}
                >
                  Add Record
                </Button>
              </SpaceBetween>
            }
          >
            DNS Records
          </Header>
        }
        filter={
          <Input
            value={filterText}
            onChange={({ detail }) => setFilterText(detail.value)}
            placeholder="Filter records by name, type or content..."
            type="search"
            clearAriaLabel="Clear filter"
          />
        }
        empty={
          <Box textAlign="center" color="inherit">
            <b>No DNS records found</b>
            <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs' }}>
              {filterText
                ? 'No records match your filter criteria.'
                : 'No records exist in this authoritative zone. Click "Add Record" to create one.'}
            </Box>
          </Box>
        }
      />

      {/* Add Record Modal */}
      <Modal
        visible={isAddModalOpen}
        onDismiss={() => setIsAddModalOpen(false)}
        header="Add DNS Record"
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsAddModalOpen(false)}>
                Cancel
              </Button>
              <Button variant="primary" loading={isAdding} onClick={handleAddSubmit}>
                Save Record
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info">
            Add a new DNS record to authoritative Cloudflare zone <b>{resolvedZoneName}</b>.
          </Alert>

          <FormField label="Zone Domain" description="Records will be registered under this authoritative domain.">
            <Input value={resolvedZoneName} disabled />
          </FormField>

          <ColumnLayout columns={2}>
            <FormField label="Record Type" description="Standard DNS resource type">
              <Select
                selectedOption={addTypeOption}
                onChange={({ detail }) => {
                  setAddTypeOption(detail.selectedOption);
                  const t = detail.selectedOption.value;
                  if (t === 'MX' || t === 'TXT') {
                    setAddProxied(false);
                  }
                  if (t !== 'A') {
                    setAddAutoSync(false);
                  }
                }}
                options={RECORD_TYPES}
              />
            </FormField>

            <FormField
              label="Name (Hostname)"
              description="Use @ for root domain, or enter subdomain"
              errorText={addFormErrors.name}
            >
              <Input
                value={addName}
                onChange={({ detail }) => setAddName(detail.value)}
                placeholder="@ or subdomain"
              />
            </FormField>
          </ColumnLayout>

          <FormField
            label="Content"
            description={
              addAutoSync
                ? 'Target IPv4 address is dynamically maintained by the server daemon (DDNS).'
                : addTypeOption.value === 'A'
                ? 'IPv4 address (e.g. 187.74.41.93)'
                : addTypeOption.value === 'AAAA'
                ? 'IPv6 address (e.g. 2001:db8::1)'
                : addTypeOption.value === 'CNAME'
                ? 'Target domain or tunnel hostname'
                : addTypeOption.value === 'MX'
                ? 'Mail server hostname (e.g. route1.mx.cloudflare.net)'
                : 'Arbitrary text payload, SPF, or DKIM string'
            }
            errorText={addFormErrors.content}
          >
            <Input
              value={addAutoSync ? (addContent || edgeIp?.currentWanIp || '187.74.41.93') : addContent}
              disabled={addAutoSync}
              onChange={({ detail }) => {
                setAddContent(detail.value);
                if (addFormErrors.content) {
                  setAddFormErrors((prev) => ({ ...prev, content: '' }));
                }
              }}
              placeholder={
                addAutoSync
                  ? (edgeIp?.currentWanIp || '187.74.41.93')
                  : addTypeOption.value === 'A'
                  ? (edgeIp?.currentWanIp || '187.74.41.93')
                  : addTypeOption.value === 'CNAME'
                  ? 'tunnel.lola-cloud.dev'
                  : addTypeOption.value === 'MX'
                  ? 'route1.mx.cloudflare.net'
                  : 'v=spf1 include:... ~all'
              }
            />
          </FormField>

          <ColumnLayout columns={2}>
            <FormField label="TTL" description="DNS cache expiration time">
              <Select
                selectedOption={addTtlOption}
                onChange={({ detail }) => setAddTtlOption(detail.selectedOption)}
                options={TTL_OPTIONS}
              />
            </FormField>

            <FormField
              label="Proxy Status"
              description="Cloudflare edge proxy status"
            >
              <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
                <Toggle
                  checked={addProxied}
                  onChange={({ detail }) => setAddProxied(detail.checked)}
                  disabled={addTypeOption.value === 'MX' || addTypeOption.value === 'TXT'}
                >
                  {addProxied ? 'Proxied (Orange Cloud)' : 'DNS Only'}
                </Toggle>
              </div>
            </FormField>
          </ColumnLayout>

          <FormField
            label="DDNS Auto-IP Fix"
            description="Automatically update this record when edge public WAN IP changes (Type A records only)"
          >
            <Toggle
              checked={addAutoSync}
              onChange={({ detail }) => {
                setAddAutoSync(detail.checked);
                if (detail.checked && !addContent) {
                  setAddContent(edgeIp?.currentWanIp || '187.74.41.93');
                }
                if (detail.checked && addFormErrors.content) {
                  setAddFormErrors((prev) => ({ ...prev, content: '' }));
                }
              }}
              disabled={addTypeOption.value !== 'A'}
            >
              {addAutoSync ? 'DDNS Auto-IP Enabled' : 'Disabled'}
            </Toggle>
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Edit Record Modal */}
      <Modal
        visible={recordToEdit !== null}
        onDismiss={() => setRecordToEdit(null)}
        header="Edit DNS Record"
        size="medium"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setRecordToEdit(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={isUpdating} onClick={handleEditSubmit}>
                Save Changes
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          <Alert type="info">
            Modifying record for <b>{recordToEdit?.name}</b> in zone <b>{resolvedZoneName}</b>.
          </Alert>

          <ColumnLayout columns={2}>
            <FormField label="Record Type" description="DNS resource record type">
              <Select
                selectedOption={editTypeOption}
                onChange={({ detail }) => {
                  setEditTypeOption(detail.selectedOption);
                  const t = detail.selectedOption.value;
                  if (t === 'MX' || t === 'TXT') {
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
              label="Record Name"
              description="FQDN or hostname"
              errorText={editFormErrors.name}
            >
              <Input
                value={editName}
                onChange={({ detail }) => setEditName(detail.value)}
              />
            </FormField>
          </ColumnLayout>

          <FormField
            label="Content / Target Value"
            description={
              editAutoSync
                ? 'Target IPv4 address is dynamically maintained by the server daemon (DDNS).'
                : 'IP address, canonical host, or TXT record value'
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

          <ColumnLayout columns={2}>
            <FormField label="TTL" description="DNS cache expiration time">
              <Select
                selectedOption={editTtlOption}
                onChange={({ detail }) => setEditTtlOption(detail.selectedOption)}
                options={TTL_OPTIONS}
              />
            </FormField>

            <FormField
              label="Proxy Status"
              description="Cloudflare edge proxy status"
            >
              <div style={{ display: 'flex', alignItems: 'center', height: '32px' }}>
                <Toggle
                  checked={editProxied}
                  onChange={({ detail }) => setEditProxied(detail.checked)}
                  disabled={editTypeOption.value === 'MX' || editTypeOption.value === 'TXT'}
                >
                  {editProxied ? 'Proxied (Orange Cloud)' : 'DNS Only'}
                </Toggle>
              </div>
            </FormField>
          </ColumnLayout>

          <FormField
            label="DDNS Auto-IP Fix"
            description="Automatically patch this record when WAN IP changes (Type A records only)"
          >
            <Toggle
              checked={editAutoSync}
              onChange={({ detail }) => {
                setEditAutoSync(detail.checked);
                if (detail.checked && !editContent) {
                  setEditContent(edgeIp?.currentWanIp || recordToEdit?.content || '187.74.41.93');
                }
                if (detail.checked && editFormErrors.content) {
                  setEditFormErrors((prev) => ({ ...prev, content: '' }));
                }
              }}
              disabled={editTypeOption.value !== 'A'}
            >
              {editAutoSync ? 'DDNS Auto-IP Enabled' : 'Disabled'}
            </Toggle>
          </FormField>
        </SpaceBetween>
      </Modal>

      {/* Delete Record Modal */}
      <Modal
        visible={recordToDelete !== null}
        onDismiss={() => setRecordToDelete(null)}
        header="Delete DNS Record"
        size="medium"
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
        <SpaceBetween size="m">
          <Alert type="warning" header="Are you sure you want to delete this DNS record?">
            This action will immediately remove <b>{recordToDelete?.name}</b> from Cloudflare authoritative nameservers.
            Traffic relying on this record may fail to resolve globally.
          </Alert>

          <Container>
            <ColumnLayout columns={3} variant="text-grid">
              <div>
                <Box variant="awsui-key-label">Record Name</Box>
                <div style={{ fontWeight: 600, marginTop: '2px' }}>{recordToDelete?.name}</div>
              </div>
              <div>
                <Box variant="awsui-key-label">Type</Box>
                <div style={{ marginTop: '2px' }}>
                  {recordToDelete && renderTypeBadge(recordToDelete.type)}
                </div>
              </div>
              <div>
                <Box variant="awsui-key-label">Content</Box>
                <div style={{ wordBreak: 'break-all', fontFamily: 'monospace', fontSize: '12px', marginTop: '2px' }}>
                  {recordToDelete?.content}
                </div>
              </div>
            </ColumnLayout>
          </Container>
        </SpaceBetween>
      </Modal>
    </SpaceBetween>
  );

  const sideNavItems = [
    { type: 'link' as const, text: 'Dashboard', href: '/runway/dashboard' },
    {
      type: 'section' as const,
      text: 'Edge & Ingress',
      items: [
        { type: 'link' as const, text: 'Cloudflare Accounts', href: '/runway/accounts' },
        { type: 'link' as const, text: 'DNS & Auto-IP Fix', href: '/runway/dns' },
        { type: 'link' as const, text: 'Tunnels & Mesh', href: '/runway/tunnels' },
      ],
    },
  ];

  const breadcrumbItems = [
    { text: 'LolaCloud Console', href: '/' },
    { text: 'Lola Runway', href: '/runway/dashboard' },
    { text: 'DNS & Auto-IP Fix', href: '/runway/dns' },
    { text: resolvedZoneName, href: `/runway/dns/zones/${zoneId}` },
  ];

  if (!standalone) {
    return mainContent;
  }

  return (
    <AppLayout
      contentType="dashboard"
      headerSelector="#top-navigation"
      navigation={
        <SideNavigation
          header={{
            href: '/runway/dashboard',
            text: 'Lola Runway',
          }}
          activeHref="/runway/dns"
          onFollow={(event) => {
            event.preventDefault();
            navigate(event.detail.href);
          }}
          items={sideNavItems}
        />
      }
      breadcrumbs={
        <BreadcrumbGroup
          items={breadcrumbItems}
          onFollow={(event) => {
            event.preventDefault();
            navigate(event.detail.href);
          }}
        />
      }
      content={mainContent}
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      toolsHide={true}
    />
  );
};

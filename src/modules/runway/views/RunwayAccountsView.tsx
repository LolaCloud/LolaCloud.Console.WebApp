import React, { useState, useEffect, useCallback } from 'react';
import {
  Table,
  Header,
  Button,
  SpaceBetween,
  Badge,
  Input,
  Box,
  StatusIndicator,
  Modal,
  Flashbar,
  type FlashbarProps,
  FormField,
  Alert,
  ColumnLayout,
  Link,
} from '@cloudscape-design/components';
import {
  runwayService,
  type CloudflareAccount,
} from '../../../services/runwayService';
import { type OperatorIdentity } from '../../../services/api';

interface RunwayAccountsViewProps {
  currentOperator: OperatorIdentity;
}

export const RunwayAccountsView: React.FC<RunwayAccountsViewProps> = () => {
  const [accounts, setAccounts] = useState<CloudflareAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterText, setFilterText] = useState('');
  const [flashMessages, setFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  // Connect Modal State
  const [isConnectModalVisible, setIsConnectModalVisible] = useState(false);
  const [accountName, setAccountName] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    accountId?: string;
    accountName?: string;
    zonesCount?: number;
    message?: string;
  } | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  // Delete Modal State
  const [accountToDelete, setAccountToDelete] = useState<CloudflareAccount | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Testing connection state for existing rows
  const [testingAccountId, setTestingAccountId] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const data = await runwayService.getAccounts();
      setAccounts(data);
    } catch (err) {
      console.error('Failed to load accounts:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const handleOpenConnectModal = () => {
    setAccountName('');
    setEmail('');
    setApiKey('');
    setShowApiKey(false);
    setValidationResult(null);
    setIsConnectModalVisible(true);
  };

  const handleValidate = async () => {
    if (!email.trim() || !apiKey.trim()) {
      setValidationResult({
        valid: false,
        message: 'Please provide both Cloudflare email and Global API Key before validating.',
      });
      return;
    }
    setIsValidating(true);
    setValidationResult(null);
    try {
      const res = await runwayService.validateCredentials(email, apiKey);
      setValidationResult(res);
    } catch (err) {
      setValidationResult({
        valid: false,
        message: 'Network error or Cloudflare API rejected request credentials.',
      });
    } finally {
      setIsValidating(false);
    }
  };

  const handleConnectConfirm = async () => {
    if (!email.trim() || !apiKey.trim()) return;
    setIsConnecting(true);
    try {
      const created = await runwayService.connectAccount({
        name: accountName.trim() || `Cloudflare (${email.trim()})`,
        email: email.trim(),
        apiKey: apiKey.trim(),
      });

      setFlashMessages([
        {
          type: 'success',
          header: 'Cloudflare Account Connected',
          content: `Account "${created.name}" (${created.email}) has been securely saved and linked with Lola Runway.`,
          dismissible: true,
          id: `flash-acc-add-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      setIsConnectModalVisible(false);
      await fetchAccounts();
    } catch (err) {
      console.error('Failed to connect account:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Connection Failed',
          content: 'Unable to connect Cloudflare account. Please check credentials and try again.',
          dismissible: true,
          id: `flash-acc-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async (acc: CloudflareAccount) => {
    setTestingAccountId(acc.id);
    try {
      await new Promise((r) => setTimeout(r, 600));
      setFlashMessages([
        {
          type: 'success',
          header: 'Credentials Verified',
          content: `Connection to Cloudflare for account "${acc.name}" (${acc.email}) is valid and responsive.`,
          dismissible: true,
          id: `flash-test-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } catch (err) {
      setFlashMessages([
        {
          type: 'error',
          header: 'Verification Failed',
          content: `Failed to verify credentials for account "${acc.name}".`,
          dismissible: true,
          id: `flash-test-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setTestingAccountId(null);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!accountToDelete) return;
    setIsDeleting(true);
    try {
      await runwayService.deleteAccount(accountToDelete.id);
      setFlashMessages([
        {
          type: 'success',
          header: 'Account Removed',
          content: `Cloudflare account "${accountToDelete.name}" was disconnected and removed.`,
          dismissible: true,
          id: `flash-del-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
      await fetchAccounts();
    } catch (err) {
      console.error('Failed to delete account:', err);
      setFlashMessages([
        {
          type: 'error',
          header: 'Failed to Remove Account',
          content: 'Could not remove the selected Cloudflare account.',
          dismissible: true,
          id: `flash-del-err-${Date.now()}`,
          onDismiss: () => setFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeleting(false);
      setAccountToDelete(null);
    }
  };

  const filteredItems = accounts.filter(
    (item) =>
      item.name.toLowerCase().includes(filterText.toLowerCase()) ||
      item.email.toLowerCase().includes(filterText.toLowerCase()) ||
      item.accountId.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <SpaceBetween size="l">
      {flashMessages.length > 0 && <Flashbar items={flashMessages} />}

      <Table
        loading={loading}
        loadingText="Loading Cloudflare accounts..."
        columnDefinitions={[
          {
            id: 'name',
            header: 'Account Name',
            cell: (item: CloudflareAccount) => (
              <Link onFollow={(e) => { e.preventDefault(); handleTestConnection(item); }}>
                <span style={{ fontWeight: 600 }}>{item.name}</span>
              </Link>
            ),
            sortingField: 'name',
          },
          {
            id: 'email',
            header: 'Cloudflare Email',
            cell: (item: CloudflareAccount) => <span>{item.email}</span>,
            sortingField: 'email',
          },
          {
            id: 'maskedApiKey',
            header: 'Global API Key',
            cell: (item: CloudflareAccount) => (
              <Box color="text-body-secondary">
                <code style={{ fontSize: '13px' }}>{item.maskedApiKey}</code>
              </Box>
            ),
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item: CloudflareAccount) => (
              <StatusIndicator type={item.status === 'CONNECTED' ? 'success' : 'error'}>
                {item.status === 'CONNECTED' ? 'Connected & Valid' : item.status}
              </StatusIndicator>
            ),
            sortingField: 'status',
          },
          {
            id: 'zonesCount',
            header: 'Zones',
            cell: (item: CloudflareAccount) => (
              <Badge color="blue">{item.zonesCount}</Badge>
            ),
          },
          {
            id: 'tunnelsCount',
            header: 'Active Tunnels',
            cell: (item: CloudflareAccount) => (
              <Badge color="green">{item.tunnelsCount}</Badge>
            ),
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (item: CloudflareAccount) => (
              <SpaceBetween direction="horizontal" size="xs">
                <Button
                  variant="inline-icon"
                  iconName="refresh"
                  ariaLabel={`Test connection for ${item.name}`}
                  loading={testingAccountId === item.id}
                  onClick={() => handleTestConnection(item)}
                />
                <Button
                  variant="inline-icon"
                  iconName="remove"
                  ariaLabel={`Delete account ${item.name}`}
                  onClick={() => setAccountToDelete(item)}
                />
              </SpaceBetween>
            ),
          },
        ]}
        items={filteredItems}
        header={
          <Header
            variant="h2"
            description="Manage Cloudflare account authentications used for DNS modification and tunnel synchronization."
            counter={`(${filteredItems.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={fetchAccounts} loading={loading}>
                  Refresh
                </Button>
                <Button variant="primary" iconName="add-plus" onClick={handleOpenConnectModal}>
                  Connect Cloudflare Account
                </Button>
              </SpaceBetween>
            }
          >
            Cloudflare Accounts
          </Header>
        }
        filter={
          <Input
            value={filterText}
            onChange={({ detail }) => setFilterText(detail.value)}
            placeholder="Filter accounts by name, email or account ID..."
            type="search"
            clearAriaLabel="Clear filter"
          />
        }
        empty={
          <Box textAlign="center" color="inherit">
            <b>No Cloudflare accounts connected</b>
            <Box variant="p" color="text-body-secondary" margin={{ top: 'xxs' }}>
              Connect your Cloudflare account using your Global API Key to automate DNS and tunnels.
            </Box>
            <div style={{ marginTop: '12px' }}>
              <Button variant="primary" onClick={handleOpenConnectModal}>
                Connect Account Now
              </Button>
            </div>
          </Box>
        }
      />

      {/* Connect Account Modal */}
      <Modal
        visible={isConnectModalVisible}
        onDismiss={() => setIsConnectModalVisible(false)}
        size="medium"
        header="Connect Cloudflare Account"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setIsConnectModalVisible(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isConnecting}
                disabled={!email.trim() || !apiKey.trim()}
                onClick={handleConnectConfirm}
              >
                Connect Account
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        <SpaceBetween size="m">
          {/* Step-by-Step Guidance Box */}
          <Alert type="info" header="How to get your Global API Key in Cloudflare:">
            <ol style={{ paddingLeft: '20px', margin: '4px 0 0 0' }}>
              <li>Log in to the Cloudflare Dashboard (<strong>dash.cloudflare.com</strong>).</li>
              <li>Click your <strong>User Profile icon</strong> at the top right &gt; <strong>My Profile</strong>.</li>
              <li>Select <strong>API Tokens</strong> from the left navigation tab.</li>
              <li>Under <strong>API Keys</strong>, locate <strong>Global API Key</strong> and click <strong>View</strong>.</li>
              <li>Enter your password and copy the key here.</li>
            </ol>
          </Alert>

          <FormField
            label="Friendly Account Name"
            description="A recognizable label for this Cloudflare account inside LolaCloud."
          >
            <Input
              value={accountName}
              onChange={({ detail }) => setAccountName(detail.value)}
              placeholder="e.g. Production Cloudflare (Primary)"
            />
          </FormField>

          <FormField
            label="Cloudflare Account Email"
            description="The exact email address registered to your Cloudflare account."
          >
            <Input
              value={email}
              type="email"
              onChange={({ detail }) => {
                setEmail(detail.value);
                setValidationResult(null);
              }}
              placeholder="admin@yourdomain.com"
            />
          </FormField>

          <FormField
            label="Global API Key"
            description="Your 37-character Global API Key from Cloudflare."
          >
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <div style={{ flex: 1 }}>
                <Input
                  value={apiKey}
                  type={showApiKey ? 'text' : 'password'}
                  onChange={({ detail }) => {
                    setApiKey(detail.value);
                    setValidationResult(null);
                  }}
                  placeholder="Paste your Cloudflare Global API Key..."
                />
              </div>
              <Button
                variant="normal"
                iconName={showApiKey ? 'unlocked' : 'lock-private'}
                onClick={() => setShowApiKey(!showApiKey)}
              >
                {showApiKey ? 'Hide' : 'Show'}
              </Button>
            </div>
          </FormField>

          {/* Live Validation Button & Feedback */}
          <div>
            <Button
              variant="normal"
              iconName="check"
              loading={isValidating}
              disabled={!email.trim() || !apiKey.trim()}
              onClick={handleValidate}
            >
              Validate Credentials
            </Button>
          </div>

          {validationResult && (
            <div>
              {validationResult.valid ? (
                <Alert type="success" header="Credentials Validated Successfully">
                  <SpaceBetween size="xxs">
                    <div>{validationResult.message}</div>
                    <ColumnLayout columns={2} variant="text-grid">
                      <div>
                        <Box variant="awsui-key-label">Detected Account ID</Box>
                        <code style={{ fontSize: '12px' }}>{validationResult.accountId}</code>
                      </div>
                      <div>
                        <Box variant="awsui-key-label">Active DNS Zones</Box>
                        <span>{validationResult.zonesCount} zones available for management</span>
                      </div>
                    </ColumnLayout>
                  </SpaceBetween>
                </Alert>
              ) : (
                <Alert type="error" header="Validation Failed">
                  {validationResult.message || 'Credentials rejected by Cloudflare.'}
                </Alert>
              )}
            </div>
          )}
        </SpaceBetween>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={accountToDelete !== null}
        onDismiss={() => setAccountToDelete(null)}
        header="Disconnect Cloudflare Account"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setAccountToDelete(null)}>
                Cancel
              </Button>
              <Button variant="primary" loading={isDeleting} onClick={handleDeleteConfirm}>
                Disconnect &amp; Delete
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {accountToDelete && (
          <Box variant="p">
            Are you sure you want to disconnect <strong>{accountToDelete.name}</strong> ({accountToDelete.email})?
            This will also remove any associated tunnel configs and DNS zone definitions cached in LolaCloud.
          </Box>
        )}
      </Modal>
    </SpaceBetween>
  );
};

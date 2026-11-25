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
  Modal,
  Flashbar,
  type FlashbarProps,
  Link,
} from '@cloudscape-design/components';
import {
  type OperatorIdentity,
  type OperatorItem,
  operatorService,
} from '../../../services/api';

interface LciOperatorsViewProps {
  currentOperator: OperatorIdentity;
  onCreateOperator?: () => void;
  flashMessages?: FlashbarProps.MessageDefinition[];
  onDismissFlashMessage?: (id?: string) => void;
}

export const LciOperatorsView: React.FC<LciOperatorsViewProps> = ({
  currentOperator,
  onCreateOperator,
  flashMessages = [],
  onDismissFlashMessage,
}) => {
  const navigate = useNavigate();
  const [filterText, setFilterText] = useState('');
  const [operators, setOperators] = useState<OperatorItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [operatorToDelete, setOperatorToDelete] = useState<OperatorItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [localFlashMessages, setLocalFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const fetchOperators = useCallback(async () => {
    setLoading(true);
    try {
      const data = await operatorService.getOperators();
      if (Array.isArray(data) && data.length > 0) {
        setOperators(data);
      } else {
        // Fallback default
        setOperators([
          {
            id: currentOperator.id || '90f815ae-d8fb-481d-ac71-cc764b23abcd',
            username: currentOperator.username,
            role: currentOperator.username === 'root' ? 'Super Administrator' : 'Operator',
            permissions: currentOperator.permissions || ['*::*::*'],
            status: 'ACTIVE',
            createdAt: '2026-09-20T03:00:00Z',
          },
        ]);
      }
    } catch (err) {
      console.warn('Unable to load operators from service:', err);
    } finally {
      setLoading(false);
    }
  }, [currentOperator]);

  useEffect(() => {
    fetchOperators();
  }, [fetchOperators]);

  const handleDeleteConfirm = async () => {
    if (!operatorToDelete) return;
    setIsDeleting(true);
    try {
      await operatorService.deleteOperator(operatorToDelete.id);
      setLocalFlashMessages([
        {
          type: 'success',
          header: 'Operator Deleted',
          content: `Operator "${operatorToDelete.username}" was successfully removed from Lola Core Identity.`,
          dismissible: true,
          id: `flash-del-${Date.now()}`,
          onDismiss: () => setLocalFlashMessages([]),
        },
      ]);
      await fetchOperators();
    } catch (err) {
      console.error('Failed to delete operator:', err);
      setLocalFlashMessages([
        {
          type: 'error',
          header: 'Delete Failed',
          content: `Failed to remove operator "${operatorToDelete.username}".`,
          dismissible: true,
          id: `flash-del-err-${Date.now()}`,
          onDismiss: () => setLocalFlashMessages([]),
        },
      ]);
    } finally {
      setIsDeleting(false);
      setOperatorToDelete(null);
    }
  };

  const handleCreateClick = () => {
    if (onCreateOperator) {
      onCreateOperator();
    } else {
      navigate('/lci/operators/create');
    }
  };

  const allFlashMessages = [...flashMessages, ...localFlashMessages];

  const filteredItems = operators.filter(
    (item) =>
      item.username.toLowerCase().includes(filterText.toLowerCase()) ||
      item.id.toLowerCase().includes(filterText.toLowerCase()) ||
      item.role.toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <SpaceBetween size="l">
      {allFlashMessages.length > 0 && (
        <Flashbar
          items={allFlashMessages.map((msg) => ({
            ...msg,
            onDismiss: (event) => {
              if (msg.onDismiss) msg.onDismiss(event);
              if (onDismissFlashMessage) onDismissFlashMessage(msg.id);
            },
          }))}
        />
      )}

      <Table
        loading={loading}
        loadingText="Loading platform operators..."
        columnDefinitions={[
          {
            id: 'username',
            header: 'Username',
            cell: (item: OperatorItem) => {
              const isRootTarget = item.username === 'root';
              const isCurrentRoot = currentOperator.username === 'root';
              const canEditRoot = !isRootTarget || isCurrentRoot;

              return (
                <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                  {canEditRoot ? (
                    <Link
                      href={`/lci/operators/edit/${item.id}`}
                      onFollow={(e) => {
                        e.preventDefault();
                        navigate(`/lci/operators/edit/${item.id}`);
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>{item.username}</span>
                    </Link>
                  ) : (
                    <Link
                      variant="secondary"
                      ariaLabel="Only root can edit the root account"
                      onFollow={(e) => {
                        e.preventDefault();
                        setLocalFlashMessages([
                          {
                            type: 'error',
                            header: 'Access Denied',
                            content: 'Only the root super administrator can edit the root account.',
                            dismissible: true,
                            id: `flash-root-denied-${Date.now()}`,
                            onDismiss: () => setLocalFlashMessages([]),
                          },
                        ]);
                      }}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--color-text-body-secondary, #879596)' }}>
                        {item.username}
                      </span>
                    </Link>
                  )}
                  {item.username === currentOperator.username && (
                    <Badge color="blue">Current</Badge>
                  )}
                </SpaceBetween>
              );
            },
            sortingField: 'username',
          },
          {
            id: 'id',
            header: 'Operator UUID',
            cell: (item: OperatorItem) => (
              <Box color="text-body-secondary">
                <code style={{ fontSize: '12px' }}>{item.id}</code>
              </Box>
            ),
          },
          {
            id: 'role',
            header: 'Role',
            cell: (item: OperatorItem) =>
              item.role || (item.permissions?.includes('*::*::*') ? 'Super Administrator' : 'Operator'),
            sortingField: 'role',
          },
          {
            id: 'privileges',
            header: 'Privileges Summary',
            cell: (item: OperatorItem) => {
              const isSuper = item.permissions && item.permissions.includes('*::*::*');
              if (isSuper) {
                return <Badge color="green">Super Administrator</Badge>;
              }
              const count = item.permissions ? item.permissions.length : 0;
              return <Badge color="blue">{count} granular rules</Badge>;
            },
          },
          {
            id: 'status',
            header: 'Status',
            cell: (item: OperatorItem) => (
              <StatusIndicator type={item.status === 'ACTIVE' ? 'success' : 'stopped'}>
                {item.status}
              </StatusIndicator>
            ),
          },
          {
            id: 'createdAt',
            header: 'Created At',
            cell: (item: OperatorItem) => {
              if (!item.createdAt) return 'Just now';
              const d = new Date(item.createdAt);
              return isNaN(d.getTime()) ? item.createdAt : d.toLocaleString();
            },
            sortingField: 'createdAt',
          },
          {
            id: 'actions',
            header: 'Actions',
            cell: (item: OperatorItem) => {
              const isSelf = item.username === currentOperator.username;
              const isRoot = item.username === 'root';
              const isCurrentRoot = currentOperator.username === 'root';
              const canDelete = !isSelf && !isRoot;
              const canEdit = !isRoot || isCurrentRoot;

              return (
                <SpaceBetween direction="horizontal" size="xxs">
                  <Button
                    variant="inline-icon"
                    iconName="edit"
                    ariaLabel={!canEdit ? 'Only root can edit the root account' : `Edit operator ${item.username}`}
                    disabled={!canEdit}
                    onClick={() => {
                      if (canEdit) {
                        navigate(`/lci/operators/edit/${item.id}`);
                      }
                    }}
                  />
                  <Button
                    variant="inline-icon"
                    iconName="remove"
                    ariaLabel={isRoot ? 'Root operator cannot be deleted' : (canDelete ? `Delete operator ${item.username}` : 'Cannot delete root or current operator')}
                    disabled={!canDelete}
                    onClick={() => setOperatorToDelete(item)}
                  />
                </SpaceBetween>
              );
            },
          },
        ]}
        items={filteredItems}
        header={
          <Header
            variant="h2"
            description="Operators configured in Lola Core Identity with access to platform services."
            counter={`(${filteredItems.length})`}
            actions={
              <SpaceBetween direction="horizontal" size="xs">
                <Button iconName="refresh" onClick={fetchOperators} loading={loading}>
                  Refresh
                </Button>
                <Button variant="primary" onClick={handleCreateClick}>
                  Create operator
                </Button>
              </SpaceBetween>
            }
          >
            Operators
          </Header>
        }
        filter={
          <Input
            value={filterText}
            onChange={({ detail }) => setFilterText(detail.value)}
            placeholder="Filter operators by name or UUID..."
            type="search"
            clearAriaLabel="Clear filter"
          />
        }
        empty={
          <Box textAlign="center" color="inherit">
            <b>No operators found</b>
            <Box variant="p" color="inherit">
              No operators match the specified filter criteria.
            </Box>
          </Box>
        }
      />

      <Modal
        visible={operatorToDelete !== null}
        onDismiss={() => setOperatorToDelete(null)}
        header="Delete Operator"
        closeAriaLabel="Close modal"
        footer={
          <Box float="right">
            <SpaceBetween direction="horizontal" size="xs">
              <Button variant="link" onClick={() => setOperatorToDelete(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                loading={isDeleting}
                onClick={handleDeleteConfirm}
              >
                Delete operator
              </Button>
            </SpaceBetween>
          </Box>
        }
      >
        {operatorToDelete && (
          <Box variant="p">
            Are you sure you want to delete operator <strong>{operatorToDelete.username}</strong> ({operatorToDelete.id})?
            This will immediately revoke access and terminate any active sessions.
          </Box>
        )}
      </Modal>
    </SpaceBetween>
  );
};

import React, { useState } from 'react';
import {
  Container,
  Header,
  SpaceBetween,
  FormField,
  Input,
  Button,
  Alert,
  ColumnLayout,
  Box,
  Badge,
  Table,
} from '@cloudscape-design/components';
import { type OperatorIdentity } from '../../../services/api';

interface LciPermissionsViewProps {
  operator: OperatorIdentity;
}

export const LciPermissionsView: React.FC<LciPermissionsViewProps> = ({ operator }) => {
  const [testPermission, setTestPermission] = useState('stacker::container::restart');
  const [evalResult, setEvalResult] = useState<{ allowed: boolean; reason: string } | null>(null);

  const evaluatePermission = (targetPermission: string) => {
    if (operator.username === 'root') {
      setEvalResult({
        allowed: true,
        reason: 'Operator is "root" (Unconditional global superuser bypass)',
      });
      return;
    }

    const permissions = operator.permissions || [];
    const matched = permissions.some((slug) => {
      if (slug === '*::*::*' || slug === targetPermission) {
        return true;
      }
      if (slug.includes('*')) {
        const prefix = slug.split('*')[0];
        return targetPermission.startsWith(prefix);
      }
      return false;
    });

    if (matched) {
      setEvalResult({
        allowed: true,
        reason: `Matched active operator permissions: [${permissions.join(', ')}]`,
      });
    } else {
      setEvalResult({
        allowed: false,
        reason: `Action "${targetPermission}" is not covered by assigned permissions [${permissions.join(', ')}]`,
      });
    }
  };

  const sampleRules = [
    {
      slug: '*::*::*',
      scope: 'Global Wildcard',
      description: 'Full administrative access across all platform services and operations.',
    },
    {
      slug: 'runway::*',
      scope: 'Runway Service Scope',
      description: 'Grants all operations under the Runway edge networking and DNS service.',
    },
    {
      slug: 'stacker::container::*',
      scope: 'Container Resource Scope',
      description: 'Allows start, restart, stop, pull and remove operations on Docker containers.',
    },
    {
      slug: 'relate::db::create',
      scope: 'Exact Action Match',
      description: 'Grants privilege only to create PostgreSQL database instances.',
    },
  ];

  return (
    <SpaceBetween size="l">
      <Container
        header={
          <Header
            variant="h2"
            description="Test in-memory permission evaluation against the hierarchical pattern: service::resource::action"
          >
            RBAC Policy Simulator
          </Header>
        }
      >
        <SpaceBetween size="m">
          <ColumnLayout columns={2}>
            <div>
              <FormField
                label="Required Permission Slug"
                description="Enter an action slug to evaluate against current operator session"
              >
                <Input
                  value={testPermission}
                  onChange={({ detail }) => setTestPermission(detail.value)}
                  placeholder="e.g. runway::dns::manage"
                />
              </FormField>
              <div style={{ marginTop: '12px' }}>
                <Button variant="primary" onClick={() => evaluatePermission(testPermission)}>
                  Simulate Authorization
                </Button>
              </div>
            </div>

            <div>
              <Box variant="awsui-key-label">Active Operator Privileges</Box>
              <div style={{ marginTop: '8px' }}>
                <SpaceBetween direction="horizontal" size="xs">
                  {(operator.permissions || ['*::*::*']).map((p) => (
                    <Badge key={p} color="green">
                      {p}
                    </Badge>
                  ))}
                </SpaceBetween>
              </div>
              <div style={{ marginTop: '12px' }}>
                <Box variant="small" color="text-body-secondary">
                  LCI evaluates access checks in-memory with sub-millisecond execution time, avoiding database roundtrips.
                </Box>
              </div>
            </div>
          </ColumnLayout>

          {evalResult && (
            <Alert
              type={evalResult.allowed ? 'success' : 'error'}
              header={evalResult.allowed ? 'ACCESS GRANTED' : 'ACCESS DENIED'}
            >
              {evalResult.reason}
            </Alert>
          )}
        </SpaceBetween>
      </Container>

      <Table
        columnDefinitions={[
          {
            id: 'slug',
            header: 'Permission Slug',
            cell: (item) => <code style={{ fontWeight: 600 }}>{item.slug}</code>,
          },
          {
            id: 'scope',
            header: 'Scope Type',
            cell: (item) => <Badge color="blue">{item.scope}</Badge>,
          },
          {
            id: 'description',
            header: 'Description',
            cell: (item) => item.description,
          },
        ]}
        items={sampleRules}
        header={
          <Header variant="h2" description="Standard RBAC permission slugs across LolaCloud">
            Platform Permission Taxonomy
          </Header>
        }
      />
    </SpaceBetween>
  );
};

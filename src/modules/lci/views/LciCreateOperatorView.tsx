import React, { useState, useMemo } from 'react';
import {
  Form,
  Container,
  Header,
  SpaceBetween,
  Button,
  FormField,
  Input,
  Checkbox,
  ExpandableSection,
  Badge,
  Box,
  Alert,
  ColumnLayout,
} from '@cloudscape-design/components';
import { operatorService, type OperatorItem } from '../../../services/api';

interface LciCreateOperatorViewProps {
  onCancel: () => void;
  onSuccess: (created: OperatorItem) => void;
}

import {
  type PermissionAction,
  type PermissionResource,
  type PermissionServiceDefinition,
  PERMISSION_TAXONOMY,
  TOTAL_SYSTEM_CAPABILITIES,
} from '../permissionTaxonomy';

export {
  type PermissionAction,
  type PermissionResource,
  type PermissionServiceDefinition,
  PERMISSION_TAXONOMY,
  TOTAL_SYSTEM_CAPABILITIES,
};

export const LciCreateOperatorView: React.FC<LciCreateOperatorViewProps> = ({
  onCancel,
  onSuccess,
}) => {
  // Credentials state
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation errors
  const [usernameError, setUsernameError] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [confirmPasswordError, setConfirmPasswordError] = useState('');
  const [permissionError, setPermissionError] = useState('');
  const [formError, setFormError] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Granular RBAC selection set
  const [selectedSlugs, setSelectedSlugs] = useState<Set<string>>(new Set());

  // Expandable sections collapse state for services
  const [expandedServices, setExpandedServices] = useState<Record<string, boolean>>({
    relate: true,
    stacker: true,
    runway: true,
    keeper: true,
    store: true,
    lci: true,
  });

  const isRootChecked = selectedSlugs.has('*::*::*');

  // Compute live effective capabilities and optimized slugs
  const { compactSlugs, effectiveCount } = useMemo(() => {
    if (isRootChecked) {
      return {
        compactSlugs: ['*::*::*'],
        effectiveCount: TOTAL_SYSTEM_CAPABILITIES,
      };
    }

    const slugs: string[] = [];
    let effective = 0;

    PERMISSION_TAXONOMY.forEach((svc) => {
      const isSvcExplicit = selectedSlugs.has(svc.wildcardSlug);
      if (isSvcExplicit) {
        slugs.push(svc.wildcardSlug);
        svc.resources.forEach((res) => {
          effective += res.actions.length;
        });
      } else {
        svc.resources.forEach((res) => {
          const isResExplicit = selectedSlugs.has(res.wildcardSlug);
          if (isResExplicit) {
            slugs.push(res.wildcardSlug);
            effective += res.actions.length;
          } else {
            res.actions.forEach((act) => {
              if (selectedSlugs.has(act.slug)) {
                slugs.push(act.slug);
                effective++;
              }
            });
          }
        });
      }
    });

    return {
      compactSlugs: slugs,
      effectiveCount: effective,
    };
  }, [selectedSlugs, isRootChecked]);

  // Root wildcard handler
  const handleToggleRoot = (checked: boolean) => {
    setPermissionError('');
    if (checked) {
      setSelectedSlugs(new Set(['*::*::*']));
    } else {
      setSelectedSlugs(new Set());
    }
  };

  // Service wildcard handler
  const handleToggleService = (serviceId: string, wildcardSlug: string, checked: boolean) => {
    setPermissionError('');
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      for (const slug of next) {
        if (slug.startsWith(`${serviceId}::`)) {
          next.delete(slug);
        }
      }
      if (checked) {
        next.add(wildcardSlug);
      }
      return next;
    });
  };

  // Resource wildcard handler
  const handleToggleResource = (
    serviceId: string,
    resourceId: string,
    wildcardSlug: string,
    checked: boolean
  ) => {
    setPermissionError('');
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      const prefix = `${serviceId}::${resourceId}::`;
      for (const slug of next) {
        if (slug.startsWith(prefix)) {
          next.delete(slug);
        }
      }
      if (checked) {
        next.add(wildcardSlug);
      }
      return next;
    });
  };

  // Individual action handler
  const handleToggleAction = (actionSlug: string, checked: boolean) => {
    setPermissionError('');
    setSelectedSlugs((prev) => {
      const next = new Set(prev);
      if (checked) {
        next.add(actionSlug);
      } else {
        next.delete(actionSlug);
      }
      return next;
    });
  };

  // Quick actions
  const handleSelectAll = () => {
    setSelectedSlugs(new Set(['*::*::*']));
    setPermissionError('');
  };

  const handleClearAll = () => {
    setSelectedSlugs(new Set());
    setPermissionError('');
  };

  const handleToggleExpandAll = (expanded: boolean) => {
    const next: Record<string, boolean> = {};
    PERMISSION_TAXONOMY.forEach((s) => {
      next[s.id] = expanded;
    });
    setExpandedServices(next);
  };

  // Submission validation and handling
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    let hasError = false;
    setUsernameError('');
    setPasswordError('');
    setConfirmPasswordError('');
    setPermissionError('');
    setFormError('');

    const cleanUsername = username.trim();
    if (!cleanUsername) {
      setUsernameError('Username is required.');
      hasError = true;
    } else if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
      setUsernameError('Username must contain only alphanumeric characters, underscores, or hyphens.');
      hasError = true;
    }

    if (!password) {
      setPasswordError('Password is required.');
      hasError = true;
    } else if (password.length < 4) {
      setPasswordError('Password must be at least 4 characters long.');
      hasError = true;
    }

    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm the password.');
      hasError = true;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match.');
      hasError = true;
    }

    if (compactSlugs.length === 0) {
      setPermissionError('At least one RBAC permission policy must be assigned to the operator.');
      hasError = true;
    }

    if (hasError) {
      setFormError('Please review and correct the errors below before provisioning.');
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await operatorService.createOperator({
        username: cleanUsername,
        password,
        permissions: compactSlugs,
      });
      onSuccess(created);
    } catch (err: unknown) {
      console.error('Failed to create operator:', err);
      setFormError('Failed to provision operator credentials. Please check backend connection.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <Form
        header={
          <Header
            variant="h1"
            description="Provision a new platform operator credentials and assign granular RBAC policies."
          >
            Create Operator
          </Header>
        }
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button variant="link" onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button variant="primary" loading={isSubmitting} formAction="submit">
              Create operator
            </Button>
          </SpaceBetween>
        }
        errorText={formError}
      >
        <SpaceBetween size="l">
          {/* Container 1: Operator Credentials */}
          <Container
            header={
              <Header
                variant="h2"
                description="Unique identity and authentication credentials for this operator account"
              >
                Operator Credentials
              </Header>
            }
          >
            <ColumnLayout columns={3}>
              <FormField
                label="Username"
                description="Unique alphanumeric identifier for the operator."
                errorText={usernameError}
              >
                <Input
                  value={username}
                  onChange={({ detail }) => {
                    setUsername(detail.value);
                    if (usernameError) setUsernameError('');
                  }}
                  placeholder="e.g. devops-lead"
                  autoComplete="off"
                />
              </FormField>

              <FormField
                label="Password"
                description="Minimum 4 characters."
                errorText={passwordError}
              >
                <Input
                  value={password}
                  onChange={({ detail }) => {
                    setPassword(detail.value);
                    if (passwordError) setPasswordError('');
                  }}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>

              <FormField
                label="Confirm Password"
                description="Re-type password to verify accuracy."
                errorText={confirmPasswordError}
              >
                <Input
                  value={confirmPassword}
                  onChange={({ detail }) => {
                    setConfirmPassword(detail.value);
                    if (confirmPasswordError) setConfirmPasswordError('');
                  }}
                  type="password"
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </FormField>
            </ColumnLayout>
          </Container>

          {/* Container 2: Granular RBAC Policy Assignment (Cascade Selection) */}
          <Container
            header={
              <Header
                variant="h2"
                description="Assign hierarchical permissions across platform services, resource scopes, and individual actions."
                actions={
                  <SpaceBetween direction="horizontal" size="xs">
                    <Button variant="normal" onClick={handleSelectAll}>
                      Select All (*::*::*)
                    </Button>
                    <Button variant="normal" onClick={handleClearAll}>
                      Clear All
                    </Button>
                    <Button
                      variant="normal"
                      onClick={() =>
                        handleToggleExpandAll(
                          !Object.values(expandedServices).every(Boolean)
                        )
                      }
                    >
                      {Object.values(expandedServices).every(Boolean)
                        ? 'Collapse All'
                        : 'Expand All'}
                    </Button>
                  </SpaceBetween>
                }
              >
                Granular RBAC Policy Assignment (Cascade Selection)
              </Header>
            }
          >
            <SpaceBetween size="m">
              {permissionError && (
                <Alert type="error" header="Permission Assignment Required">
                  {permissionError}
                </Alert>
              )}

              {/* Platform Root Wildcard Box */}
              <div
                style={{
                  border: isRootChecked
                    ? '2px solid #0972d3'
                    : '1px solid rgba(255, 255, 255, 0.15)',
                  backgroundColor: isRootChecked
                    ? 'rgba(9, 114, 211, 0.12)'
                    : 'rgba(255, 255, 255, 0.03)',
                  borderRadius: '8px',
                  padding: '16px',
                  transition: 'all 0.2s ease',
                }}
              >
                <SpaceBetween size="xs">
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Checkbox
                      checked={isRootChecked}
                      onChange={({ detail }) => handleToggleRoot(detail.checked)}
                    >
                      <span style={{ fontSize: '15px', fontWeight: 700 }}>
                        *::*::* — Platform Root (All Services, All Resources, All Actions)
                      </span>
                    </Checkbox>
                    {isRootChecked && <Badge color="green">Full Platform Bypass</Badge>}
                  </div>
                  <Box variant="small" color="text-body-secondary">
                    Global superuser wildcard bypassing all access restrictions across all LolaCloud services,
                    resources, and operations. When checked, all child services below are automatically selected
                    and marked as inherited.
                  </Box>
                </SpaceBetween>
              </div>

              {/* Optimized Slugs Preview Box */}
              <Container
                header={
                  <Header
                    variant="h3"
                    description="Parent wildcards automatically subsume granular child actions to keep token payloads compact."
                    actions={
                      <SpaceBetween direction="horizontal" size="xs" alignItems="center">
                        <Badge color={effectiveCount === TOTAL_SYSTEM_CAPABILITIES ? 'green' : effectiveCount > 0 ? 'blue' : 'grey'}>
                          {effectiveCount} / {TOTAL_SYSTEM_CAPABILITIES} capabilities granted ({Math.round((effectiveCount / TOTAL_SYSTEM_CAPABILITIES) * 100)}%)
                        </Badge>
                        <Badge color="grey">
                          {compactSlugs.length} stored slug{compactSlugs.length === 1 ? '' : 's'}
                        </Badge>
                      </SpaceBetween>
                    }
                  >
                    Live Policy Optimization Summary
                  </Header>
                }
              >
                <div>
                  <Box variant="awsui-key-label">Stored RBAC Policy Slugs:</Box>
                  <div
                    style={{
                      marginTop: '8px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: '6px',
                      minHeight: '28px',
                      alignItems: 'center',
                    }}
                  >
                    {compactSlugs.length === 0 ? (
                      <Box variant="small" color="text-body-secondary">
                        No permissions selected. Select rules below or enable Platform Root.
                      </Box>
                    ) : (
                      compactSlugs.map((slug) => {
                        const isSuper = slug === '*::*::*';
                        const isServiceWildcard = slug.endsWith('::*') && !slug.includes('::', slug.indexOf('::') + 1);
                        const color = isSuper ? 'green' : isServiceWildcard ? 'blue' : 'grey';
                        return (
                          <Badge key={slug} color={color}>
                            {slug}
                          </Badge>
                        );
                      })
                    )}
                  </div>
                </div>
              </Container>

              {/* Cascade Service Sections */}
              <SpaceBetween size="m">
                {PERMISSION_TAXONOMY.map((service) => {
                  const isServiceInherited = isRootChecked;
                  const isServiceExplicit = selectedSlugs.has(service.wildcardSlug);
                  const isServiceChecked = isServiceInherited || isServiceExplicit;

                  const isExpanded = expandedServices[service.id] ?? true;

                  return (
                    <ExpandableSection
                      key={service.id}
                      expanded={isExpanded}
                      onChange={({ detail }) => {
                        setExpandedServices((prev) => ({
                          ...prev,
                          [service.id]: detail.expanded,
                        }));
                      }}
                      headerText={`${service.title} (${service.description})`}
                    >
                      <div
                        style={{
                          backgroundColor: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '8px',
                          padding: '14px',
                          marginTop: '8px',
                        }}
                      >
                        <SpaceBetween size="m">
                          {/* Service Wildcard Checkbox */}
                          <div
                            style={{
                              backgroundColor: isServiceChecked
                                ? 'rgba(9, 114, 211, 0.15)'
                                : 'rgba(255, 255, 255, 0.04)',
                              border: isServiceChecked
                                ? '1px solid #0972d3'
                                : '1px solid rgba(255, 255, 255, 0.1)',
                              borderRadius: '6px',
                              padding: '10px 14px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              flexWrap: 'wrap',
                              gap: '8px',
                            }}
                          >
                            <Checkbox
                              checked={isServiceChecked}
                              disabled={isServiceInherited}
                              onChange={({ detail }) =>
                                handleToggleService(service.id, service.wildcardSlug, detail.checked)
                              }
                            >
                              <span style={{ fontWeight: 600 }}>
                                <code>{service.wildcardSlug}</code> — All {service.title} Operations
                              </span>
                            </Checkbox>
                            {isServiceInherited ? (
                              <Badge color="grey">Inherited from *::*::*</Badge>
                            ) : isServiceExplicit ? (
                              <Badge color="blue">Service Wildcard Active</Badge>
                            ) : null}
                          </div>

                          {/* Resources under Service */}
                          <SpaceBetween size="s">
                            {service.resources.map((resource) => {
                              const isResourceInherited = isServiceChecked;
                              const isResourceExplicit = selectedSlugs.has(resource.wildcardSlug);
                              const isResourceChecked = isResourceInherited || isResourceExplicit;

                              return (
                                <div
                                  key={resource.id}
                                  style={{
                                    backgroundColor: 'rgba(255, 255, 255, 0.03)',
                                    border: isResourceChecked
                                      ? '1px solid rgba(9, 114, 211, 0.6)'
                                      : '1px solid rgba(255, 255, 255, 0.07)',
                                    borderRadius: '6px',
                                    padding: '12px 14px',
                                  }}
                                >
                                  <SpaceBetween size="s">
                                    {/* Resource Wildcard Checkbox */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        flexWrap: 'wrap',
                                        gap: '6px',
                                        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                                        paddingBottom: '8px',
                                      }}
                                    >
                                      <Checkbox
                                        checked={isResourceChecked}
                                        disabled={isResourceInherited}
                                        onChange={({ detail }) =>
                                          handleToggleResource(
                                            service.id,
                                            resource.id,
                                            resource.wildcardSlug,
                                            detail.checked
                                          )
                                        }
                                      >
                                        <span style={{ fontWeight: 600 }}>
                                          <code>{resource.wildcardSlug}</code> — {resource.title}
                                        </span>
                                      </Checkbox>
                                      {isResourceInherited ? (
                                        <Badge color="grey">
                                          Inherited from {isRootChecked ? '*::*::*' : service.wildcardSlug}
                                        </Badge>
                                      ) : isResourceExplicit ? (
                                        <Badge color="blue">Resource Wildcard Active</Badge>
                                      ) : null}
                                    </div>

                                    {/* Individual Action Checkboxes */}
                                    <div
                                      style={{
                                        display: 'flex',
                                        flexWrap: 'wrap',
                                        gap: '12px 20px',
                                        paddingLeft: '24px',
                                        paddingTop: '4px',
                                      }}
                                    >
                                      {resource.actions.map((action) => {
                                        const isActionInherited = isResourceChecked;
                                        const isActionExplicit = selectedSlugs.has(action.slug);
                                        const isActionChecked = isActionInherited || isActionExplicit;

                                        return (
                                          <div
                                            key={action.id}
                                            style={{
                                              display: 'inline-flex',
                                              alignItems: 'center',
                                              minWidth: '110px',
                                            }}
                                          >
                                            <Checkbox
                                              checked={isActionChecked}
                                              disabled={isActionInherited}
                                              onChange={({ detail }) =>
                                                handleToggleAction(action.slug, detail.checked)
                                              }
                                            >
                                              <span
                                                style={{
                                                  fontSize: '13px',
                                                  color: isActionInherited
                                                    ? 'var(--color-text-body-secondary, #879596)'
                                                    : 'inherit',
                                                }}
                                              >
                                                <code>{action.id}</code>
                                              </span>
                                            </Checkbox>
                                            {isActionInherited && (
                                              <span
                                                style={{
                                                  fontSize: '11px',
                                                  color: '#7d8998',
                                                  marginLeft: '4px',
                                                }}
                                              >
                                                (inherited)
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </SpaceBetween>
                                </div>
                              );
                            })}
                          </SpaceBetween>
                        </SpaceBetween>
                      </div>
                    </ExpandableSection>
                  );
                })}
              </SpaceBetween>
            </SpaceBetween>
          </Container>
        </SpaceBetween>
      </Form>
    </form>
  );
};

import React, { useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  AppLayout,
  SideNavigation,
  BreadcrumbGroup,
  SpaceBetween,
  Header,
  type FlashbarProps,
} from '@cloudscape-design/components';
import { type OperatorIdentity, type OperatorItem } from '../../services/api';
import { LciDashboardView } from './views/LciDashboardView';
import { LciOperatorsView } from './views/LciOperatorsView';
import { LciCreateOperatorView } from './views/LciCreateOperatorView';
import { LciEditOperatorView } from './views/LciEditOperatorView';
import { LciPermissionsView } from './views/LciPermissionsView';
import { LciSessionsView } from './views/LciSessionsView';

interface LciModuleProps {
  operator: OperatorIdentity;
  onGoHome?: () => void;
}

export const LciModule: React.FC<LciModuleProps> = ({ operator }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [operatorFlashMessages, setOperatorFlashMessages] = useState<FlashbarProps.MessageDefinition[]>([]);

  const isCreateOperator = location.pathname === '/lci/operators/create';
  const isEditOperator = location.pathname.startsWith('/lci/operators/edit/');
  const isFormView = isCreateOperator || isEditOperator;

  const getTabLabel = () => {
    if (location.pathname.startsWith('/lci/operators/edit/')) {
      return 'Edit Operator';
    }
    switch (location.pathname) {
      case '/lci/operators':
        return 'Operators';
      case '/lci/operators/create':
        return 'Create Operator';
      case '/lci/rbac-policies':
        return 'RBAC Policies';
      case '/lci/sessions':
        return 'Active Sessions';
      case '/lci/dashboard':
      default:
        return 'Dashboard';
    }
  };

  const currentTabLabel = getTabLabel();

  const sideNavItems = [
    { type: 'link' as const, text: 'Dashboard', href: '/lci/dashboard' },
    {
      type: 'section' as const,
      text: 'Access Management',
      items: [
        { type: 'link' as const, text: 'Operators', href: '/lci/operators' },
        { type: 'link' as const, text: 'RBAC Policies', href: '/lci/rbac-policies' },
        { type: 'link' as const, text: 'Active Sessions', href: '/lci/sessions' },
      ],
    },
  ];

  // Breadcrumbs configuration dynamically reflecting current path
  const breadcrumbItems = (() => {
    const baseCrumbs = [
      { text: 'LolaCloud Console', href: '/' },
      { text: 'Lola Core Identity', href: '/lci/dashboard' },
    ];

    if (location.pathname === '/lci/operators/create') {
      return [
        ...baseCrumbs,
        { text: 'Operators', href: '/lci/operators' },
        { text: 'Create operator', href: '/lci/operators/create' },
      ];
    }

    if (location.pathname.startsWith('/lci/operators/edit/')) {
      return [
        ...baseCrumbs,
        { text: 'Operators', href: '/lci/operators' },
        { text: 'Edit Operator', href: location.pathname },
      ];
    }

    if (location.pathname === '/lci/operators') {
      return [
        ...baseCrumbs,
        { text: 'Operators', href: '/lci/operators' },
      ];
    }

    if (location.pathname === '/lci/rbac-policies') {
      return [
        ...baseCrumbs,
        { text: 'RBAC Policies', href: '/lci/rbac-policies' },
      ];
    }

    if (location.pathname === '/lci/sessions') {
      return [
        ...baseCrumbs,
        { text: 'Active Sessions', href: '/lci/sessions' },
      ];
    }

    // Default /lci/dashboard
    return [
      ...baseCrumbs,
      { text: 'Dashboard', href: '/lci/dashboard' },
    ];
  })();

  const activeHref = isFormView ? '/lci/operators' : location.pathname;

  return (
    <AppLayout
      contentType={isFormView ? 'form' : 'dashboard'}
      headerSelector="#top-navigation"
      navigation={
        <SideNavigation
          header={{
            href: '/lci/dashboard',
            text: 'Lola Core Identity',
          }}
          activeHref={activeHref}
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
      content={
        <SpaceBetween size="l">
          {!isFormView && (
            <Header
              variant="h1"
              description="Core IAM authority, cryptographic token governance and in-memory RBAC."
            >
              {currentTabLabel}
            </Header>
          )}

          <Routes>
            <Route
              path="dashboard"
              element={
                <LciDashboardView
                  operator={operator}
                  onNavigate={(tabId) => {
                    const tabMap: Record<string, string> = {
                      operators: '/lci/operators',
                      permissions: '/lci/rbac-policies',
                      'rbac-policies': '/lci/rbac-policies',
                      sessions: '/lci/sessions',
                      dashboard: '/lci/dashboard',
                    };
                    navigate(tabMap[tabId] || `/lci/${tabId}`);
                  }}
                />
              }
            />
            <Route
              path="operators"
              element={
                <LciOperatorsView
                  currentOperator={operator}
                  onCreateOperator={() => navigate('/lci/operators/create')}
                  flashMessages={operatorFlashMessages}
                  onDismissFlashMessage={(id) => {
                    setOperatorFlashMessages((prev) => prev.filter((m) => m.id !== id));
                  }}
                />
              }
            />
            <Route
              path="operators/create"
              element={
                <LciCreateOperatorView
                  onCancel={() => navigate('/lci/operators')}
                  onSuccess={(created: OperatorItem) => {
                    setOperatorFlashMessages([
                      {
                        type: 'success',
                        header: 'Operator Created Successfully',
                        content: `Operator "${created.username}" provisioned with ${created.permissions.length} RBAC policy rule(s).`,
                        dismissible: true,
                        id: `flash-created-${Date.now()}`,
                      },
                    ]);
                    navigate('/lci/operators');
                  }}
                />
              }
            />
            <Route
              path="operators/edit/:id"
              element={
                <LciEditOperatorView
                  currentOperator={operator}
                  onCancel={() => navigate('/lci/operators')}
                  onSuccess={(updated: OperatorItem) => {
                    setOperatorFlashMessages([
                      {
                        type: 'success',
                        header: 'Operator Updated Successfully',
                        content: `Operator "${updated.username}" updated with ${updated.permissions.length} RBAC policy rule(s).`,
                        dismissible: true,
                        id: `flash-updated-${Date.now()}`,
                      },
                    ]);
                    navigate('/lci/operators');
                  }}
                />
              }
            />
            <Route
              path="rbac-policies"
              element={<LciPermissionsView operator={operator} />}
            />
            <Route
              path="sessions"
              element={<LciSessionsView operator={operator} />}
            />
            <Route path="*" element={<Navigate to="/lci/dashboard" replace />} />
          </Routes>
        </SpaceBetween>
      }
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      toolsHide={true}
    />
  );
};

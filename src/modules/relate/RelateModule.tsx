import React, { useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  AppLayout,
  SideNavigation,
  BreadcrumbGroup,
  SpaceBetween,
} from '@cloudscape-design/components';
import { type OperatorIdentity } from '../../services/api';
import { RelateDashboardView } from './views/RelateDashboardView';
import { RelateInstancesView } from './views/RelateInstancesView';
import { RelateCreateInstanceView } from './views/RelateCreateInstanceView';
import { RelateInstanceDetailView } from './views/RelateInstanceDetailView';
import { RelateBackupsView } from './views/RelateBackupsView';
import { RelateRoutingView } from './views/RelateRoutingView';

interface RelateModuleProps {
  operator: OperatorIdentity;
}

export const RelateModule: React.FC<RelateModuleProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [activeInstanceName, setActiveInstanceName] = useState<string | null>(null);

  const isInstanceDetail =
    location.pathname.startsWith('/relate/instances/') &&
    location.pathname !== '/relate/instances' &&
    location.pathname !== '/relate/instances/create';

  const sideNavItems = [
    { type: 'link' as const, text: 'Dashboard', href: '/relate/dashboard' },
    {
      type: 'section' as const,
      text: 'Database Fleet',
      items: [
        { type: 'link' as const, text: 'Databases', href: '/relate/instances' },
        { type: 'link' as const, text: 'Backups & Snapshots', href: '/relate/backups' },
        { type: 'link' as const, text: 'Traefik TCP Routing', href: '/relate/routing' },
      ],
    },
  ];

  const breadcrumbItems = (() => {
    const baseCrumbs = [
      { text: 'LolaCloud Console', href: '/' },
      { text: 'Lola Relate', href: '/relate/dashboard' },
    ];

    if (location.pathname === '/relate/instances/create') {
      return [
        ...baseCrumbs,
        { text: 'Databases', href: '/relate/instances' },
        { text: 'Create database', href: '/relate/instances/create' },
      ];
    }

    if (isInstanceDetail) {
      return [
        ...baseCrumbs,
        { text: 'Databases', href: '/relate/instances' },
        { text: activeInstanceName || 'Database details', href: location.pathname },
      ];
    }

    if (location.pathname.startsWith('/relate/instances')) {
      return [...baseCrumbs, { text: 'Databases', href: '/relate/instances' }];
    }

    if (location.pathname.startsWith('/relate/backups')) {
      return [...baseCrumbs, { text: 'Backups & Snapshots', href: '/relate/backups' }];
    }

    if (location.pathname.startsWith('/relate/routing')) {
      return [...baseCrumbs, { text: 'Traefik TCP Routing', href: '/relate/routing' }];
    }

    return [...baseCrumbs, { text: 'Dashboard', href: '/relate/dashboard' }];
  })();

  return (
    <AppLayout
      contentType="dashboard"
      headerSelector="#top-navigation"
      navigation={
        <SideNavigation
          header={{
            href: '/relate/dashboard',
            text: 'Lola Relate',
          }}
          activeHref={
            location.pathname.startsWith('/relate/instances')
              ? '/relate/instances'
              : location.pathname.startsWith('/relate/backups')
              ? '/relate/backups'
              : location.pathname.startsWith('/relate/routing')
              ? '/relate/routing'
              : location.pathname
          }
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
          <Routes>
            <Route path="dashboard" element={<RelateDashboardView />} />
            <Route path="instances" element={<RelateInstancesView />} />
            <Route path="instances/create" element={<RelateCreateInstanceView />} />
            <Route
              path="instances/:instanceId"
              element={<RelateInstanceDetailView onInstanceLoaded={setActiveInstanceName} />}
            />
            <Route path="backups" element={<RelateBackupsView />} />
            <Route path="routing" element={<RelateRoutingView />} />
            <Route path="*" element={<Navigate to="/relate/dashboard" replace />} />
          </Routes>
        </SpaceBetween>
      }
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      toolsHide={true}
    />
  );
};

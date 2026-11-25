import React, { useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  AppLayout,
  SideNavigation,
  BreadcrumbGroup,
  SpaceBetween,
  Header,
} from '@cloudscape-design/components';
import { type OperatorIdentity } from '../../services/api';
import { RunwayDashboardView } from './views/RunwayDashboardView';
import { RunwayTunnelsView } from './views/RunwayTunnelsView';
import { RunwayAccountsView } from './views/RunwayAccountsView';
import { RunwayDnsView } from './views/RunwayDnsView';
import { RunwayTunnelDetailView } from './views/RunwayTunnelDetailView';
import { RunwayZoneDnsDetailView } from './views/RunwayZoneDnsDetailView';

interface RunwayModuleProps {
  operator: OperatorIdentity;
}

export const RunwayModule: React.FC<RunwayModuleProps> = ({ operator }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationOpen, setNavigationOpen] = useState(true);

  const isTunnelDetail = location.pathname.startsWith('/runway/tunnels/') && location.pathname !== '/runway/tunnels';
  const isZoneDnsDetail = location.pathname.startsWith('/runway/dns/zones/');

  const isTunnelsList = location.pathname === '/runway/tunnels';

  const getTabLabel = () => {
    if (isZoneDnsDetail) {
      return 'Authoritative DNS Zone Records';
    }
    if (isTunnelDetail) {
      return 'Tunnel Details';
    }
    switch (location.pathname) {
      case '/runway/tunnels':
        return 'Tunnels & Mesh';
      case '/runway/accounts':
        return 'Cloudflare Accounts';
      case '/runway/dns':
        return 'DNS & Auto-IP Fix';
      case '/runway/dashboard':
      default:
        return 'Dashboard';
    }
  };

  const currentTabLabel = getTabLabel();

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

  // Breadcrumbs dynamically reflecting current path
  const breadcrumbItems = (() => {
    const baseCrumbs = [
      { text: 'LolaCloud Console', href: '/' },
      { text: 'Lola Runway', href: '/runway/dashboard' },
    ];

    if (isTunnelDetail) {
      const parts = location.pathname.split('/');
      const tid = parts[parts.length - 1];
      return [
        ...baseCrumbs,
        { text: 'Tunnels & Mesh', href: '/runway/tunnels' },
        { text: tid, href: location.pathname },
      ];
    }
    if (isZoneDnsDetail) {
      const parts = location.pathname.split('/');
      const zid = decodeURIComponent(parts[parts.length - 1]);
      const zoneDisplayName = zid.startsWith('zone-') ? zid.replace(/^zone-/, '').replace(/-/g, '.') : zid;
      return [
        ...baseCrumbs,
        { text: 'DNS & Auto-IP Fix', href: '/runway/dns' },
        { text: zoneDisplayName, href: location.pathname },
      ];
    }
    if (location.pathname === '/runway/tunnels') {
      return [...baseCrumbs, { text: 'Tunnels & Mesh', href: '/runway/tunnels' }];
    }
    if (location.pathname === '/runway/accounts') {
      return [...baseCrumbs, { text: 'Cloudflare Accounts', href: '/runway/accounts' }];
    }
    if (location.pathname === '/runway/dns') {
      return [...baseCrumbs, { text: 'DNS & Auto-IP Fix', href: '/runway/dns' }];
    }
    return [...baseCrumbs, { text: 'Dashboard', href: '/runway/dashboard' }];
  })();

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
          activeHref={
            location.pathname.startsWith('/runway/dns')
              ? '/runway/dns'
              : location.pathname.startsWith('/runway/tunnels')
              ? '/runway/tunnels'
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
        isTunnelDetail ? undefined : (
          <BreadcrumbGroup
            items={breadcrumbItems}
            onFollow={(event) => {
              event.preventDefault();
              navigate(event.detail.href);
            }}
          />
        )
      }
      content={
        <SpaceBetween size="l">
          {!isZoneDnsDetail && !isTunnelDetail && !isTunnelsList && (
            <Header
              variant="h1"
              description="Dynamic networking, Cloudflare Argo Zero Trust tunnels and automated edge IP synchronization."
            >
              {currentTabLabel}
            </Header>
          )}

          <Routes>
            <Route
              path="dashboard"
              element={
                <RunwayDashboardView
                  operator={operator}
                  onNavigate={(tabId) => {
                    const tabMap: Record<string, string> = {
                      tunnels: '/runway/tunnels',
                      accounts: '/runway/accounts',
                      dns: '/runway/dns',
                      dashboard: '/runway/dashboard',
                    };
                    navigate(tabMap[tabId] || `/runway/${tabId}`);
                  }}
                />
              }
            />
            <Route
              path="tunnels"
              element={
                <RunwayTunnelsView
                  currentOperator={operator}
                  onNavigateToAccounts={() => navigate('/runway/accounts')}
                />
              }
            />
            <Route
              path="tunnels/:tunnelId"
              element={<RunwayTunnelDetailView />}
            />
            <Route
              path="accounts"
              element={<RunwayAccountsView currentOperator={operator} />}
            />
            <Route
              path="dns"
              element={<RunwayDnsView currentOperator={operator} />}
            />
            <Route
              path="dns/zones/:zoneId"
              element={<RunwayZoneDnsDetailView standalone={false} />}
            />
            <Route path="*" element={<Navigate to="/runway/dashboard" replace />} />
          </Routes>
        </SpaceBetween>
      }
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      toolsHide={true}
    />
  );
};

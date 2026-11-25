import React, { useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  AppLayout,
  SideNavigation,
  BreadcrumbGroup,
  SpaceBetween,
} from '@cloudscape-design/components';
import { type OperatorIdentity } from '../../services/api';
import { JournalDashboardView } from './views/JournalDashboardView';
import { JournalLogGroupsView } from './views/JournalLogGroupsView';
import { JournalLogStreamsView } from './views/JournalLogStreamsView';
import { JournalEventsView } from './views/JournalEventsView';
import { JournalLiveTailView } from './views/JournalLiveTailView';
import { JournalMetricsView } from './views/JournalMetricsView';

interface JournalModuleProps {
  operator: OperatorIdentity;
}

export const JournalModule: React.FC<JournalModuleProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeGroupName, setActiveGroupName] = useState<string | null>(null);

  const sideNavItems = [
    { type: 'link' as const, text: 'Overview', href: '/journal/dashboard' },
    {
      type: 'section' as const,
      text: 'Logs & Observability',
      items: [
        { type: 'link' as const, text: 'Log Groups', href: '/journal/groups' },
        { type: 'link' as const, text: 'Live Tail', href: '/journal/live-tail' },
      ],
    },
    {
      type: 'section' as const,
      text: 'Telemetry & Performance',
      items: [
        { type: 'link' as const, text: 'Metrics & Telemetry', href: '/journal/metrics' },
      ],
    },
  ];

  const breadcrumbItems = (() => {
    const baseCrumbs = [
      { text: 'LolaCloud Console', href: '/' },
      { text: 'Lola Journal', href: '/journal/dashboard' },
    ];

    if (location.pathname.startsWith('/journal/groups')) {
      const parts = location.pathname.split('/');
      // /journal/groups/:groupName/streams/:streamName/events
      if (parts.length >= 6 && parts[5] === 'events') {
        const grp = decodeURIComponent(parts[3] || '');
        const stm = decodeURIComponent(parts[5] ? parts[4] : '');
        return [
          ...baseCrumbs,
          { text: 'Log Groups', href: '/journal/groups' },
          { text: activeGroupName || grp, href: `/journal/groups/${encodeURIComponent(grp)}/streams` },
          { text: `${stm} Events`, href: location.pathname },
        ];
      }
      if (parts.length >= 4 && parts[3]) {
        const grp = decodeURIComponent(parts[3]);
        return [
          ...baseCrumbs,
          { text: 'Log Groups', href: '/journal/groups' },
          { text: activeGroupName || grp, href: `/journal/groups/${encodeURIComponent(grp)}/streams` },
        ];
      }
      return [...baseCrumbs, { text: 'Log Groups', href: '/journal/groups' }];
    }

    if (location.pathname.startsWith('/journal/live-tail')) {
      return [...baseCrumbs, { text: 'Live Tail', href: '/journal/live-tail' }];
    }

    if (location.pathname.startsWith('/journal/metrics')) {
      return [...baseCrumbs, { text: 'Metrics & Telemetry', href: '/journal/metrics' }];
    }

    return [...baseCrumbs, { text: 'Dashboard', href: '/journal/dashboard' }];
  })();

  const activeHref = location.pathname.startsWith('/journal/groups')
    ? '/journal/groups'
    : location.pathname.startsWith('/journal/live-tail')
    ? '/journal/live-tail'
    : location.pathname.startsWith('/journal/metrics')
    ? '/journal/metrics'
    : '/journal/dashboard';

  return (
    <AppLayout
      contentType="dashboard"
      headerSelector="#top-navigation"
      navigation={
        <SideNavigation
          header={{
            href: '/journal/dashboard',
            text: 'Lola Journal',
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
          <Routes>
            <Route path="dashboard" element={<JournalDashboardView />} />
            <Route path="groups" element={<JournalLogGroupsView />} />
            <Route
              path="groups/:groupName/streams"
              element={<JournalLogStreamsView onGroupLoaded={setActiveGroupName} />}
            />
            <Route
              path="groups/:groupName"
              element={<Navigate to="streams" replace />}
            />
            <Route
              path="groups/:groupName/streams/:streamName/events"
              element={<JournalEventsView />}
            />
            <Route path="live-tail" element={<JournalLiveTailView />} />
            <Route path="metrics" element={<JournalMetricsView />} />
            <Route path="*" element={<Navigate to="/journal/dashboard" replace />} />
          </Routes>
        </SpaceBetween>
      }
    />
  );
};

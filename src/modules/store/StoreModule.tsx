import React, { useState } from 'react';
import { useLocation, useNavigate, Routes, Route, Navigate } from 'react-router-dom';
import {
  AppLayout,
  SideNavigation,
  BreadcrumbGroup,
  SpaceBetween,
} from '@cloudscape-design/components';
import { type OperatorIdentity } from '../../services/api';
import { StoreDashboardView } from './views/StoreDashboardView';
import { StoreBucketsView } from './views/StoreBucketsView';
import { StoreCreateBucketView } from './views/StoreCreateBucketView';
import { StoreBucketDetailView } from './views/StoreBucketDetailView';
import { StoreAccessKeysView } from './views/StoreAccessKeysView';

interface StoreModuleProps {
  operator: OperatorIdentity;
}

export const StoreModule: React.FC<StoreModuleProps> = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [navigationOpen, setNavigationOpen] = useState(true);
  const [activeBucketName, setActiveBucketName] = useState<string | null>(null);

  const isBucketDetail =
    location.pathname.startsWith('/store/buckets/') &&
    location.pathname !== '/store/buckets' &&
    location.pathname !== '/store/buckets/create';

  const sideNavItems = [
    { type: 'link' as const, text: 'Dashboard', href: '/store/dashboard' },
    {
      type: 'section' as const,
      text: 'Amazon S3 Storage',
      items: [
        { type: 'link' as const, text: 'Buckets', href: '/store/buckets' },
        { type: 'link' as const, text: 'Access Keys', href: '/store/access-keys' },
      ],
    },
  ];

  const breadcrumbItems = (() => {
    const baseCrumbs = [
      { text: 'LolaCloud Console', href: '/' },
      { text: 'Lola Store', href: '/store/dashboard' },
    ];

    if (location.pathname === '/store/buckets/create') {
      return [
        ...baseCrumbs,
        { text: 'Buckets', href: '/store/buckets' },
        { text: 'Create bucket', href: '/store/buckets/create' },
      ];
    }

    if (isBucketDetail) {
      return [
        ...baseCrumbs,
        { text: 'Buckets', href: '/store/buckets' },
        { text: activeBucketName || 'Bucket details', href: location.pathname },
      ];
    }

    if (location.pathname.startsWith('/store/buckets')) {
      return [...baseCrumbs, { text: 'Buckets', href: '/store/buckets' }];
    }

    if (location.pathname.startsWith('/store/access-keys')) {
      return [...baseCrumbs, { text: 'Access Keys', href: '/store/access-keys' }];
    }

    return [...baseCrumbs, { text: 'Dashboard', href: '/store/dashboard' }];
  })();

  return (
    <AppLayout
      contentType="dashboard"
      headerSelector="#top-navigation"
      navigation={
        <SideNavigation
          header={{
            href: '/store/dashboard',
            text: 'Lola Store',
          }}
          activeHref={
            location.pathname.startsWith('/store/buckets')
              ? '/store/buckets'
              : location.pathname.startsWith('/store/access-keys')
              ? '/store/access-keys'
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
            <Route path="dashboard" element={<StoreDashboardView />} />
            <Route path="buckets" element={<StoreBucketsView />} />
            <Route path="buckets/create" element={<StoreCreateBucketView />} />
            <Route
              path="buckets/:bucketName"
              element={<StoreBucketDetailView onBucketLoaded={setActiveBucketName} />}
            />
            <Route path="access-keys" element={<StoreAccessKeysView />} />
            <Route path="*" element={<Navigate to="/store/dashboard" replace />} />
          </Routes>
        </SpaceBetween>
      }
      navigationOpen={navigationOpen}
      onNavigationChange={({ detail }) => setNavigationOpen(detail.open)}
      toolsHide={true}
    />
  );
};

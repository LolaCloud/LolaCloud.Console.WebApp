import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TopNavigation,
  Autosuggest,
  type AutosuggestProps,
} from '@cloudscape-design/components';
import { applyMode, Mode } from '@cloudscape-design/global-styles';
import { type OperatorIdentity, authService } from '../services/api';

interface NavigationHeaderProps {
  operator: OperatorIdentity;
  onSelectService?: (serviceKey: string) => void;
  onGoHome?: () => void;
  onLogout?: () => void | Promise<void>;
  activeServiceKey?: string | null;
}

const SERVICE_OPTIONS: AutosuggestProps.Option[] = [
  {
    value: 'lci',
    label: 'Lola Core Identity (LCI)',
    description: 'IAM, Operator Authentication, RBAC Wildcards & JWT Tokens',
    tags: ['IAM', 'Security', 'Auth', 'LCI', 'Identity'],
  },
  {
    value: 'relate',
    label: 'Lola Relate (DBaaS)',
    description: 'Multi-tenant database engine with automatic TLS SNI routing and schema isolation',
    tags: ['Database', 'Postgres', 'RLS', 'DBaaS', 'Relate', 'MySQL', 'SQLServer'],
    disabled: false,
  },
  {
    value: 'stacker',
    label: 'Lola Stacker (Container Engine)',
    description: 'Docker Engine daemon, cgroups & virtual bridges (Coming soon)',
    tags: ['Docker', 'Containers', 'cgroups', 'Stacker'],
    disabled: true,
  },
  {
    value: 'runway',
    label: 'Lola Runway (Edge & Networking)',
    description: 'Cloudflare DNS sync, Auto-IP fix & dynamic tunnels',
    tags: ['DNS', 'Networking', 'Cloudflare', 'Tunnels', 'Runway', 'Edge'],
    disabled: false,
  },
  {
    value: 'keeper',
    label: 'Lola Keeper (Telemetry & Logs)',
    description: 'Real-time WebSocket log streaming & metrics (Coming soon)',
    tags: ['Logs', 'Telemetry', 'WebSockets', 'Keeper'],
    disabled: true,
  },
  {
    value: 'store',
    label: 'Lola Store (S3 Object Storage)',
    description: 'AWS S3-compatible Object Storage powered by MinIO, bucket management and presigned URLs',
    tags: ['S3', 'Storage', 'Buckets', 'MinIO', 'Store', 'Objects'],
    disabled: false,
  },
  {
    value: 'journal',
    label: 'Lola Journal (Observability & Logs)',
    description: 'Centralized observability, live container log streaming and telemetry metrics',
    tags: ['Logs', 'Telemetry', 'CloudWatch', 'Metrics', 'Journal', 'Live Tail', 'Observability'],
    disabled: false,
  },
];

export const NavigationHeader: React.FC<NavigationHeaderProps> = ({
  operator,
  onSelectService,
  onGoHome,
  onLogout,
}) => {
  const navigate = useNavigate();
  const [searchValue, setSearchValue] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = localStorage.getItem('lola_theme');
    return saved === 'light' ? 'light' : 'dark';
  });

  const handleToggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    applyMode(newTheme === 'dark' ? Mode.Dark : Mode.Light);
    localStorage.setItem('lola_theme', newTheme);
    window.dispatchEvent(new CustomEvent('lola-theme-change', { detail: newTheme }));
  };

  const filteredOptions = SERVICE_OPTIONS.filter((opt) => {
    if (!searchValue.trim()) return true;
    const query = searchValue.toLowerCase();
    const matchesLabel = opt.label?.toLowerCase().includes(query);
    const matchesDesc = opt.description?.toLowerCase().includes(query);
    const matchesTags = opt.tags?.some((t) => t.toLowerCase().includes(query));
    return matchesLabel || matchesDesc || matchesTags;
  });

  const handleSelectOption = (detail: AutosuggestProps.Option) => {
    if (detail.value && !detail.disabled) {
      if (detail.value === 'lci') {
        navigate('/lci/dashboard');
      } else if (detail.value === 'runway') {
        navigate('/runway/dashboard');
      } else if (detail.value === 'relate') {
        navigate('/relate/dashboard');
      } else if (detail.value === 'store') {
        navigate('/store/dashboard');
      } else if (detail.value === 'journal') {
        navigate('/journal/dashboard');
      }
      if (onSelectService) {
        onSelectService(detail.value);
      }
      setSearchValue('');
    }
  };

  const handleSignOut = async () => {
    if (onLogout) {
      await onLogout();
    } else {
      await authService.logout();
      navigate('/login');
    }
  };

  return (
    <div className="lola-top-navigation-header">
      <TopNavigation
        identity={{
          href: '/',
          onFollow: (e) => {
            e.preventDefault();
            navigate('/');
            if (onGoHome) onGoHome();
          },
          logo: {
            src: '/logo-circle.png',
            alt: 'LolaCloud',
          },
        }}
        search={
          <div style={{ width: '100%', maxWidth: '520px' }}>
            <Autosuggest
              value={searchValue}
              onChange={({ detail }) => setSearchValue(detail.value)}
              options={filteredOptions}
              onSelect={({ detail }) => handleSelectOption(detail)}
              placeholder="Search services, features (e.g. LCI, IAM, Tokens)..."
              empty="No matching services found"
              clearAriaLabel="Clear search input"
              ariaLabel="Search LolaCloud services"
            />
          </div>
        }
        utilities={[
          {
            type: 'menu-dropdown',
            text: operator.username,
            iconName: 'user-profile',
            items: [
              {
                id: 'theme-toggle',
                text: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
                iconName: 'light-dark',
              },
              { id: 'divider-theme', text: '-' },
              { id: 'signout', text: 'Sign Out' },
            ],
            onItemClick: ({ detail }) => {
              if (detail.id === 'theme-toggle') {
                handleToggleTheme();
              } else if (detail.id === 'signout') {
                handleSignOut();
              }
            },
          },
        ]}
      />
    </div>
  );
};

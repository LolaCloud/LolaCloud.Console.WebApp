import React from 'react';
import { Badge } from '@cloudscape-design/components';
import { type EngineType } from '../../../services/relateService';

interface EngineBadgeProps {
  engine: EngineType;
  version?: string;
  size?: 'normal' | 'large';
}

export const EngineBadge: React.FC<EngineBadgeProps> = ({ engine, version }) => {
  const getEngineDetails = () => {
    switch (engine) {
      case 'POSTGRESQL':
        return {
          label: version ? `PostgreSQL ${version}` : 'PostgreSQL',
          color: 'blue' as const,
          style: undefined,
        };
      case 'MYSQL':
        return {
          label: version ? `MySQL ${version}` : 'MySQL',
          color: 'red' as const,
          style: {
            root: {
              background: '#d97706',
              color: '#ffffff',
              borderColor: '#b45309',
            },
          },
        };
      case 'SQLSERVER':
        return {
          label: version ? `SQL Server ${version}` : 'SQL Server',
          color: 'grey' as const,
          style: {
            root: {
              background: '#7c3aed',
              color: '#ffffff',
              borderColor: '#6d28d9',
            },
          },
        };
      default:
        return {
          label: engine,
          color: 'grey' as const,
          style: undefined,
        };
    }
  };

  const details = getEngineDetails();

  return (
    <Badge color={details.color} style={details.style}>
      {details.label}
    </Badge>
  );
};

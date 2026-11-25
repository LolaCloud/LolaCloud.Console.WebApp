export interface PermissionAction {
  id: string;
  slug: string;
  label?: string;
}

export interface PermissionResource {
  id: string;
  title: string;
  wildcardSlug: string;
  actions: PermissionAction[];
}

export interface PermissionServiceDefinition {
  id: string;
  title: string;
  description: string;
  wildcardSlug: string;
  resources: PermissionResource[];
}

export const PERMISSION_TAXONOMY: PermissionServiceDefinition[] = [
  {
    id: 'relate',
    title: 'Relate',
    description: 'PostgreSQL DBaaS',
    wildcardSlug: 'relate::*',
    resources: [
      {
        id: 'instance',
        title: 'Database Instances',
        wildcardSlug: 'relate::instance::*',
        actions: [
          { id: 'create', slug: 'relate::instance::create' },
          { id: 'read', slug: 'relate::instance::read' },
          { id: 'update', slug: 'relate::instance::update' },
          { id: 'delete', slug: 'relate::instance::delete' },
          { id: 'reboot', slug: 'relate::instance::reboot' },
          { id: 'scale', slug: 'relate::instance::scale' },
        ],
      },
      {
        id: 'schema',
        title: 'Schemas & Migrations',
        wildcardSlug: 'relate::schema::*',
        actions: [
          { id: 'create', slug: 'relate::schema::create' },
          { id: 'migrate', slug: 'relate::schema::migrate' },
          { id: 'export', slug: 'relate::schema::export' },
          { id: 'drop', slug: 'relate::schema::drop' },
        ],
      },
      {
        id: 'backup',
        title: 'Backups & Snapshots',
        wildcardSlug: 'relate::backup::*',
        actions: [
          { id: 'create', slug: 'relate::backup::create' },
          { id: 'restore', slug: 'relate::backup::restore' },
        ],
      },
    ],
  },
  {
    id: 'stacker',
    title: 'Stacker',
    description: 'Container Orchestration',
    wildcardSlug: 'stacker::*',
    resources: [
      {
        id: 'container',
        title: 'Containers',
        wildcardSlug: 'stacker::container::*',
        actions: [
          { id: 'create', slug: 'stacker::container::create' },
          { id: 'start', slug: 'stacker::container::start' },
          { id: 'stop', slug: 'stacker::container::stop' },
          { id: 'restart', slug: 'stacker::container::restart' },
          { id: 'delete', slug: 'stacker::container::delete' },
          { id: 'logs', slug: 'stacker::container::logs' },
        ],
      },
      {
        id: 'image',
        title: 'Images',
        wildcardSlug: 'stacker::image::*',
        actions: [
          { id: 'pull', slug: 'stacker::image::pull' },
          { id: 'build', slug: 'stacker::image::build' },
          { id: 'delete', slug: 'stacker::image::delete' },
        ],
      },
      {
        id: 'network',
        title: 'Networks',
        wildcardSlug: 'stacker::network::*',
        actions: [
          { id: 'create', slug: 'stacker::network::create' },
          { id: 'delete', slug: 'stacker::network::delete' },
        ],
      },
    ],
  },
  {
    id: 'runway',
    title: 'Runway',
    description: 'Edge & Networking',
    wildcardSlug: 'runway::*',
    resources: [
      {
        id: 'dns',
        title: 'DNS Records',
        wildcardSlug: 'runway::dns::*',
        actions: [
          { id: 'sync', slug: 'runway::dns::sync' },
          { id: 'manage', slug: 'runway::dns::manage' },
        ],
      },
      {
        id: 'tunnel',
        title: 'Secure Tunnels',
        wildcardSlug: 'runway::tunnel::*',
        actions: [
          { id: 'open', slug: 'runway::tunnel::open' },
          { id: 'close', slug: 'runway::tunnel::close' },
        ],
      },
      {
        id: 'ip',
        title: 'IP Routing',
        wildcardSlug: 'runway::ip::*',
        actions: [
          { id: 'auto_fix', slug: 'runway::ip::auto_fix' },
        ],
      },
    ],
  },
  {
    id: 'keeper',
    title: 'Keeper',
    description: 'Telemetry & Logs',
    wildcardSlug: 'keeper::*',
    resources: [
      {
        id: 'stream',
        title: 'Log Streams',
        wildcardSlug: 'keeper::stream::*',
        actions: [
          { id: 'read', slug: 'keeper::stream::read' },
        ],
      },
      {
        id: 'metrics',
        title: 'System Metrics',
        wildcardSlug: 'keeper::metrics::*',
        actions: [
          { id: 'query', slug: 'keeper::metrics::query' },
        ],
      },
    ],
  },
  {
    id: 'store',
    title: 'Store',
    description: 'Secrets Vault',
    wildcardSlug: 'store::*',
    resources: [
      {
        id: 'secret',
        title: 'Secrets Management',
        wildcardSlug: 'store::secret::*',
        actions: [
          { id: 'read', slug: 'store::secret::read' },
          { id: 'write', slug: 'store::secret::write' },
          { id: 'delete', slug: 'store::secret::delete' },
        ],
      },
      {
        id: 'key',
        title: 'Cryptographic Keys',
        wildcardSlug: 'store::key::*',
        actions: [
          { id: 'rotate', slug: 'store::key::rotate' },
        ],
      },
    ],
  },
  {
    id: 'lci',
    title: 'LCI',
    description: 'Lola Core Identity',
    wildcardSlug: 'lci::*',
    resources: [
      {
        id: 'operator',
        title: 'Operators',
        wildcardSlug: 'lci::operator::*',
        actions: [
          { id: 'create', slug: 'lci::operator::create' },
          { id: 'read', slug: 'lci::operator::read' },
          { id: 'update', slug: 'lci::operator::update' },
          { id: 'delete', slug: 'lci::operator::delete' },
        ],
      },
      {
        id: 'session',
        title: 'Operator Sessions',
        wildcardSlug: 'lci::session::*',
        actions: [
          { id: 'read', slug: 'lci::session::read' },
          { id: 'revoke', slug: 'lci::session::revoke' },
        ],
      },
    ],
  },
];

export const TOTAL_SYSTEM_CAPABILITIES = PERMISSION_TAXONOMY.reduce(
  (total, svc) => total + svc.resources.reduce((rTotal, res) => rTotal + res.actions.length, 0),
  0
);

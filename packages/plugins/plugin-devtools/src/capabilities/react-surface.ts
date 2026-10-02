//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Surface from '@dxos/app-framework/Surface';
import type * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import {
  AutomergeArticle,
  ConfigArticle,
  CredentialsArticle,
  DatabaseCard,
  DeviceListArticle,
  DiagnosticsArticle,
  EdgeDashboardArticle,
  FeedsArticle,
  IdentityArticle,
  KeyringArticle,
  LoggingArticle,
  MembersArticle,
  MemoryCard,
  MetadataArticle,
  NetworkArticle,
  NetworkCard,
  ObjectsArticle,
  PerformanceCard,
  QueriesArticle,
  QueuesArticle,
  ReplicatorCard,
  ReplicatorMessagesCard,
  SchemaArticle,
  SignalArticle,
  SqliteArticle,
  StorageArticle,
  SwarmArticle,
  TimeSeriesCard,
  WorkflowArticle,
} from '@dxos/devtools';
import * as DebugSurface from '@dxos/plugin-debug/DebugSurface';

import {
  CliArticle,
  DebugGraph,
  DevtoolsOverviewContainer,
  RegistryArticle,
  ToolsExplorerContainer,
} from '#containers';
import { Devtools } from '#types';

import {
  EdgeCardSurface,
  IndexerCardSurface,
  QueriesCardSurface,
  SurfaceProfilerCardSurface,
  SwarmTraceCardSurface,
  SyncCardSurface,
  devtoolsCard,
} from './DevtoolsCards.tsx';
import {
  ActiveSpacePanel,
  EdgeTestingSurface,
  EdgeTracesSurface,
  SpaceInfoSurface,
  SpaceListSurface,
} from './DevtoolsSurfaces.tsx';

type GraphDebug = {
  graph: AppGraph.Graph;
  root: string;
};

const isGraphDebug = (data: unknown): data is GraphDebug => {
  if (typeof data !== 'object' || data === null || !('graph' in data) || !('root' in data)) {
    return false;
  }

  const { graph, root } = data;
  return (
    typeof graph === 'object' &&
    graph !== null &&
    'json' in graph &&
    typeof graph.json === 'function' &&
    typeof root === 'string'
  );
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(Capabilities.ReactSurface, [
      Surface.Root.create({
        id: 'appGraph',
        filter: AppSurface.subject(DebugSurface.Page, isGraphDebug),
        component: DebugGraph,
        props: ({ role, data: { subject } }) => ({ role, graph: subject.graph, root: subject.root }),
      }),
      Surface.Root.create({
        id: 'toolsExplorer',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.ToolsExplorer),
        component: ToolsExplorerContainer,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'cli',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Cli),
        component: CliArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'registry',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Registry),
        component: RegistryArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'devtoolsOverview',
        filter: Surface.Root.makeFilter(AppSurface.deckCompanion('devtoolsOverview')),
        component: DevtoolsOverviewContainer,
      }),

      //
      // Stats cards, in stack order.
      //

      Surface.Root.create({
        id: 'card.memory',
        filter: devtoolsCard,
        position: 0,
        component: MemoryCard,
        props: ({ data: { stats } }) => ({ memory: stats.memory }),
      }),
      Surface.Root.create({
        id: 'card.network',
        filter: devtoolsCard,
        position: 1,
        component: NetworkCard,
        props: ({ data: { stats } }) => ({ network: stats.network }),
      }),
      Surface.Root.create({
        id: 'card.edge',
        filter: devtoolsCard,
        position: 2,
        component: EdgeCardSurface,
        props: ({ data: { stats } }) => ({ stats }),
      }),
      Surface.Root.create({
        id: 'card.performance',
        filter: devtoolsCard,
        position: 3,
        component: PerformanceCard,
        props: ({ data: { stats } }) => ({ entries: stats.performanceEntries }),
      }),
      Surface.Root.create({
        id: 'card.swarmTrace',
        filter: devtoolsCard,
        position: 4,
        component: SwarmTraceCardSurface,
      }),
      Surface.Root.create({
        id: 'card.surfaceProfiler',
        filter: devtoolsCard,
        position: 5,
        component: SurfaceProfilerCardSurface,
        props: ({ data: { surfaceProfilerStats, onClearSurfaceProfiler } }) => ({
          surfaceProfilerStats,
          onClearSurfaceProfiler,
        }),
      }),
      Surface.Root.create({
        id: 'card.database',
        filter: devtoolsCard,
        position: 6,
        component: DatabaseCard,
        props: ({ data: { stats } }) => ({ database: stats.database }),
      }),
      Surface.Root.create({
        id: 'card.replicator',
        filter: devtoolsCard,
        position: 7,
        component: ReplicatorCard,
        props: ({ data: { stats } }) => ({ database: stats.database }),
      }),
      Surface.Root.create({
        id: 'card.replicatorMessages',
        filter: devtoolsCard,
        position: 8,
        component: ReplicatorMessagesCard,
        props: ({ data: { stats } }) => ({ database: stats.database }),
      }),
      Surface.Root.create({
        id: 'card.queries',
        filter: devtoolsCard,
        position: 9,
        component: QueriesCardSurface,
      }),
      Surface.Root.create({
        id: 'card.sync',
        filter: devtoolsCard,
        position: 11,
        component: SyncCardSurface,
      }),
      Surface.Root.create({
        id: 'card.indexer',
        filter: devtoolsCard,
        position: 12,
        component: IndexerCardSurface,
      }),
      Surface.Root.create({
        id: 'card.timeSeries',
        filter: devtoolsCard,
        position: 13,
        component: TimeSeriesCard,
      }),

      //
      // Devtools
      //

      Surface.Root.create({
        id: 'client.config',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Client.Config),
        component: ConfigArticle,
        props: ({ role }) => ({ role, vaultSelector: false }),
      }),
      Surface.Root.create({
        id: 'client.storage',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Client.Storage),
        component: StorageArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'client.sqlite',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Client.Sqlite),
        component: SqliteArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'client.logs',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Client.Logs),
        component: LoggingArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'client.diagnostics',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Client.Diagnostics),
        component: DiagnosticsArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'halo.identity',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Halo.Identity),
        component: IdentityArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'halo.devices',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Halo.Devices),
        component: DeviceListArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'halo.keyring',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Halo.Keyring),
        component: KeyringArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'halo.credentials',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Halo.Credentials),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: CredentialsArticle }),
      }),
      Surface.Root.create({
        id: 'echo.spaces',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Spaces),
        component: SpaceListSurface,
        props: ({ role, data: { onNavigate } }) => ({ role, onNavigate }),
      }),
      Surface.Root.create({
        id: 'echo.space',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Space),
        component: SpaceInfoSurface,
        props: ({ role, data: { onNavigate } }) => ({ role, onNavigate }),
      }),
      Surface.Root.create({
        id: 'echo.feeds',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Feeds),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: FeedsArticle }),
      }),
      Surface.Root.create({
        id: 'echo.objects',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Objects),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: ObjectsArticle }),
      }),
      Surface.Root.create({
        id: 'echo.queries',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Queries),
        component: QueriesArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'echo.schema',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Schema),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: SchemaArticle }),
      }),
      Surface.Root.create({
        id: 'echo.automerge',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Automerge),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: AutomergeArticle }),
      }),
      Surface.Root.create({
        id: 'echo.queues',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Queues),
        component: QueuesArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'echo.members',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Members),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: MembersArticle }),
      }),
      Surface.Root.create({
        id: 'echo.metadata',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Echo.Metadata),
        component: MetadataArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'mesh.signal',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Mesh.Signal),
        component: SignalArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'mesh.swarm',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Mesh.Swarm),
        component: SwarmArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'mesh.network',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Mesh.Network),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: NetworkArticle }),
      }),
      Surface.Root.create({
        id: 'edge.dashboard',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Edge.Dashboard),
        component: EdgeDashboardArticle,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'edge.workflows',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Edge.Workflows),
        component: ActiveSpacePanel,
        props: ({ role }) => ({ role, Panel: WorkflowArticle }),
      }),
      Surface.Root.create({
        id: 'edge.traces',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Edge.Traces),
        component: EdgeTracesSurface,
        props: ({ role }) => ({ role }),
      }),
      Surface.Root.create({
        id: 'edge.testing',
        filter: AppSurface.literal(DebugSurface.Page, Devtools.Edge.Testing),
        component: EdgeTestingSurface,
        props: ({ role }) => ({ role }),
      }),
    ]);
  }),
);

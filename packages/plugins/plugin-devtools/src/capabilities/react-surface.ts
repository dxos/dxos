//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import { Surface } from '@dxos/app-framework/ui';
import type * as AppGraph from '@dxos/app-graph/AppGraph';
import { AppSurface } from '@dxos/app-toolkit/ui';
import {
  AutomergePanel,
  ConfigPanel,
  CredentialsPanel,
  DeviceListPanel,
  DiagnosticsPanel,
  EdgeDashboardPanel,
  FeedsPanel,
  IdentityPanel,
  KeyringPanel,
  LoggingPanel,
  MembersPanel,
  MetadataPanel,
  NetworkPanel,
  ObjectsPanel,
  QueuesPanel,
  SchemaPanel,
  SignalPanel,
  SqlitePanel,
  StoragePanel,
  SwarmPanel,
  WorkflowPanel,
} from '@dxos/devtools';

import { CliPanel, DebugGraph, DevtoolsOverviewContainer, RegistryPanel, ToolsExplorerContainer } from '#containers';
import { Devtools } from '#types';

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
      Surface.create({
        id: 'appGraph',
        filter: AppSurface.subject(AppSurface.Article, isGraphDebug),
        component: DebugGraph,
        props: ({ data: { subject } }) => ({ graph: subject.graph, root: subject.root }),
      }),
      Surface.create({
        id: 'toolsExplorer',
        filter: AppSurface.literal(AppSurface.Article, Devtools.ToolsExplorer),
        component: ToolsExplorerContainer,
      }),
      Surface.create({
        id: 'cli',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Cli),
        component: CliPanel,
      }),
      Surface.create({
        id: 'registry',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Registry),
        component: RegistryPanel,
      }),
      Surface.create({
        id: 'devtoolsOverview',
        filter: Surface.makeFilter(AppSurface.deckCompanion('devtoolsOverview')),
        component: DevtoolsOverviewContainer,
      }),

      //
      // Devtools
      //

      Surface.create({
        id: 'client.config',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Config),
        component: ConfigPanel,
        props: () => ({ vaultSelector: false }),
      }),
      Surface.create({
        id: 'client.storage',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Storage),
        component: StoragePanel,
      }),
      Surface.create({
        id: 'client.sqlite',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Sqlite),
        component: SqlitePanel,
      }),
      Surface.create({
        id: 'client.logs',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Logs),
        component: LoggingPanel,
      }),
      Surface.create({
        id: 'client.diagnostics',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Diagnostics),
        component: DiagnosticsPanel,
      }),
      Surface.create({
        id: 'halo.identity',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Identity),
        component: IdentityPanel,
      }),
      Surface.create({
        id: 'halo.devices',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Devices),
        component: DeviceListPanel,
      }),
      Surface.create({
        id: 'halo.keyring',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Keyring),
        component: KeyringPanel,
      }),
      Surface.create({
        id: 'halo.credentials',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Credentials),
        component: ActiveSpacePanel,
        props: () => ({ Panel: CredentialsPanel }),
      }),
      Surface.create({
        id: 'echo.spaces',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Spaces),
        component: SpaceListSurface,
      }),
      Surface.create({
        id: 'echo.space',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Space),
        component: SpaceInfoSurface,
      }),
      Surface.create({
        id: 'echo.feeds',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Feeds),
        component: ActiveSpacePanel,
        props: () => ({ Panel: FeedsPanel }),
      }),
      Surface.create({
        id: 'echo.objects',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Objects),
        component: ActiveSpacePanel,
        props: () => ({ Panel: ObjectsPanel }),
      }),
      Surface.create({
        id: 'echo.schema',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Schema),
        component: ActiveSpacePanel,
        props: () => ({ Panel: SchemaPanel }),
      }),
      Surface.create({
        id: 'echo.automerge',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Automerge),
        component: ActiveSpacePanel,
        props: () => ({ Panel: AutomergePanel }),
      }),
      Surface.create({
        id: 'echo.queues',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Queues),
        component: QueuesPanel,
      }),
      Surface.create({
        id: 'echo.members',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Members),
        component: ActiveSpacePanel,
        props: () => ({ Panel: MembersPanel }),
      }),
      Surface.create({
        id: 'echo.metadata',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Metadata),
        component: MetadataPanel,
      }),
      Surface.create({
        id: 'mesh.signal',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Signal),
        component: SignalPanel,
      }),
      Surface.create({
        id: 'mesh.swarm',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Swarm),
        component: SwarmPanel,
      }),
      Surface.create({
        id: 'mesh.network',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Network),
        component: ActiveSpacePanel,
        props: () => ({ Panel: NetworkPanel }),
      }),
      Surface.create({
        id: 'edge.dashboard',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Dashboard),
        component: EdgeDashboardPanel,
      }),
      Surface.create({
        id: 'edge.workflows',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Workflows),
        component: ActiveSpacePanel,
        props: () => ({ Panel: WorkflowPanel }),
      }),
      Surface.create({
        id: 'edge.traces',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Traces),
        component: EdgeTracesSurface,
      }),
      Surface.create({
        id: 'edge.testing',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Testing),
        component: EdgeTestingSurface,
      }),
    ]);
  }),
);

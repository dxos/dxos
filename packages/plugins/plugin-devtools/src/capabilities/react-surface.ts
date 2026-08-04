//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface } from '@dxos/app-framework/ui';
import { AppSurface } from '@dxos/app-toolkit/ui';
import { EDGE_SERVICE_DEFAULTS, EdgeServiceName } from '@dxos/config';
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
import { type Graph } from '@dxos/plugin-graph';
import { ToolsExplorer } from '@dxos/react-ui-introspect';

import { DebugGraph, DevtoolsOverviewContainer, RegistryPanel } from '#containers';
import { Devtools } from '#types';

import {
  ActiveSpacePanel,
  EdgeTestingSurface,
  EdgeTracesSurface,
  SpaceInfoSurface,
  SpaceListSurface,
} from './DevtoolsSurfaces';

const MCP_SERVER_URL = EDGE_SERVICE_DEFAULTS[EdgeServiceName.Introspect];

type GraphDebug = {
  graph: Graph.Graph;
  root: string;
};

const isGraphDebug = (data: any): data is GraphDebug => {
  const graph = data?.graph;
  return (
    graph != null && typeof graph === 'object' && typeof graph.json === 'function' && typeof data?.root === 'string'
  );
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: 'appGraph',
        filter: AppSurface.subject(AppSurface.Article, isGraphDebug),
        component: DebugGraph,
        props: ({ data: { subject } }) => ({ graph: subject.graph, root: subject.root }),
      }),
      Surface.create({
        id: 'toolsExplorer',
        filter: AppSurface.literal(AppSurface.Article, Devtools.ToolsExplorer),
        component: ToolsExplorer,
        props: () => ({ serverUrl: MCP_SERVER_URL }),
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

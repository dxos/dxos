//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation, getObjectPathFromObject } from '@dxos/app-toolkit';
import { DXN } from '@dxos/keys';
import { AppSurface, useActiveSpace } from '@dxos/app-toolkit/ui';
import {
  AutomergePanel,
  ConfigPanel,
  CredentialsPanel,
  DeviceListPanel,
  DiagnosticsPanel,
  EdgeDashboardPanel,
  FeedsPanel,
  IdentityPanel,
  InvocationTraceContainer,
  KeyringPanel,
  LoggingPanel,
  MembersPanel,
  MetadataPanel,
  NetworkPanel,
  ObjectsPanel,
  QueuesPanel,
  SchemaPanel,
  SignalPanel,
  SpaceInfoPanel,
  SpaceListPanel,
  StoragePanel,
  SwarmPanel,
  TestingPanel,
  WorkflowPanel,
} from '@dxos/devtools';
import { Collection, Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Graph } from '@dxos/plugin-graph';
import { ScriptOperation } from '@dxos/plugin-script';
import { SpaceOperation } from '@dxos/plugin-space';
import { type Space, SpaceState, isSpace } from '@dxos/react-client/echo';
import { ToolsExplorer } from '@dxos/react-ui-introspect';

import { DebugSettings } from '#components';
import {
  DebugGraph,
  DebugObjectPanel,
  DebugSpaceObjectsPanel,
  DebugStatus,
  DevtoolsOverviewContainer,
  SpaceGenerator,
  Wireframe,
} from '#containers';
import { meta } from '#meta';
import { DebugCapabilities, type Settings, Devtools } from '#types';

// TODO(burdon): Move to config.
const MCP_SERVER_URL = 'https://introspect-service-labs.dxos.workers.dev/mcp';

type SpaceDebug = {
  type: string;
  space: Space;
};

type GraphDebug = {
  graph: Graph.Graph;
  root: string;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data?.type === `${meta.id}.space` && isSpace(data.space);
const isGraphDebug = (data: any): data is GraphDebug => {
  const graph = data?.graph;
  return (
    graph != null && typeof graph === 'object' && typeof graph.json === 'function' && typeof data?.root === 'string'
  );
};

type ReactSurfaceOptions = {
  logStore?: IdbLogStore;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* ({ logStore }: ReactSurfaceOptions) {
    const capabilities = yield* Capability.Service;
    const registry = capabilities.get(Capabilities.AtomRegistry);
    const settingsAtom = capabilities.get(DebugCapabilities.Settings);
    const fileUploader = capabilities.getAll(AppCapabilities.FileUploader)[0];

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.pluginSettings'),
        filter: AppSurface.settings(AppSurface.Article, meta.id),
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<Settings.Settings>(subject.atom);
          return (
            <DebugSettings
              settings={settings}
              onSettingsChange={updateSettings}
              logStore={logStore}
              onUpload={fileUploader}
            />
          );
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.space'),
        role: 'article',
        filter: (data): data is { subject: SpaceDebug } => isSpaceDebug(data.subject),
        component: ({ role, data }) => {
          const { invokePromise } = useOperationInvoker();

          const handleCreateObject = useCallback(
            (objects: Obj.Unknown[]) => {
              if (!isSpace(data.subject.space)) {
                return;
              }

              const collection =
                data.subject.space.state.get() === SpaceState.SPACE_READY &&
                data.subject.space.properties[Collection.Collection.typename]?.target;
              if (!Obj.instanceOf(Collection.Collection, collection)) {
                return;
              }

              objects.forEach((object) => {
                void invokePromise(SpaceOperation.AddObject, {
                  target: collection,
                  object,
                });
              });
            },
            [data.subject.space, invokePromise],
          );

          return <SpaceGenerator role={role} space={data.subject.space} onCreateObjects={handleCreateObject} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.appGraph'),
        role: 'article',
        filter: (data): data is { subject: GraphDebug } => isGraphDebug(data.subject),
        component: ({ data }) => <DebugGraph graph={data.subject.graph} root={data.subject.root} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.toolsExplorer'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.ToolsExplorer),
        component: () => <ToolsExplorer serverUrl={MCP_SERVER_URL} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.wireframe'),
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        role: ['article', 'section'],
        position: 'first',
        filter: (data): data is { subject: Obj.Unknown } => {
          const settings = registry.get(settingsAtom);
          return Obj.isObject(data.subject) && !!settings.wireframe;
        },
        component: ({ data, role, name }) => (
          <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
        ),
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.objectDebug'),
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'debug'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ role, data }) => <DebugObjectPanel role={role} companionTo={data.companionTo} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.devtoolsOverview'),
        filter: AppSurface.literal(Surface.makeType<{ subject: string }>('deck-companion--devtools'), 'devtools'),
        component: () => <DevtoolsOverviewContainer />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.spaceObjects'),
        filter: AppSurface.literal(
          Surface.makeType<{ subject: string }>('deck-companion--space-objects'),
          'space-objects',
        ),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <DebugSpaceObjectsPanel space={space} />;
        },
      }),

      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.status'),
        role: 'status-indicator',
        position: 'first',
        component: () => <DebugStatus />,
      }),

      //
      // Devtools
      //

      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.clientConfig'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Config),
        component: () => <ConfigPanel vaultSelector={false} />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.clientStorage'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Storage),
        component: () => <StoragePanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.clientLogs'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Logs),
        component: () => <LoggingPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.clientDiagnostics'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Diagnostics),
        component: () => <DiagnosticsPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.haloIdentity'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Identity),
        component: () => <IdentityPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.haloDevices'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Devices),
        component: () => <DeviceListPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.haloKeyring'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Keyring),
        component: () => <KeyringPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.haloCredentials'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Credentials),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <CredentialsPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoSpaces'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Spaces),
        component: () => {
          const { invokePromise } = useOperationInvoker();
          const handleSelect = useCallback(
            () => invokePromise(LayoutOperation.Open, { subject: [Devtools.Echo.Space] }),
            [invokePromise],
          );
          return <SpaceListPanel onSelect={handleSelect} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoSpace'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Space),
        component: () => {
          const space = useActiveSpace();
          const { invokePromise } = useOperationInvoker();
          const handleSelect = useCallback(
            () => invokePromise(LayoutOperation.Open, { subject: [Devtools.Echo.Feeds] }),
            [invokePromise],
          );
          if (!space) {
            return null;
          }

          return <SpaceInfoPanel space={space} onSelectFeed={handleSelect} onSelectPipeline={handleSelect} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoFeeds'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Feeds),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <FeedsPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoObjects'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Objects),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <ObjectsPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoSchema'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Schema),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <SchemaPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoAutomerge'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Automerge),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <AutomergePanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoQueues'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Queues),
        component: () => <QueuesPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoMembers'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Members),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <MembersPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.echoMetadata'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Metadata),
        component: () => <MetadataPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.meshSignal'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Signal),
        component: () => <SignalPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.meshSwarm'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Swarm),
        component: () => <SwarmPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.meshNetwork'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Network),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <NetworkPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.edgeDashboard'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Dashboard),
        component: () => <EdgeDashboardPanel />,
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.edgeWorkflows'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Workflows),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <WorkflowPanel space={space} />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.edgeTraces'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Traces),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          const feed = space.properties.invocationTraceFeed?.target;
          const feedDXN = feed ? Feed.getQueueUri(feed) : undefined;
          return <InvocationTraceContainer db={space.db} feedDXN={feedDXN} detailAxis='block' />;
        },
      }),
      Surface.create({
        id: DXN.make('org.dxos.plugin.debug.surface.edgeTesting'),
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Testing),
        component: () => {
          const { invokePromise } = useOperationInvoker();
          const onSpaceCreate = useCallback(
            async (space: Space) => {
              await space.waitUntilReady();
              await invokePromise(SpaceOperation.Migrate, { space });
              await space.db.flush();
            },
            [invokePromise],
          );
          const onScriptPluginOpen = useCallback(
            async (space: Space) => {
              await space.waitUntilReady();
              const createResult = await invokePromise(ScriptOperation.CreateScript, { db: space.db });
              if (createResult.data?.object) {
                await invokePromise(SpaceOperation.AddObject, { target: space.db, object: createResult.data.object });
              }
              log.info('script created', { result: createResult });
              if (createResult.data?.object) {
                await invokePromise(LayoutOperation.Open, {
                  subject: [getObjectPathFromObject(createResult.data.object)],
                });
              }
            },
            [invokePromise],
          );
          return <TestingPanel onSpaceCreate={onSpaceCreate} onScriptPluginOpen={onScriptPluginOpen} />;
        },
      }),
    ]);
  }),
);

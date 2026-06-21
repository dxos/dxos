//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppAnnotation, AppCapabilities, LayoutOperation, Paths } from '@dxos/app-toolkit';
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
  SqlitePanel,
  StoragePanel,
  SwarmPanel,
  TestingPanel,
  WorkflowPanel,
} from '@dxos/devtools';
import { Annotation, Collection, Feed, Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { type IdbLogStore } from '@dxos/log-store-idb';
import { type Graph } from '@dxos/plugin-graph';
import { ScriptOperation } from '@dxos/plugin-script';
import { SpaceOperation } from '@dxos/plugin-space';
import { type Space, SpaceState, isSpace } from '@dxos/react-client/echo';
import { ToolsExplorer } from '@dxos/react-ui-introspect';
import { Position } from '@dxos/util';

import {
  DebugGraph,
  DebugObjectPanel,
  DebugSettings,
  DebugSpaceObjectsPanel,
  DebugStatus,
  DevtoolsOverviewContainer,
  RegistryPanel,
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

const isSpaceDebug = (data: any): data is SpaceDebug =>
  data?.type === `${meta.profile.key}.space` && isSpace(data.space);
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
        id: 'pluginSettings',
        filter: AppSurface.settings(AppSurface.Article, meta.profile.key),
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
        id: 'space',
        filter: AppSurface.subject(AppSurface.Article, isSpaceDebug),
        component: ({ role, data }) => {
          const { invokePromise } = useOperationInvoker();

          const handleCreateObject = useCallback(
            (objects: Obj.Unknown[]) => {
              if (!isSpace(data.subject.space)) {
                return;
              }

              const collection =
                data.subject.space.state.get() === SpaceState.SPACE_READY &&
                Annotation.get(data.subject.space.properties, AppAnnotation.RootCollectionAnnotation).pipe(
                  Option.getOrUndefined,
                )?.target;
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
        id: 'appGraph',
        filter: AppSurface.subject(AppSurface.Article, isGraphDebug),
        component: ({ data }) => <DebugGraph graph={data.subject.graph} root={data.subject.root} />,
      }),
      Surface.create({
        id: 'toolsExplorer',
        filter: AppSurface.literal(AppSurface.Article, Devtools.ToolsExplorer),
        component: () => <ToolsExplorer serverUrl={MCP_SERVER_URL} />,
      }),
      Surface.create({
        id: 'registry',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Registry),
        component: () => <RegistryPanel />,
      }),
      Surface.create({
        id: 'wireframe',
        // TODO(wittjosiah): Split into multiple surfaces if this filter proves too strict for non-article roles.
        filter: AppSurface.oneOf(
          AppSurface.subject(AppSurface.Article, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
          AppSurface.subject(AppSurface.Section, (value): value is Obj.Unknown => {
            const settings = registry.get(settingsAtom);
            return Obj.isObject(value) && !!settings.wireframe;
          }),
        ),
        position: Position.first,
        component: ({ data, role, name }) => (
          <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
        ),
      }),
      Surface.create({
        id: 'objectDebug',
        filter: AppSurface.allOf(
          AppSurface.literal(AppSurface.Article, 'debug'),
          AppSurface.companion(AppSurface.Article),
        ),
        component: ({ role, data }) => <DebugObjectPanel role={role} companionTo={data.companionTo} />,
      }),
      Surface.create({
        id: 'devtoolsOverview',
        filter: Surface.makeFilter(AppSurface.deckCompanion('devtools')),
        component: () => <DevtoolsOverviewContainer />,
      }),
      Surface.create({
        id: 'spaceObjects',
        filter: Surface.makeFilter(AppSurface.deckCompanion('spaceObjects')),
        component: () => {
          const space = useActiveSpace();
          if (!space) {
            return null;
          }

          return <DebugSpaceObjectsPanel space={space} />;
        },
      }),

      Surface.create({
        id: 'debugStatus',
        filter: Surface.makeFilter(AppSurface.StatusIndicator),
        position: Position.first,
        component: () => <DebugStatus />,
      }),

      //
      // Devtools
      //

      Surface.create({
        id: 'client.config',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Config),
        component: () => <ConfigPanel vaultSelector={false} />,
      }),
      Surface.create({
        id: 'client.storage',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Storage),
        component: () => <StoragePanel />,
      }),
      Surface.create({
        id: 'client.sqlite',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Sqlite),
        component: () => <SqlitePanel />,
      }),
      Surface.create({
        id: 'client.logs',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Logs),
        component: () => <LoggingPanel />,
      }),
      Surface.create({
        id: 'client.diagnostics',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Client.Diagnostics),
        component: () => <DiagnosticsPanel />,
      }),
      Surface.create({
        id: 'halo.identity',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Identity),
        component: () => <IdentityPanel />,
      }),
      Surface.create({
        id: 'halo.devices',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Devices),
        component: () => <DeviceListPanel />,
      }),
      Surface.create({
        id: 'halo.keyring',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Halo.Keyring),
        component: () => <KeyringPanel />,
      }),
      Surface.create({
        id: 'halo.credentials',
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
        id: 'echo.spaces',
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
        id: 'echo.space',
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
        id: 'echo.feeds',
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
        id: 'echo.objects',
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
        id: 'echo.schema',
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
        id: 'echo.automerge',
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
        id: 'echo.queues',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Queues),
        component: () => <QueuesPanel />,
      }),
      Surface.create({
        id: 'echo.members',
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
        id: 'echo.metadata',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Echo.Metadata),
        component: () => <MetadataPanel />,
      }),
      Surface.create({
        id: 'mesh.signal',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Signal),
        component: () => <SignalPanel />,
      }),
      Surface.create({
        id: 'mesh.swarm',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Mesh.Swarm),
        component: () => <SwarmPanel />,
      }),
      Surface.create({
        id: 'mesh.network',
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
        id: 'edge.dashboard',
        filter: AppSurface.literal(AppSurface.Article, Devtools.Edge.Dashboard),
        component: () => <EdgeDashboardPanel />,
      }),
      Surface.create({
        id: 'edge.workflows',
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
        id: 'edge.traces',
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
        id: 'edge.testing',
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
                  subject: [Paths.getObjectPathFromObject(createResult.data.object)],
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

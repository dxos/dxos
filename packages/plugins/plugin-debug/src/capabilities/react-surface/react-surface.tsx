//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Surface, useCapability, useOperationInvoker, useSettingsState } from '@dxos/app-framework/ui';
import { AppCapabilities, LayoutOperation } from '@dxos/app-toolkit';
import { useLayout } from '@dxos/app-toolkit/ui';
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
  TracingPanel,
  WorkflowPanel,
} from '@dxos/devtools';
import { Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { type Graph } from '@dxos/plugin-graph';
import { ScriptOperation } from '@dxos/plugin-script/types';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { type Space, SpaceState, isSpace, parseId } from '@dxos/react-client/echo';
import { Layout } from '@dxos/react-ui';
import { Collection } from '@dxos/schema';

import {
  DebugGraph,
  DebugObjectPanel,
  DebugSettings,
  DebugStatus,
  DevtoolsOverviewContainer,
  SpaceGenerator,
  Wireframe,
} from '../../components';
import { meta } from '../../meta';
import { DebugCapabilities, type DebugSettingsProps, Devtools } from '../../types';

type SpaceDebug = {
  type: string;
  space: Space;
};

type GraphDebug = {
  graph: Graph.Graph;
  root: string;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data?.type === `${meta.id}/space` && isSpace(data.space);
const isGraphDebug = (data: any): data is GraphDebug => {
  const graph = data?.graph;
  return (
    graph != null && typeof graph === 'object' && typeof graph.json === 'function' && typeof data?.root === 'string'
  );
};

// TODO(wittjosiah): Factor out?
const useCurrentSpace = () => {
  const layout = useLayout();
  const client = useCapability(ClientCapabilities.Client);
  const { spaceId } = parseId(layout.workspace);
  const space = spaceId ? client.spaces.get(spaceId) : undefined;
  return space;
};

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    const registry = capabilities.get(Capabilities.AtomRegistry);
    const settingsAtom = capabilities.get(DebugCapabilities.Settings);

    return Capability.contributes(Capabilities.ReactSurface, [
      Surface.create({
        id: `${meta.id}/plugin-settings`,
        role: 'article',
        filter: (data): data is { subject: AppCapabilities.Settings } =>
          AppCapabilities.isSettings(data.subject) && data.subject.prefix === meta.id,
        component: ({ data: { subject } }) => {
          const { settings, updateSettings } = useSettingsState<DebugSettingsProps>(subject.atom);
          return <DebugSettings settings={settings} onSettingsChange={updateSettings} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/space`,
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

          return (
            <Layout.Main role={role}>
              <SpaceGenerator space={data.subject.space} onCreateObjects={handleCreateObject} />
            </Layout.Main>
          );
        },
      }),
      Surface.create({
        id: `${meta.id}/app-graph`,
        role: 'article',
        filter: (data): data is { subject: GraphDebug } => isGraphDebug(data.subject),
        component: ({ data }) => <DebugGraph graph={data.subject.graph} root={data.subject.root} />,
      }),
      Surface.create({
        id: `${meta.id}/wireframe`,
        role: ['article', 'section'],
        position: 'hoist',
        filter: (data): data is { subject: Obj.Unknown } => {
          const settings = registry.get(settingsAtom);
          return Obj.isObject(data.subject) && !!settings.wireframe;
        },
        component: ({ data, role }) => (
          <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
        ),
      }),
      Surface.create({
        id: `${meta.id}/object-debug`,
        role: 'article',
        filter: (data): data is { companionTo: Obj.Unknown } =>
          data.subject === 'debug' && Obj.isObject(data.companionTo),
        component: ({ data }) => <DebugObjectPanel object={data.companionTo} />,
      }),
      Surface.create({
        id: `${meta.id}/devtools-overview`,
        role: 'deck-companion--devtools',
        component: () => <DevtoolsOverviewContainer />,
      }),
      Surface.create({
        id: `${meta.id}/status`,
        role: 'status',
        component: () => <DebugStatus />,
      }),

      //
      // Devtools
      //

      Surface.create({
        id: `${meta.id}/client/config`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Client.Config,
        component: () => <ConfigPanel vaultSelector={false} />,
      }),
      Surface.create({
        id: `${meta.id}/client/storage`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Client.Storage,
        component: () => <StoragePanel />,
      }),
      Surface.create({
        id: `${meta.id}/client/logs`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Client.Logs,
        component: () => <LoggingPanel />,
      }),
      Surface.create({
        id: `${meta.id}/client/diagnostics`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Client.Diagnostics,
        component: () => <DiagnosticsPanel />,
      }),
      Surface.create({
        id: `${meta.id}/client/tracing`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Client.Tracing,
        component: () => <TracingPanel />,
      }),
      Surface.create({
        id: `${meta.id}/halo/identity`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Halo.Identity,
        component: () => <IdentityPanel />,
      }),
      Surface.create({
        id: `${meta.id}/halo/devices`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Halo.Devices,
        component: () => <DeviceListPanel />,
      }),
      Surface.create({
        id: `${meta.id}/halo/keyring`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Halo.Keyring,
        component: () => <KeyringPanel />,
      }),
      Surface.create({
        id: `${meta.id}/halo/credentials`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Halo.Credentials,
        component: () => {
          const space = useCurrentSpace();
          return <CredentialsPanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/spaces`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Spaces,
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
        id: `${meta.id}/echo/space`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Space,
        component: () => {
          const space = useCurrentSpace();
          const { invokePromise } = useOperationInvoker();
          const handleSelect = useCallback(
            () => invokePromise(LayoutOperation.Open, { subject: [Devtools.Echo.Feeds] }),
            [invokePromise],
          );
          return <SpaceInfoPanel space={space} onSelectFeed={handleSelect} onSelectPipeline={handleSelect} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/feeds`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Feeds,
        component: () => {
          const space = useCurrentSpace();
          return <FeedsPanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/objects`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Objects,
        component: () => {
          const space = useCurrentSpace();
          return <ObjectsPanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/schema`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Schema,
        component: () => {
          const space = useCurrentSpace();
          return <SchemaPanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/automerge`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Automerge,
        component: () => {
          const space = useCurrentSpace();
          return <AutomergePanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/queues`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Queues,
        component: () => <QueuesPanel />,
      }),
      Surface.create({
        id: `${meta.id}/echo/members`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Members,
        component: () => {
          const space = useCurrentSpace();
          return <MembersPanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/echo/metadata`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Echo.Metadata,
        component: () => <MetadataPanel />,
      }),
      Surface.create({
        id: `${meta.id}/mesh/signal`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Mesh.Signal,
        component: () => <SignalPanel />,
      }),
      Surface.create({
        id: `${meta.id}/mesh/swarm`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Mesh.Swarm,
        component: () => <SwarmPanel />,
      }),
      Surface.create({
        id: `${meta.id}/mesh/network`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Mesh.Network,
        component: () => {
          const space = useCurrentSpace();
          return <NetworkPanel space={space} />;
        },
      }),
      // TODO(wittjosiah): Remove?
      // createSurface({
      //   id: `${meta.id}/agent/dashboard`,
      //   role: 'article',
      //   filter: (data): data is any => data.subject === Devtools.Agent.Dashboard,
      //   component: () => <DashboardPanel />,
      // }),
      Surface.create({
        id: `${meta.id}/edge/dashboard`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Edge.Dashboard,
        component: () => <EdgeDashboardPanel />,
      }),
      Surface.create({
        id: `${meta.id}/edge/workflows`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Edge.Workflows,
        component: () => {
          const space = useCurrentSpace();
          return <WorkflowPanel space={space} />;
        },
      }),
      Surface.create({
        id: `${meta.id}/edge/traces`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Edge.Traces,
        component: () => {
          const space = useCurrentSpace();
          const queueDxn = space?.properties.invocationTraceQueue?.dxn;
          return <InvocationTraceContainer db={space?.db} queueDxn={queueDxn} detailAxis='block' />;
        },
      }),
      Surface.create({
        id: `${meta.id}/edge/testing`,
        role: 'article',
        filter: (data): data is any => data.subject === Devtools.Edge.Testing,
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
              if (createResult.data?.object?.id) {
                await invokePromise(LayoutOperation.Open, {
                  subject: [`${space.id}:${createResult.data.object.id}`],
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

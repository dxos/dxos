//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import React, { useCallback } from 'react';

import {
  Capabilities,
  chain,
  contributes,
  createIntent,
  createSurface,
  LayoutAction,
  useCapability,
  useIntentDispatcher,
  type PluginContext,
} from '@dxos/app-framework';
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
import { Obj, Type } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph } from '@dxos/plugin-graph';
import { ScriptAction } from '@dxos/plugin-script/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { SpaceState, isSpace, type Space, parseId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import {
  DebugApp,
  DebugObjectPanel,
  DebugSettings,
  DebugStatus,
  DevtoolsOverviewContainer,
  SpaceGenerator,
  Wireframe,
} from '../components';
import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps, Devtools } from '../types';

type SpaceDebug = {
  type: string;
  space: Space;
};

type GraphDebug = {
  graph: Graph;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data?.type === `${DEBUG_PLUGIN}/space` && isSpace(data.space);
const isGraphDebug = (data: any): data is GraphDebug => data?.graph instanceof Graph;

// TODO(wittjosiah): Factor out?
const useCurrentSpace = () => {
  const layout = useCapability(Capabilities.Layout);
  const client = useCapability(ClientCapabilities.Client);
  const { spaceId } = parseId(layout.workspace);
  const space = spaceId ? client.spaces.get(spaceId) : undefined;
  return space;
};

export default (context: PluginContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${DEBUG_PLUGIN}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<DebugSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === DEBUG_PLUGIN,
      component: ({ data: { subject } }) => <DebugSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/space`,
      role: 'article',
      filter: (data): data is { subject: SpaceDebug } => isSpaceDebug(data.subject),
      component: ({ data }) => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();

        const handleCreateObject = useCallback(
          (objects: Obj.Any[]) => {
            if (!isSpace(data.subject.space)) {
              return;
            }

            const collection =
              data.subject.space.state.get() === SpaceState.SPACE_READY &&
              data.subject.space.properties[Type.getTypename(DataType.Collection)]?.target;
            if (!Obj.instanceOf(DataType.Collection, collection)) {
              return;
            }

            objects.forEach((object) => {
              void dispatch(createIntent(SpaceAction.AddObject, { target: collection, object }));
            });
          },
          [data.subject.space],
        );

        return (
          <StackItem.Content>
            <SpaceGenerator space={data.subject.space} onCreateObjects={handleCreateObject} />
          </StackItem.Content>
        );
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/graph`,
      role: 'article',
      filter: (data): data is { subject: GraphDebug } => isGraphDebug(data.subject),
      component: ({ data }) => <DebugApp graph={data.subject.graph} />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/wireframe`,
      role: ['article', 'section'],
      position: 'hoist',
      filter: (data): data is { subject: Obj.Any } => {
        const settings = context
          .getCapability(Capabilities.SettingsStore)
          .getStore<DebugSettingsProps>(DEBUG_PLUGIN)!.value;
        return Obj.isObject(data.subject) && !!settings.wireframe;
      },
      component: ({ data, role }) => (
        <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
      ),
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/object-debug`,
      role: 'article',
      filter: (data): data is { companionTo: Obj.Any } => data.subject === 'debug' && Obj.isObject(data.companionTo),
      component: ({ data }) => <DebugObjectPanel object={data.companionTo} />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/devtools-overview`,
      role: 'deck-companion--devtools',
      component: () => <DevtoolsOverviewContainer />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/status`,
      role: 'status',
      component: () => <DebugStatus />,
    }),

    //
    // Devtools
    //

    createSurface({
      id: `${DEBUG_PLUGIN}/client/config`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Config,
      component: () => <ConfigPanel vaultSelector={false} />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/client/storage`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Storage,
      component: () => <StoragePanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/client/logs`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Logs,
      component: () => <LoggingPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/client/diagnostics`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Diagnostics,
      component: () => <DiagnosticsPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/client/tracing`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Tracing,
      component: () => <TracingPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/halo/identity`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Identity,
      component: () => <IdentityPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/halo/devices`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Devices,
      component: () => <DeviceListPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/halo/keyring`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Keyring,
      component: () => <KeyringPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/halo/credentials`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Credentials,
      component: () => {
        const space = useCurrentSpace();
        return <CredentialsPanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/spaces`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Spaces,
      component: () => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const handleSelect = useCallback(
          () => dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [Devtools.Echo.Space] })),
          [dispatch],
        );
        return <SpaceListPanel onSelect={handleSelect} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/space`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Space,
      component: () => {
        const space = useCurrentSpace();
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const handleSelect = useCallback(
          () => dispatch(createIntent(LayoutAction.Open, { part: 'main', subject: [Devtools.Echo.Feeds] })),
          [dispatch],
        );
        return <SpaceInfoPanel space={space} onSelectFeed={handleSelect} onSelectPipeline={handleSelect} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/feeds`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Feeds,
      component: () => {
        const space = useCurrentSpace();
        return <FeedsPanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/objects`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Objects,
      component: () => {
        const space = useCurrentSpace();
        return <ObjectsPanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/schema`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Schema,
      component: () => {
        const space = useCurrentSpace();
        return <SchemaPanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/automerge`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Automerge,
      component: () => {
        const space = useCurrentSpace();
        return <AutomergePanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/queues`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Queues,
      component: () => <QueuesPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/members`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Members,
      component: () => {
        const space = useCurrentSpace();
        return <MembersPanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/echo/metadata`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Metadata,
      component: () => <MetadataPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/mesh/signal`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Mesh.Signal,
      component: () => <SignalPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/mesh/swarm`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Mesh.Swarm,
      component: () => <SwarmPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/mesh/network`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Mesh.Network,
      component: () => {
        const space = useCurrentSpace();
        return <NetworkPanel space={space} />;
      },
    }),
    // TODO(wittjosiah): Remove?
    // createSurface({
    //   id: `${DEBUG_PLUGIN}/agent/dashboard`,
    //   role: 'article',
    //   filter: (data): data is any => data.subject === Devtools.Agent.Dashboard,
    //   component: () => <DashboardPanel />,
    // }),
    createSurface({
      id: `${DEBUG_PLUGIN}/edge/dashboard`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Dashboard,
      component: () => <EdgeDashboardPanel />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/edge/workflows`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Workflows,
      component: () => {
        const space = useCurrentSpace();
        return <WorkflowPanel space={space} />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/edge/traces`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Traces,
      component: () => {
        const space = useCurrentSpace();
        return <InvocationTraceContainer space={space} detailAxis='block' />;
      },
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/edge/testing`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Testing,
      component: () => {
        const { dispatchPromise: dispatch } = useIntentDispatcher();
        const onSpaceCreate = useCallback(
          async (space: Space) => {
            await space.waitUntilReady();
            await dispatch(createIntent(SpaceAction.Migrate, { space }));
            await space.db.flush();
          },
          [dispatch],
        );
        const onScriptPluginOpen = useCallback(
          async (space: Space) => {
            await space.waitUntilReady();
            const result = await dispatch(
              pipe(createIntent(ScriptAction.Create, { space }), chain(SpaceAction.AddObject, { target: space })),
            );
            log.info('script created', { result });
            await dispatch(
              createIntent(LayoutAction.Open, { part: 'main', subject: [`${space.id}:${result.data?.object.id}`] }),
            );
          },
          [dispatch],
        );
        return <TestingPanel onSpaceCreate={onSpaceCreate} onScriptPluginOpen={onScriptPluginOpen} />;
      },
    }),
  ]);

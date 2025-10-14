//
// Copyright 2025 DXOS.org
//

import * as Function from 'effect/Function';
import React, { useCallback } from 'react';

import {
  Capabilities,
  LayoutAction,
  type PluginContext,
  chain,
  contributes,
  createIntent,
  createSurface,
  useCapability,
  useIntentDispatcher,
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
import { Obj } from '@dxos/echo';
import { SettingsStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph } from '@dxos/plugin-graph';
import { ScriptAction } from '@dxos/plugin-script/types';
import { SpaceAction } from '@dxos/plugin-space/types';
import { type Space, SpaceState, isSpace, parseId } from '@dxos/react-client/echo';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import {
  DebugGraph,
  DebugObjectPanel,
  DebugSettings,
  DebugStatus,
  DevtoolsOverviewContainer,
  SpaceGenerator,
  Wireframe,
} from '../components';
import { meta } from '../meta';
import { type DebugSettingsProps, Devtools } from '../types';

type SpaceDebug = {
  type: string;
  space: Space;
};

type GraphDebug = {
  graph: Graph;
  root: string;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data?.type === `${meta.id}/space` && isSpace(data.space);
const isGraphDebug = (data: any): data is GraphDebug => data?.graph instanceof Graph && typeof data?.root === 'string';

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
      id: `${meta.id}/plugin-settings`,
      role: 'article',
      filter: (data): data is { subject: SettingsStore<DebugSettingsProps> } =>
        data.subject instanceof SettingsStore && data.subject.prefix === meta.id,
      component: ({ data: { subject } }) => <DebugSettings settings={subject.value} />,
    }),
    createSurface({
      id: `${meta.id}/space`,
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
              data.subject.space.properties[DataType.Collection.typename]?.target;
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
      id: `${meta.id}/graph`,
      role: 'article',
      filter: (data): data is { subject: GraphDebug } => isGraphDebug(data.subject),
      component: ({ data }) => <DebugGraph graph={data.subject.graph} root={data.subject.root} />,
    }),
    createSurface({
      id: `${meta.id}/wireframe`,
      role: ['article', 'section'],
      position: 'hoist',
      filter: (data): data is { subject: Obj.Any } => {
        const settings = context.getCapability(Capabilities.SettingsStore).getStore<DebugSettingsProps>(meta.id)!.value;
        return Obj.isObject(data.subject) && !!settings.wireframe;
      },
      component: ({ data, role }) => (
        <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
      ),
    }),
    createSurface({
      id: `${meta.id}/object-debug`,
      role: 'article',
      filter: (data): data is { companionTo: Obj.Any } => data.subject === 'debug' && Obj.isObject(data.companionTo),
      component: ({ data }) => <DebugObjectPanel object={data.companionTo} />,
    }),
    createSurface({
      id: `${meta.id}/devtools-overview`,
      role: 'deck-companion--devtools',
      component: () => <DevtoolsOverviewContainer />,
    }),
    createSurface({
      id: `${meta.id}/status`,
      role: 'status',
      component: () => <DebugStatus />,
    }),

    //
    // Devtools
    //

    createSurface({
      id: `${meta.id}/client/config`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Config,
      component: () => <ConfigPanel vaultSelector={false} />,
    }),
    createSurface({
      id: `${meta.id}/client/storage`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Storage,
      component: () => <StoragePanel />,
    }),
    createSurface({
      id: `${meta.id}/client/logs`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Logs,
      component: () => <LoggingPanel />,
    }),
    createSurface({
      id: `${meta.id}/client/diagnostics`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Diagnostics,
      component: () => <DiagnosticsPanel />,
    }),
    createSurface({
      id: `${meta.id}/client/tracing`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Client.Tracing,
      component: () => <TracingPanel />,
    }),
    createSurface({
      id: `${meta.id}/halo/identity`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Identity,
      component: () => <IdentityPanel />,
    }),
    createSurface({
      id: `${meta.id}/halo/devices`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Devices,
      component: () => <DeviceListPanel />,
    }),
    createSurface({
      id: `${meta.id}/halo/keyring`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Keyring,
      component: () => <KeyringPanel />,
    }),
    createSurface({
      id: `${meta.id}/halo/credentials`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Halo.Credentials,
      component: () => {
        const space = useCurrentSpace();
        return <CredentialsPanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/echo/spaces`,
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
      id: `${meta.id}/echo/space`,
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
      id: `${meta.id}/echo/feeds`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Feeds,
      component: () => {
        const space = useCurrentSpace();
        return <FeedsPanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/echo/objects`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Objects,
      component: () => {
        const space = useCurrentSpace();
        return <ObjectsPanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/echo/schema`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Schema,
      component: () => {
        const space = useCurrentSpace();
        return <SchemaPanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/echo/automerge`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Automerge,
      component: () => {
        const space = useCurrentSpace();
        return <AutomergePanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/echo/queues`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Queues,
      component: () => <QueuesPanel />,
    }),
    createSurface({
      id: `${meta.id}/echo/members`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Members,
      component: () => {
        const space = useCurrentSpace();
        return <MembersPanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/echo/metadata`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Echo.Metadata,
      component: () => <MetadataPanel />,
    }),
    createSurface({
      id: `${meta.id}/mesh/signal`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Mesh.Signal,
      component: () => <SignalPanel />,
    }),
    createSurface({
      id: `${meta.id}/mesh/swarm`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Mesh.Swarm,
      component: () => <SwarmPanel />,
    }),
    createSurface({
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
    createSurface({
      id: `${meta.id}/edge/dashboard`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Dashboard,
      component: () => <EdgeDashboardPanel />,
    }),
    createSurface({
      id: `${meta.id}/edge/workflows`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Workflows,
      component: () => {
        const space = useCurrentSpace();
        return <WorkflowPanel space={space} />;
      },
    }),
    createSurface({
      id: `${meta.id}/edge/traces`,
      role: 'article',
      filter: (data): data is any => data.subject === Devtools.Edge.Traces,
      component: () => {
        const space = useCurrentSpace();
        return <InvocationTraceContainer space={space} detailAxis='block' />;
      },
    }),
    createSurface({
      id: `${meta.id}/edge/testing`,
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
              Function.pipe(
                createIntent(ScriptAction.Create, { space }),
                chain(SpaceAction.AddObject, { target: space }),
              ),
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

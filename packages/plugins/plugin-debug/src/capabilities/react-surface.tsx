//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import {
  Capabilities,
  contributes,
  createIntent,
  createSurface,
  LayoutAction,
  useCapability,
  type PluginsContext,
} from '@dxos/app-framework';
import {
  ConfigPanel,
  CredentialsPanel,
  DeviceListPanel,
  DiagnosticsPanel,
  FeedsPanel,
  IdentityPanel,
  KeyringPanel,
  LoggingPanel,
  MembersPanel,
  MetadataPanel,
  NetworkPanel,
  ObjectsPanel,
  SignalPanel,
  SpaceInfoPanel,
  SpaceListPanel,
  StoragePanel,
  SwarmPanel,
  TracingPanel,
  EdgeDashboardPanel,
  AutomergePanel,
  WorkflowPanel,
  QueuesPanel,
  InvocationTracePanel,
} from '@dxos/devtools';
import { SettingsStore } from '@dxos/local-storage';
import { ClientCapabilities } from '@dxos/plugin-client';
import { Graph } from '@dxos/plugin-graph';
import { SpaceAction, CollectionType } from '@dxos/plugin-space/types';
import {
  SpaceState,
  isSpace,
  isEchoObject,
  type ReactiveEchoObject,
  type ReactiveObject,
  type Space,
  parseId,
} from '@dxos/react-client/echo';

import { DebugApp, DebugObjectPanel, DebugSettings, DebugStatus, SpaceGenerator, Wireframe } from '../components';
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

export default (context: PluginsContext) =>
  contributes(Capabilities.ReactSurface, [
    createSurface({
      id: `${DEBUG_PLUGIN}/settings`,
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
        const handleCreateObject = useCallback(
          (objects: ReactiveObject<any>[]) => {
            if (!isSpace(data.subject.space)) {
              return;
            }

            const collection =
              data.subject.space.state.get() === SpaceState.SPACE_READY &&
              data.subject.space.properties[CollectionType.typename]?.target;
            if (!(collection instanceof CollectionType)) {
              return;
            }

            const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
            objects.forEach((object) => {
              void dispatch(createIntent(SpaceAction.AddObject, { target: collection, object }));
            });
          },
          [data.subject.space],
        );

        return <SpaceGenerator space={data.subject.space} onCreateObjects={handleCreateObject} />;
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
      filter: (data): data is { subject: ReactiveEchoObject<any> } => {
        const settings = context
          .requestCapability(Capabilities.SettingsStore)
          .getStore<DebugSettingsProps>(DEBUG_PLUGIN)!.value;
        return isEchoObject(data.subject) && !!settings.wireframe;
      },
      component: ({ data, role }) => (
        <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
      ),
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/complementary`,
      role: 'complementary--debug',
      filter: (data): data is { subject: ReactiveEchoObject<any> } => isEchoObject(data.subject),
      component: ({ data }) => <DebugObjectPanel object={data.subject} />,
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
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
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
        const { dispatchPromise: dispatch } = context.requestCapability(Capabilities.IntentDispatcher);
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
        return <InvocationTracePanel space={space} />;
      },
    }),
  ]);

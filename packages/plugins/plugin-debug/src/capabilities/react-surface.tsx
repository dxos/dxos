//
// Copyright 2025 DXOS.org
//

import React, { useCallback } from 'react';

import { Capabilities, contributes, createIntent, createSurface, type PluginsContext } from '@dxos/app-framework';
import { Devtools } from '@dxos/devtools';
import { SettingsStore } from '@dxos/local-storage';
import { Graph } from '@dxos/plugin-graph';
import { SpaceAction, CollectionType } from '@dxos/plugin-space/types';
import {
  SpaceState,
  isSpace,
  isEchoObject,
  type ReactiveEchoObject,
  type ReactiveObject,
  type Space,
} from '@dxos/react-client/echo';

import {
  DebugApp,
  DebugObjectPanel,
  DebugSettings,
  DebugSpace,
  DebugStatus,
  SpaceGenerator,
  Wireframe,
} from '../components';
import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps } from '../types';

type SpaceDebug = {
  type: string;
  space: Space;
};

type GraphDebug = {
  graph: Graph;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data.type === `${DEBUG_PLUGIN}/space` && isSpace(data.space);
const isGraphDebug = (data: any): data is GraphDebug => data.graph instanceof Graph;

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
      id: `${DEBUG_PLUGIN}/status`,
      role: 'status',
      component: () => <DebugStatus />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/complementary`,
      role: 'complementary--debug',
      filter: (data): data is { subject: ReactiveEchoObject<any> } => isEchoObject(data.subject),
      component: ({ data }) => <DebugObjectPanel object={data.subject} />,
    }),
    createSurface({
      id: `${DEBUG_PLUGIN}/devtools`,
      role: 'article',
      filter: (data): data is any => {
        const settings = context
          .requestCapability(Capabilities.SettingsStore)
          .getStore<DebugSettingsProps>(DEBUG_PLUGIN)!.value;
        return data.subject === 'devtools' && !!settings.devtools;
      },
      component: () => <Devtools />,
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

        const deprecated = false;
        return deprecated ? (
          <DebugSpace space={data.subject.space} onAddObjects={handleCreateObject} />
        ) : (
          <SpaceGenerator space={data.subject.space} onCreateObjects={handleCreateObject} />
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
  ]);

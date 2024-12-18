//
// Copyright 2023 DXOS.org
//

import React, { useCallback, useEffect, useState } from 'react';

import {
  createIntent,
  createSurface,
  definePlugin,
  parseGraphPlugin,
  parseIntentPlugin,
  parseMetadataResolverPlugin,
  parseSettingsPlugin,
  resolvePlugin,
} from '@dxos/app-framework';
import { Timer } from '@dxos/async';
import { Devtools } from '@dxos/devtools';
import { invariant } from '@dxos/invariant';
import { parseClientPlugin } from '@dxos/plugin-client/types';
import { createExtension, Graph, type Node, toSignal } from '@dxos/plugin-graph';
import { memoizeQuery, SpaceAction } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { type Client } from '@dxos/react-client';
import {
  create,
  getTypename,
  isEchoObject,
  isSpace,
  parseId,
  type ReactiveEchoObject,
  type ReactiveObject,
  type Space,
  SpaceState,
} from '@dxos/react-client/echo';

import {
  DebugApp,
  DebugObjectPanel,
  DebugSettings,
  DebugSpace,
  DebugStatus,
  SpaceGenerator,
  Wireframe,
} from './components';
import meta, { DEBUG_PLUGIN } from './meta';
import translations from './translations';
import { DebugContext, type DebugPluginProvides, type DebugSettingsProps, DebugSettingsSchema } from './types';

type SpaceDebug = {
  type: string;
  space: Space;
};

type GraphDebug = {
  graph: Graph;
};

const isSpaceDebug = (data: any): data is SpaceDebug => data.type === `${DEBUG_PLUGIN}/space` && isSpace(data.space);
const isGraphDebug = (data: any): data is GraphDebug => data.graph instanceof Graph;

export const DebugPlugin = definePlugin<DebugPluginProvides>((context) => {
  const settings = create<DebugSettingsProps>({
    debug: true,
    devtools: true,
  });

  return {
    meta,
    ready: async ({ plugins }) => {
      context.init(plugins);
      context.resolvePlugin(parseSettingsPlugin).provides.settingsStore.createStore({
        schema: DebugSettingsSchema,
        prefix: DEBUG_PLUGIN,
        value: settings,
      });

      // TODO(burdon): Remove hacky dependency on global variable.
      // Used to test how composer handles breaking protocol changes.
      const composer = (window as any).composer;
      composer.changeStorageVersionInMetadata = async (version: number) => {
        const { changeStorageVersionInMetadata } = await import('@dxos/echo-pipeline/testing');
        const { createStorageObjects } = await import('@dxos/client-services');
        const client: Client = (window as any).dxos.client;
        const config = client.config;
        await client.destroy();
        const { storage } = createStorageObjects(config.values?.runtime?.client?.storage ?? {});
        await changeStorageVersionInMetadata(storage, version);
        location.pathname = '/';
      };
    },
    unload: async () => {
      context.dispose();
    },
    provides: {
      settings,
      translations,
      complementary: {
        panels: [{ id: 'debug', label: ['open debug panel label', { ns: DEBUG_PLUGIN }], icon: 'ph--bug--regular' }],
      },
      context: ({ children }) => {
        const [timer, setTimer] = useState<Timer>();
        useEffect(() => timer?.state.on((value) => !value && setTimer(undefined)), [timer]);
        useEffect(() => {
          timer?.stop();
        }, []);

        return (
          <DebugContext.Provider
            value={{
              running: !!timer,
              start: (cb, options) => {
                timer?.stop();
                setTimer(new Timer(cb).start(options));
              },
              stop: () => timer?.stop(),
            }}
          >
            {children}
          </DebugContext.Provider>
        );
      },
      graph: {
        builder: (plugins) => {
          const clientPlugin = resolvePlugin(plugins, parseClientPlugin);
          const metadataPlugin = resolvePlugin(plugins, parseMetadataResolverPlugin);
          const graphPlugin = resolvePlugin(plugins, parseGraphPlugin);
          const resolve = metadataPlugin?.provides.metadata.resolver;
          const client = clientPlugin?.provides.client;
          invariant(resolve);
          invariant(client);

          return [
            // Devtools node.
            createExtension({
              id: 'dxos.org/plugin/debug/devtools',
              filter: (node): node is Node<null> => !!settings.devtools && node.id === 'root',
              connector: () => [
                {
                  // TODO(zan): Removed `/` because it breaks deck layout reload. Fix?
                  id: 'dxos.org.plugin.debug.devtools',
                  data: 'devtools',
                  type: 'dxos.org/plugin/debug/devtools',
                  properties: {
                    label: ['devtools label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--hammer--regular',
                  },
                },
              ],
            }),

            // Debug node.
            createExtension({
              id: 'dxos.org/plugin/debug/debug',
              filter: (node): node is Node<null> => !!settings.debug && node.id === 'root',
              connector: () => [
                {
                  id: 'dxos.org/plugin/debug/debug',
                  type: 'dxos.org/plugin/debug/debug',
                  data: { graph: graphPlugin?.provides.graph },
                  properties: {
                    label: ['debug label', { ns: DEBUG_PLUGIN }],
                    icon: 'ph--bug--regular',
                  },
                },
              ],
            }),

            // Space debug nodes.
            createExtension({
              id: 'dxos.org/plugin/debug/spaces',
              filter: (node): node is Node<Space> => !!settings.debug && isSpace(node.data),
              connector: ({ node }) => {
                const space = node.data;
                const state = toSignal(
                  (onChange) => space.state.subscribe(() => onChange()).unsubscribe,
                  () => space.state.get(),
                  space.id,
                );
                if (state !== SpaceState.SPACE_READY) {
                  return;
                }

                // Not adding the debug node until the root collection is available aligns the behaviour of this
                // extension with that of the space plugin adding objects. This ensures that the debug node is added at
                // the same time as objects and prevents order from changing as the nodes are added.
                const collection = space.properties[CollectionType.typename] as CollectionType | undefined;
                if (!collection) {
                  return;
                }

                return [
                  {
                    id: `${space.id}-debug`, // TODO(burdon): Change to slashes consistently.
                    type: 'dxos.org/plugin/debug/space',
                    data: { space, type: 'dxos.org/plugin/debug/space' },
                    properties: {
                      label: ['debug label', { ns: DEBUG_PLUGIN }],
                      icon: 'ph--bug--regular',
                    },
                  },
                ];
              },
            }),

            // Create nodes for debug sidebar.
            createExtension({
              id: `${DEBUG_PLUGIN}/debug-for-subject`,
              resolver: ({ id }) => {
                // TODO(Zan): Find util (or make one).
                if (!id.endsWith('~debug')) {
                  return;
                }

                const type = 'orphan-settings-for-subject';
                const icon = 'ph--bug--regular';

                const [subjectId] = id.split('~');
                const { spaceId, objectId } = parseId(subjectId);
                const spaces = toSignal(
                  (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
                  () => client.spaces.get(),
                );
                const space = spaces?.find(
                  (space) => space.state.get() === SpaceState.SPACE_READY && space.id === spaceId,
                );
                if (!objectId) {
                  // TODO(burdon): Ref SPACE_PLUGIN ns.
                  const label = space
                    ? space.properties.name || ['unnamed space label', { ns: DEBUG_PLUGIN }]
                    : ['unnamed object settings label', { ns: DEBUG_PLUGIN }];

                  // TODO(wittjosiah): Support comments for arbitrary subjects.
                  //   This is to ensure that the comments panel is not stuck on an old object.
                  return {
                    id,
                    type,
                    data: null,
                    properties: {
                      icon,
                      label,
                      showResolvedThreads: false,
                      object: null,
                      space,
                    },
                  };
                }

                const [object] = memoizeQuery(space, { id: objectId });
                if (!object || !subjectId) {
                  return;
                }

                const meta = resolve(getTypename(object) ?? '');
                const label = meta.label?.(object) ||
                  object.name ||
                  meta.placeholder || ['unnamed object settings label', { ns: DEBUG_PLUGIN }];

                return {
                  id,
                  type,
                  data: null,
                  properties: {
                    icon,
                    label,
                    object,
                  },
                };
              },
            }),
          ];
        },
      },
      surface: {
        definitions: () => [
          createSurface({
            id: `${DEBUG_PLUGIN}/settings`,
            role: 'settings',
            filter: (data): data is any => data.subject === DEBUG_PLUGIN,
            component: () => <DebugSettings settings={settings} />,
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
            filter: (data): data is any => data.subject === 'devtools' && !!settings.devtools,
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
                    data.subject.space.properties[CollectionType.typename];
                  if (!(collection instanceof CollectionType)) {
                    return;
                  }

                  objects.forEach((object) => {
                    void context
                      .resolvePlugin(parseIntentPlugin)
                      .provides.intent.dispatchPromise(
                        createIntent(SpaceAction.AddObject, { target: collection, object }),
                      );
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
            disposition: 'hoist',
            filter: (data): data is { subject: ReactiveEchoObject<any> } =>
              isEchoObject(data.subject) && !!settings.wireframe,
            component: ({ data, role }) => (
              <Wireframe label={`${role}:${name}`} object={data.subject} classNames='row-span-2 overflow-hidden' />
            ),
          }),
        ],
      },
    },
  };
});

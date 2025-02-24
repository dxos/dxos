//
// Copyright 2025 DXOS.org
//

import { contributes, Capabilities, type PluginsContext } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { createExtension, toSignal, type Node } from '@dxos/plugin-graph';
import { memoizeQuery } from '@dxos/plugin-space';
import { CollectionType } from '@dxos/plugin-space/types';
import { getTypename, parseId, SpaceState } from '@dxos/react-client/echo';
import { isSpace, type Space } from '@dxos/react-client/echo';

import { DEBUG_PLUGIN } from '../meta';
import { type DebugSettingsProps } from '../types';

export default (context: PluginsContext) => {
  const resolve = (typename: string) =>
    context.requestCapabilities(Capabilities.Metadata).find(({ id }) => id === typename)?.metadata ?? {};

  return contributes(Capabilities.AppGraphBuilder, [
    // Devtools node.
    createExtension({
      id: 'dxos.org/plugin/debug/devtools',
      filter: (node): node is Node<null> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        return !!settings?.devtools && node.id === 'root';
      },
      connector: () => [
        {
          // TODO(zan): Removed `/` because it breaks deck layout reload. Fix?
          id: 'dxos.org.plugin.debug.devtools',
          data: 'devtools',
          type: 'dxos.org/plugin/debug/devtools',
          properties: {
            label: ['devtools label', { ns: DEBUG_PLUGIN }],
            disposition: 'navigation',
            icon: 'ph--hammer--regular',
          },
        },
      ],
    }),

    // Debug node.
    createExtension({
      id: 'dxos.org/plugin/debug/debug',
      filter: (node): node is Node<null> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        return !!settings?.debug && node.id === 'root';
      },
      connector: () => {
        const [graph] = context.requestCapabilities(Capabilities.AppGraph);
        if (!graph) {
          return;
        }

        return [
          {
            id: 'dxos.org/plugin/debug/debug',
            type: 'dxos.org/plugin/debug/debug',
            data: { graph },
            properties: {
              label: ['debug label', { ns: DEBUG_PLUGIN }],
              disposition: 'navigation',
              icon: 'ph--bug--regular',
            },
          },
        ];
      },
    }),

    // Space debug nodes.
    createExtension({
      id: 'dxos.org/plugin/debug/spaces',
      filter: (node): node is Node<Space> => {
        const settings = context
          .requestCapabilities(Capabilities.SettingsStore)[0]
          ?.getStore<DebugSettingsProps>(DEBUG_PLUGIN)?.value;
        return !!settings?.debug && isSpace(node.data);
      },
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
        const collection = space.properties[CollectionType.typename]?.target as CollectionType | undefined;
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
        if (!id.endsWith('~debug')) {
          return;
        }

        const type = 'orphan-settings-for-subject';
        const icon = 'ph--bug--regular';

        const client = context.requestCapability(ClientCapabilities.Client);
        const [subjectId] = id.split('~');
        const { spaceId, objectId } = parseId(subjectId);
        const spaces = toSignal(
          (onChange) => client.spaces.subscribe(() => onChange()).unsubscribe,
          () => client.spaces.get(),
        );
        const space = spaces?.find((space) => space.state.get() === SpaceState.SPACE_READY && space.id === spaceId);
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
            properties: { icon, label, object: null, space },
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
  ]);
};

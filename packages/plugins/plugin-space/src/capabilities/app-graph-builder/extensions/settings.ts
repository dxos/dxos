//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { isPersonalSpace } from '@dxos/app-toolkit';
import { GraphBuilder, Node, NodeMatcher } from '@dxos/plugin-graph';

import { meta } from '#meta';

//
// Extension Factory
//

/** Creates the settings-sections extension for space settings panel. */
export const createSettingsExtensions = Effect.fnUntraced(function* () {
  const extension = yield* GraphBuilder.createExtension({
    id: 'settings-sections',
    match: NodeMatcher.whenNodeType(`${meta.id}.settings`),
    connector: (node) => {
      const personal = node.properties.space && isPersonalSpace(node.properties.space);
      return Effect.succeed([
        Node.make({
          id: 'general',
          type: `${meta.id}.general`,
          data: `${meta.id}.general`,
          properties: {
            label: ['space-settings-properties.label', { ns: meta.id }],
            icon: 'ph--sliders--regular',
            position: 'hoist',
            testId: 'spacePlugin.general',
          },
        }),
        ...(!personal
          ? [
              Node.make({
                id: 'members',
                type: `${meta.id}.members`,
                data: `${meta.id}.members`,
                properties: {
                  label: ['members-panel.label', { ns: meta.id }],
                  icon: 'ph--users--regular',
                  position: 'hoist',
                  testId: 'spacePlugin.members',
                },
              }),
            ]
          : []),
        Node.make({
          id: 'schema',
          type: `${meta.id}.schema`,
          data: `${meta.id}.schema`,
          properties: {
            label: ['space-settings-schema.label', { ns: meta.id }],
            icon: 'ph--shapes--regular',
            testId: 'spacePlugin.schema',
          },
        }),
      ]);
    },
  });
  return [extension];
});

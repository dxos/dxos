//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { GraphBuilder, NodeMatcher } from '@dxos/plugin-graph';
// TODO(wittjosiah): This is currently necessary for type portability.
// eslint-disable-next-line unused-imports/no-unused-imports
import type { Node } from '@dxos/plugin-graph';

import { meta } from '../../../meta';

//
// Extension Factory
//

/** Creates the settings-sections extension for space settings panel. */
export const createSettingsExtensions = Effect.fnUntraced(function* () {
  const extension = yield* GraphBuilder.createExtension({
    id: `${meta.id}/settings-sections`,
    match: NodeMatcher.whenNodeType(`${meta.id}/settings`),
    connector: (node) =>
      Effect.succeed([
        {
          id: `properties-${node.id}`,
          type: `${meta.id}/properties`,
          data: `${meta.id}/properties`,
          properties: {
            label: ['space settings properties label', { ns: meta.id }],
            icon: 'ph--sliders--regular',
            position: 'hoist',
            testId: 'spacePlugin.general',
          },
        },
        {
          id: `members-${node.id}`,
          type: `${meta.id}/members`,
          data: `${meta.id}/members`,
          properties: {
            label: ['members panel label', { ns: meta.id }],
            icon: 'ph--users--regular',
            position: 'hoist',
            testId: 'spacePlugin.members',
          },
        },
        {
          id: `schema-${node.id}`,
          type: `${meta.id}/schema`,
          data: `${meta.id}/schema`,
          properties: {
            label: ['space settings schema label', { ns: meta.id }],
            icon: 'ph--shapes--regular',
            testId: 'spacePlugin.schema',
          },
        },
      ]),
  });
  return [extension];
});

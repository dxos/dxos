//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AppNodeMatcher, isPersonalSpace } from '@dxos/app-toolkit';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';

//
// Extension Factory
//

/**
 * Settings-style children attached directly under each Space node.
 *
 * Both `general` and `members` are pinned to the top via `position: 'hoist'`
 * so they sit above the un-positioned middle band (collections, mailboxes,
 * automations, integrations, etc.). Database and Devtools occupy the
 * `position: 'fallback'` bottom. The previous `schema` panel is gone —
 * type management is surfaced separately and doesn't need an entry here.
 */
export const createSettingsExtensions = Effect.fnUntraced(function* () {
  const extension = yield* GraphBuilder.createExtension({
    id: 'settings-sections',
    match: AppNodeMatcher.whenSpace,
    connector: (space) => {
      const personal = isPersonalSpace(space);
      return Effect.succeed([
        Node.make({
          id: 'general',
          type: `${meta.id}.general`,
          data: `${meta.id}.general`,
          properties: {
            label: ['space-settings-properties.label', { ns: meta.id }],
            icon: 'ph--sliders--regular',
            iconHue: 'indigo',
            position: 'hoist',
            space,
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
                  iconHue: 'lime',
                  position: 'hoist',
                  space,
                  testId: 'spacePlugin.members',
                },
              }),
            ]
          : []),
      ]);
    },
  });
  return [extension];
});

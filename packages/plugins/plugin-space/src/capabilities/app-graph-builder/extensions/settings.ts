//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import { AppNode, AppNodeMatcher, isPersonalSpace } from '@dxos/app-toolkit';
import { type Space, isSpace } from '@dxos/client/echo';
import { GraphBuilder, Node } from '@dxos/plugin-graph';

import { meta } from '#meta';
import { SETTINGS_SECTION_TYPE } from '#types';

//
// Extension Factory
//

/**
 * Settings section attached directly under each Space node, plus its children.
 *
 * The virtual `settings` section is pinned to the top via `position: 'hoist'`
 * so it sits above the un-positioned middle band (collections, mailboxes,
 * automations, integrations, etc.). It groups the panels contributed by this
 * plugin (general, members) and by other plugins (automation, functions).
 */
export const createSettingsExtensions = Effect.fnUntraced(function* () {
  const sectionExtension = yield* GraphBuilder.createExtension({
    id: 'settings-section',
    match: AppNodeMatcher.whenSpace,
    connector: (space) =>
      Effect.succeed([
        AppNode.makeSection({
          id: 'settings',
          type: SETTINGS_SECTION_TYPE,
          label: ['settings-section.label', { ns: meta.id }],
          icon: 'ph--sliders--regular',
          iconHue: 'indigo',
          space,
          position: 'hoist',
          testId: 'spacePlugin.settings',
        }),
      ]),
  });

  const childrenExtension = yield* GraphBuilder.createExtension({
    id: 'settings-sections',
    match: (node) => {
      const space = isSpace(node.properties.space) ? (node.properties.space as Space) : undefined;
      return node.type === SETTINGS_SECTION_TYPE && space ? Option.some(space) : Option.none();
    },
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
                  space,
                  testId: 'spacePlugin.members',
                },
              }),
            ]
          : []),
      ]);
    },
  });

  return [sectionExtension, childrenExtension];
});

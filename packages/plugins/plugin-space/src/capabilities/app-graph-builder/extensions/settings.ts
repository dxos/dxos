//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { AppNode, AppNodeMatcher, AppSpace } from '@dxos/app-toolkit';
import { GraphBuilder, Node } from '@dxos/plugin-graph';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { SETTINGS_SECTION_ID, SETTINGS_SECTION_TYPE } from '#types';

//
// Extension Factory
//

/**
 * Settings section attached directly under each Space node, plus its children.
 *
 * The virtual `settings` section is pinned to the top via `position: Position.first`
 * so it sits above the un-positioned middle band (collections, mailboxes,
 * automations, integrations, etc.). It groups the panels contributed by this
 * plugin (general, members) and by other plugins (automation, functions).
 */
export const createSettingsExtensions = Effect.fnUntraced(function* () {
  const sectionExtension = yield* GraphBuilder.createExtension({
    id: 'settingsSection',
    match: AppNodeMatcher.whenSpace,
    connector: (space) =>
      Effect.succeed([
        AppNode.makeSection({
          id: SETTINGS_SECTION_ID,
          type: SETTINGS_SECTION_TYPE,
          label: ['settings-section.label', { ns: meta.profile.key }],
          icon: 'ph--sliders--regular',
          iconHue: 'emerald',
          space,
          position: Position.first,
          testId: 'spacePlugin.settings',
        }),
      ]),
  });

  // General and Members are separate extensions rather than one so each can be an id-less key (a single
  // id-less key can address only one fixed node — its terminal segment IS the key).
  const generalExtension = yield* GraphBuilder.createExtension({
    id: 'settingsGeneral',
    // The space's general settings panel — "space settings" — addressed id-less as `settings`; the node
    // segment matches the key (`root/<space>/settings/settings`).
    urlKey: 'settings',
    urlKeyHasId: false,
    urlPath: [SETTINGS_SECTION_ID],
    match: AppNodeMatcher.whenSpaceSettings,
    connector: (space) =>
      Effect.succeed([
        Node.make({
          id: 'settings',
          type: `${meta.profile.key}.general`,
          data: `${meta.profile.key}.general`,
          properties: {
            label: ['space-settings-properties.label', { ns: meta.profile.key }],
            icon: 'ph--brackets-curly--regular',
            iconHue: 'emerald',
            space,
            position: Position.first,
            testId: 'spacePlugin.general',
          },
        }),
      ]),
  });

  const membersExtension = yield* GraphBuilder.createExtension({
    id: 'settingsMembers',
    // Fixed panel at `root/<space>/settings/members` (non-personal spaces only); id-less.
    urlKey: 'members',
    urlKeyHasId: false,
    urlPath: [SETTINGS_SECTION_ID],
    match: AppNodeMatcher.whenSpaceSettings,
    connector: (space) =>
      Effect.succeed(
        AppSpace.isPersonalSpace(space)
          ? []
          : [
              Node.make({
                id: 'members',
                type: `${meta.profile.key}.members`,
                data: `${meta.profile.key}.members`,
                properties: {
                  label: ['members-panel.label', { ns: meta.profile.key }],
                  icon: 'ph--users--regular',
                  iconHue: 'emerald',
                  space,
                  position: Position.first,
                  testId: 'spacePlugin.members',
                },
              }),
            ],
      ),
  });

  return [sectionExtension, generalExtension, membersExtension];
});

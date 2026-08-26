//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppNodeMatcher from '@dxos/app-toolkit/AppNodeMatcher';
import { MembershipPolicy } from '@dxos/protocols/proto/dxos/halo/credentials';
import { Position } from '@dxos/util';

import { meta } from '#meta';
import { SpaceSchema } from '#types';

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
  const sectionExtension = yield* AppGraphBuilder.createExtension({
    id: 'settingsSection',
    match: AppNodeMatcher.whenSpace,
    connector: (space) =>
      Effect.succeed([
        AppNode.makeSection({
          id: SpaceSchema.SETTINGS_SECTION_ID,
          type: SpaceSchema.SETTINGS_SECTION_TYPE,
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
  const generalExtension = yield* AppGraphBuilder.createExtension({
    id: 'settingsGeneral',
    url: { key: 'settings', kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
    match: AppNodeMatcher.whenSpaceSettings,
    connector: (space) =>
      Effect.succeed([
        AppGraphNode.make({
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

  const membersExtension = yield* AppGraphBuilder.createExtension({
    id: 'settingsMembers',
    url: { key: 'members', kind: 'singleton', path: [SpaceSchema.SETTINGS_SECTION_ID] },
    match: AppNodeMatcher.whenSpaceSettings,
    // A private space is locked at genesis and can never admit members, so it has nothing to manage.
    connector: (space) =>
      Effect.succeed(
        space.membershipPolicy === MembershipPolicy.LOCKED
          ? []
          : [
              AppGraphNode.make({
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

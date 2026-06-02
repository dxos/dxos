//
// Copyright 2026 DXOS.org
//

import { getPersonalSpace } from '@dxos/app-toolkit';
import { type Client } from '@dxos/client';
import { type Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Filter, Query } from '@dxos/echo';
import { log } from '@dxos/log';
import { NotificationRule } from '@dxos/types';

import { type NotificationsCapabilities } from '#types';

/** Query for the owner's notification rules (live in the personal space). */
export const rulesQuery = () => Query.select(Filter.type(NotificationRule.NotificationRule));

/** The personal space that holds the owner's notification rules. */
export const getRulesSpace = (client: Client): Space | undefined => getPersonalSpace(client);

/** Find the rule created by a given preset, if the preset is currently enabled. */
export const findRuleForPreset = (
  rules: NotificationRule.NotificationRule[],
  presetId: string,
): NotificationRule.NotificationRule | undefined => rules.find((rule) => rule.presetId === presetId);

/** Create the rule for a preset (toggled on). */
export const enablePreset = (
  space: Space,
  preset: NotificationsCapabilities.RulePreset,
): NotificationRule.NotificationRule =>
  space.db.add(NotificationRule.make({ ...preset.create(), presetId: preset.id, enabled: true }));

export const removeRule = (space: Space, rule: NotificationRule.NotificationRule): void => {
  space.db.remove(rule);
};

/**
 * Ask Edge to recompile this account's rule index. Call after creating/removing rules so the
 * server-side index reflects the change (the rules themselves replicate automatically).
 */
export const reindexNotifications = (client: Client): void => {
  void client.edge.http.reindexNotifications(new Context()).catch((error) => log.catch(error));
};

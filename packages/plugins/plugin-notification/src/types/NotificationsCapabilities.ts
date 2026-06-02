//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type { Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';
import { type NotificationRule } from '@dxos/types';

import { meta } from '#meta';

export const Settings = Capability.make<Atom.Writable<import('./Settings').Settings>>(`${meta.id}.capability.settings`);

/**
 * A toggleable notification rule preset contributed by a plugin. When toggled on, a
 * {@link NotificationRule} is created (in the personal space) from `create()`, tagged with the
 * preset `id`; toggling off removes it. Other plugins fulfill this capability to offer presets
 * (e.g. plugin-thread contributes channel-message and thread-comment presets).
 */
export type RulePreset = {
  /** Stable preset id, e.g. `org.dxos.plugin.thread/channel-messages`. */
  id: string;
  /** Translation namespace + keys for the label/description (namespace is the contributing plugin). */
  ns: string;
  titleKey: string;
  descriptionKey?: string;
  /** The rule body to create when toggled on (the preset id is attached automatically). */
  create: () => Omit<Parameters<typeof NotificationRule.make>[0], 'presetId'>;
};

/** Plugins contribute one entry per preset; the notifications settings UI renders a toggle for each. */
export const RulePresets = Capability.make<RulePreset>(`${meta.id}.capability.rule-preset`);

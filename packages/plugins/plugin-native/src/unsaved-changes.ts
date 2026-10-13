//
// Copyright 2026 DXOS.org
//

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';

import { meta } from '#meta';

/** Saves every change that exists only in this page, resolving whether the app can go away without losing one. */
export const saveBeforeLeaving = async (guards: readonly AppCapabilities.UnsavedChanges[]): Promise<boolean> => {
  if (!guards.some((guard) => guard.has())) {
    return true;
  }
  const saved = await Promise.all(guards.map((guard) => guard.save()));
  return saved.every(Boolean);
};

/** The toast raised when leaving would lose changes: the user can stay, or leave anyway with `leave`. */
export const unsavedChangesToast = (leave: () => void): LayoutOperation.Toast => ({
  id: `${meta.profile.key}.unsaved-changes`,
  icon: 'ph--warning--regular',
  title: ['unsaved-changes.label', { ns: meta.profile.key }],
  description: ['unsaved-changes.description', { ns: meta.profile.key }],
  duration: Infinity,
  actionLabel: ['leave-anyway.label', { ns: meta.profile.key }],
  actionAlt: ['leave-anyway.alt', { ns: meta.profile.key }],
  onAction: leave,
});

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import type * as Effect from 'effect/Effect';
import type * as Atom from 'effect/unstable/reactivity/Atom';

import * as Capability from '@dxos/app-framework/Capability';

import { meta } from '#meta';

import type * as SandboxService from './SandboxService.ts';
import type * as SettingsModule from './Settings.ts';

export const Settings = Capability.makeSingleton<Atom.Writable<SettingsModule.Settings>>()(
  `${meta.profile.key}.capability.settings`,
);

/**
 * Starts local sandboxes where this runtime cannot spawn processes itself — the desktop app, whose
 * webview reaches a helper process the shell starts. The effect is memoized by the contributor, so
 * it is safe to run per call.
 */
export type LocalLauncher = {
  readonly backend: Effect.Effect<SandboxService.Backend, SandboxService.SandboxError>;
};

export const LocalLauncher = Capability.makeSingleton<LocalLauncher>()(`${meta.profile.key}.capability.localLauncher`);

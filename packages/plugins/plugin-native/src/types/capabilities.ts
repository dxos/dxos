//
// Copyright 2025 DXOS.org
//

import { type Atom } from '@effect-atom/atom-react';

import { Capability } from '@dxos/app-framework';

import { meta } from '#meta';

import * as Settings from './Settings';
import * as Update from './Update';

export namespace NativeCapabilities {
  export const Settings = Capability.make<Atom.Writable<Settings.Settings>>(`${meta.id}.capability.settings`);
  export const UpdateStatus = Capability.make<Atom.Writable<Update.Status>>(`${meta.id}.capability.update-status`);
  export const CheckForUpdates = Capability.make<() => Promise<void>>(`${meta.id}.capability.check-for-updates`);
  export const InstallUpdate = Capability.make<() => Promise<void>>(`${meta.id}.capability.install-update`);
  export const RelaunchApp = Capability.make<() => Promise<void>>(`${meta.id}.capability.relaunch-app`);
}

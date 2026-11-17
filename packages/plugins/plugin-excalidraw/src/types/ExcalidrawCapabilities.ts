//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import type * as Atom from 'effect/reactivity/Atom';

import { ExcalidrawNamespace } from '../namespace.ts';
import type * as SettingsModule from './Settings.ts';

export const Settings = ExcalidrawNamespace.makeSingleton<Atom.Writable<SettingsModule.Settings>>()('settings');

/** Options for {@link ExcalidrawPlugin}. */
export type ExcalidrawPluginOptions = {
  /** Shows every drawing in Excalidraw's view mode, which writes nothing back. */
  readOnly?: boolean;
};

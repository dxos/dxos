//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

const ClockNamespace = Plugin.namespace('com.example.plugin.clock');

// #region settings
export const Settings = Schema.Struct({
  showSeconds: Schema.optional(Schema.Boolean.annotate({ title: 'Show seconds' })),
}).mapFields(Struct.map(Schema.mutableKey));

export interface Settings extends Schema.Schema.Type<typeof Settings> {}

export const SettingsModule = Capability.makeModule(() =>
  Effect.sync(() => {
    // A writable atom. Real plugins persist it with `KvsStore.make` from `@dxos/effect`.
    const atom = Atom.make<Settings>({ showSeconds: false });
    return Capability.contribute(AppCapabilities.Settings, { prefix: ClockNamespace.key, schema: Settings, atom });
  }),
);
// #endregion

// #region makers
// Each maker declares the capability and its default activation event, so a manifest names only the loader.
export const modules = [
  AppCapability.settings(async () => ({ default: SettingsModule })),
  AppCapability.translations([{ 'en-US': { [ClockNamespace.key]: { 'plugin.name': 'Clock' } } }]),
];
// #endregion

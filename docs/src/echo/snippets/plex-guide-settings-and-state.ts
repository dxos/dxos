//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as KvsStore from '@dxos/effect/KvsStore';

import { StashNamespace } from '../../app-framework-tutorial/src/namespace.ts';

// #region settings
export const Settings = Schema.Struct({
  openInNewTab: Schema.optional(
    Schema.Boolean.annotate({ title: 'Open links in a new tab' }),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

// The app renders a form from the schema and syncs the values to the person's
// other devices.
export const SettingsModule = Capability.makeModule(() =>
  Effect.sync(() =>
    Capability.contribute(AppCapabilities.Settings, {
      prefix: StashNamespace.key,
      schema: Settings,
      atom: KvsStore.make({
        key: StashNamespace.key,
        schema: Settings,
        defaultValue: () => ({ openInNewTab: true }),
      }),
    }),
  ),
);
// #endregion

// #region state
export const State = Schema.Struct({
  lastOpened: Schema.optional(Schema.String),
}).mapFields(Struct.map(Schema.mutableKey));

// Device state is the plugin's own capability, stored under its own key.
export const StateCapability =
  StashNamespace.makeSingleton<ReturnType<typeof makeState>>()('state');

const makeState = () =>
  KvsStore.make({
    key: `${StashNamespace.key}.state`,
    schema: State,
    defaultValue: () => ({}),
  });

export const StateModule = Capability.makeModule(() =>
  Effect.sync(() => Capability.contribute(StateCapability, makeState())),
);
// #endregion

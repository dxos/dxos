//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Schema from 'effect/Schema';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

import { Settings } from '../contracts/index.ts';
import { Service, ServiceHost, State } from '../services/index.ts';

const STORAGE_KEY = 'org.dxos.stories.services.settings';

/** The most settings the store keeps, so the record in local storage cannot grow without bound. */
export const MAX_SETTINGS = 50;

/** The longest value a setting may have, for the same reason. */
export const MAX_VALUE_LENGTH = 200;

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.stories.services.plugin.settings'), name: 'Settings' });

const decodeValues = Schema.decodeUnknownOption(Schema.fromJsonString(Settings.Values));

/** What is stored, or nothing where the stored text is not a record of settings. */
const read = (storage: Settings.Storage): Settings.Values => {
  const stored = storage.getItem(STORAGE_KEY);
  return stored === null ? {} : Option.getOrElse(decodeValues(stored), () => ({}));
};

const refuse = (reason: string) =>
  Effect.fail(new Service.CallError({ context: { key: Settings.Contract.key, member: 'set', reason } }));

const provider = Service.provide(Settings.Contract, {
  needs: [Settings.STORAGE_FEATURE],
  make: ({ feature }) =>
    Effect.sync(() => {
      const storage = feature<Settings.Storage>(Settings.STORAGE_FEATURE);
      const values = State.cell(read(storage));
      const changed = State.emitter<Settings.Setting>();
      const write = (next: Settings.Values) => {
        storage.setItem(STORAGE_KEY, JSON.stringify(next));
        values.set(next);
      };
      const settings: Settings.Client = {
        set: ({ key, value }) =>
          Effect.suspend(() => {
            const current = values.get();
            if (value.length > MAX_VALUE_LENGTH) {
              return refuse('value too long');
            }
            if (!(key in current) && Object.keys(current).length >= MAX_SETTINGS) {
              return refuse('setting limit reached');
            }
            const setting = { key, value };
            write({ ...current, [key]: value });
            changed.emit(setting);
            return Effect.succeed(setting);
          }),
        get: ({ key }) => Effect.sync(() => values.get()[key] ?? null),
        reset: () => Effect.sync(() => write({})),
        values: values.property,
        changed: changed.stream,
      };
      return settings;
    }),
});

/** Provides `Settings` wherever the host has local storage. */
const SettingsPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    id: 'provider',
    provides: [ServiceHost.Provider],
    activatesOn: ActivationEvents.Startup,
    activate: () => Effect.succeed([Capability.contribute(ServiceHost.Provider, provider)]),
  }),
  Plugin.make,
);

export default SettingsPlugin;

//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Service } from '../services/index.ts';

export const Setting = Schema.Struct({ key: Schema.String, value: Schema.String });
export type Setting = Schema.Schema.Type<typeof Setting>;

/** Every setting, by key. */
export const Values = Schema.Record(Schema.String, Schema.String);
export type Values = Schema.Schema.Type<typeof Values>;

/** Settings kept in the device's local storage, so only a host that has it can provide this. */
export const Contract = Service.make('org.dxos.stories.services.settings', {
  version: '0.1.0',
  methods: {
    set: { payload: Setting, success: Setting },
    get: { payload: Schema.Struct({ key: Schema.String }), success: Schema.NullOr(Schema.String) },
    reset: { payload: Schema.Struct({}), success: Schema.Void },
  },
  properties: {
    values: Values,
  },
  events: {
    changed: Setting,
  },
});

export type Client = Service.Client<(typeof Contract)['shape']>;

/** The part of `Storage` the provider uses; the feature a host offers as `localStorage`. */
export type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const STORAGE_FEATURE = 'localStorage';

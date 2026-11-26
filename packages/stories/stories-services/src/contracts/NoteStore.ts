//
// Copyright 2026 DXOS.org
//

// @import-as-namespace

import * as Schema from 'effect/Schema';

import { Service } from '../services/index.ts';

export const Note = Schema.Struct({ id: Schema.String, text: Schema.String });
export type Note = Schema.Schema.Type<typeof Note>;

/** Notes kept in the device's local storage, so only a host that has it can provide this. */
export const Contract = Service.make('org.dxos.stories.services.noteStore', {
  version: '0.1.0',
  methods: {
    put: { payload: Schema.Struct({ text: Schema.String }), success: Note },
    list: { payload: Schema.Struct({}), success: Schema.Array(Note) },
    clear: { payload: Schema.Struct({}), success: Schema.Void },
  },
  properties: {
    count: Schema.Number,
  },
  events: {
    added: Note,
  },
});

export type Client = Service.Client<(typeof Contract)['shape']>;

/** The part of `Storage` the provider uses; the feature a host offers as `localStorage`. */
export type Storage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
};

export const STORAGE_FEATURE = 'localStorage';

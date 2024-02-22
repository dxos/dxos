//
// Copyright 2024 DXOS.org
//

import { type Event } from '@dxos/async';

import { type Filter } from '../query';

export type IndexKind = { kind: 'SCHEMA_MATCH' } | { kind: 'FIELD_MATCH'; field: string } | { kind: 'FULL_TEXT' };

export type IndexingType = Record<string, any>;

export interface Index {
  kind: IndexKind;
  updated: Event;
  removeObject: (id: string) => Promise<void>;
  updateObject: (id: string, object: IndexingType) => Promise<void>;

  find: (filter: Filter) => Promise<string[]>;

  serialize(): Promise<string>;
}

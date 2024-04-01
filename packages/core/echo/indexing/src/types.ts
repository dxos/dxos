//
// Copyright 2024 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Filter } from '@dxos/echo-schema';
import { type IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';

export type ObjectType = Record<string, any>;

export interface Index {
  identifier: string;
  kind: IndexKind;
  updated: Event;

  update: (id: string, object: ObjectType) => Promise<void>;
  remove: (id: string) => Promise<void>;
  find: (filter: Filter) => Promise<{ id: string; rank: number }[]>;

  serialize(): Promise<string>;
}

export type LoadParams = { serialized: string; indexKind: IndexKind; identifier: string };

export interface IndexStaticProps {
  new (kind: IndexKind): Index;
  load(params: LoadParams): Promise<Index>;
}

/* class decorator */
export const staticImplements =
  <T>() =>
  <U extends T>(constructor: U) => {
    return constructor;
  };

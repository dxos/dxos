//
// Copyright 2024 DXOS.org
//

import { type Event } from '@dxos/async';
import { type Heads } from '@dxos/automerge/automerge';
import { type ObjectStructure } from '@dxos/echo-pipeline';
import { type ObjectPointerEncoded } from '@dxos/protocols';
import { type IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';

/**
 * @deprecated To be replaced by a specialized API for each index.
 */
export type IndexQuery = {
  /**
   * null means all Expando objects.
   * undefined means all objects (no filter).
   */
  typename?: string | null;
};

export type ObjectSnapshot = {
  /**
   * Index ID.
   */
  id: ObjectPointerEncoded;
  object: Partial<ObjectStructure>;
  hash: ConcatenatedHeadHashes;
};

export type IdsWithHash = Map<ObjectPointerEncoded, ConcatenatedHeadHashes>;

export interface Index {
  identifier: string;
  kind: IndexKind;
  updated: Event;

  open(): Promise<Index>;
  close(): Promise<Index>;

  /**
   * @returns {Promise<boolean>} true if the object was updated, false otherwise.
   */
  update(id: string, object: Partial<ObjectStructure>): Promise<boolean>;
  remove(id: string): Promise<void>;

  // TODO(dmaretskyi): Remove from interface -- Each index has its own query api.
  find(filter: IndexQuery): Promise<{ id: string; rank: number }[]>;

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

/**
 * Document head hashes concatenated with `|` as separator.
 */
export type ConcatenatedHeadHashes = string;

export const headsCodec = {
  encode: (heads: Heads): ConcatenatedHeadHashes => heads.join('|'),
  decode: (hash: ConcatenatedHeadHashes): Heads => hash.split('|'),
};

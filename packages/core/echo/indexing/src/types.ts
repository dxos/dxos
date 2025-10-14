//
// Copyright 2024 DXOS.org
//

import { type Heads } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { type Event } from '@dxos/async';
import { type ObjectPropPath, type ObjectStructure } from '@dxos/echo-protocol';
import type { ObjectId } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { type ObjectPointerEncoded } from '@dxos/protocols';
import { type IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';

/**
 * Unified query interface for all indexes.
 * @deprecated To be replaced by a specialized API for each index.
 */
// TODO(burdon): Reconcile with proto def.
export type IndexQuery = {
  /**
   * empty array means all objects (no filter).
   */
  typenames: string[];

  // TODO(burdon): Hack to exclude.
  inverted?: boolean;

  /**
   * Graph-based search.
   */
  graph?: {
    /**
     * Relation kind.
     */
    kind: 'inbound-reference' | 'relation-source' | 'relation-target';

    /**
     * anchor objects to search from.
     */
    anchors: ObjectId[];

    /**
     * Filter by property name.
     * Only when kind is 'inbound-reference'.
     */
    property: EscapedPropPath | null;
  };

  text?: {
    query: string;

    kind: 'vector' | 'text';
  };
};

export type ObjectSnapshot = {
  /**
   * Object ID in the indexer format.
   */
  id: ObjectPointerEncoded;
  object: ObjectStructure;
  heads: Heads;
};

export type IdToHeads = Map<ObjectPointerEncoded, Heads>;
export type FindResult = { id: ObjectPointerEncoded; rank: number };

export interface Index {
  identifier: string;
  kind: IndexKind;
  updated: Event;

  open(): Promise<Index>;
  close(): Promise<Index>;

  /**
   * Add an object to the index.
   * @returns {Promise<boolean>} true if the index was updated, false otherwise.
   */
  update(id: ObjectPointerEncoded, object: ObjectStructure): Promise<boolean>;

  /**
   * Remove an object from the index.
   */
  remove(id: ObjectPointerEncoded): Promise<void>;

  // TODO(dmaretskyi): Remove from interface -- Each index has its own query api.
  find(filter: IndexQuery): Promise<FindResult[]>;

  serialize(): Promise<string>;
}

export type LoadParams = { serialized: string; indexKind: IndexKind; identifier: string };

export interface IndexStaticProps {
  new (kind: IndexKind): Index;
  load(params: LoadParams): Promise<Index>;
}

/**
 * Type-only annotation to assert that a class-constructor implements an interface T (with it's static methods).
 */
export const staticImplements =
  <T>() =>
  <U extends T>(constructor: U) => {
    return constructor;
  };

/**
 * Escaped property path within an object.
 *
 * Escaping rules:
 *
 * - '.' -> '\.'
 * - '\' -> '\\'
 * - contact with .
 */
export const EscapedPropPath: Schema.SchemaClass<string, string> & {
  escape: (path: ObjectPropPath) => EscapedPropPath;
  unescape: (path: EscapedPropPath) => ObjectPropPath;
} = class extends Schema.String.annotations({ title: 'EscapedPropPath' }) {
  static escape(path: ObjectPropPath): EscapedPropPath {
    return path.map((p) => p.toString().replaceAll('\\', '\\\\').replaceAll('.', '\\.')).join('.');
  }

  static unescape(path: EscapedPropPath): ObjectPropPath {
    const parts: string[] = [];
    let current = '';

    for (let i = 0; i < path.length; i++) {
      if (path[i] === '\\') {
        invariant(i + 1 < path.length && (path[i + 1] === '.' || path[i + 1] === '\\'), 'Malformed escaping.');
        current = current + path[i + 1];
        i++;
      } else if (path[i] === '.') {
        parts.push(current);
        current = '';
      } else {
        current += path[i];
      }
    }
    parts.push(current);

    return parts;
  }
};
export type EscapedPropPath = Schema.Schema.Type<typeof EscapedPropPath>;

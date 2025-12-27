//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { EXPANDO_TYPENAME } from '@dxos/echo/internal';
import { type ObjectStructure, decodeReference } from '@dxos/echo-protocol';
import { DXN, PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { type ObjectPointerEncoded } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

import {
  type FindResult,
  type Index,
  type IndexQuery,
  type IndexStaticProps,
  type LoadProps,
  staticImplements,
} from '../types';

/**
 * Indexes objects by their typename.
 */
@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexSchema extends Resource implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: IndexKind.Kind.SCHEMA_MATCH };
  public readonly updated = new Event<void>();

  /**
   * Map `typename` -> Set `index id`.
   * @see https://v8.dev/blog/hash-code for performance estimations.
   */
  private readonly _index = new Map<string | null, Set<ObjectPointerEncoded>>();

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: ObjectPointerEncoded, object: Partial<ObjectStructure>): Promise<boolean> {
    if (this._index.get(getTypeFromObject(object))?.has(id)) {
      return false;
    }
    defaultMap(this._index, getTypeFromObject(object), new Set()).add(id);
    return true;
  }

  async remove(id: ObjectPointerEncoded): Promise<void> {
    for (const [_, ids] of this._index.entries()) {
      if (ids.has(id)) {
        ids.delete(id);
        return;
      }
    }
  }

  /**
   * Find all objects that match the given filter.
   * Note that the schema index does not discern schema versions.
   */
  @trace.span({ showInBrowserTimeline: true })
  async find(filter: IndexQuery): Promise<FindResult[]> {
    // TODO(burdon): Handle inversion.
    if (filter.inverted) {
      return Array.from(this._index.entries())
        .filter(([key]) => !filter.typenames.includes(key ?? EXPANDO_TYPENAME) === false)
        .flatMap(([, value]) => Array.from(value))
        .map((id) => ({ id, rank: 0 }));
    }

    if (filter.typenames.length === 0) {
      return Array.from(this._index.values())
        .flatMap((ids) => Array.from(ids))
        .map((id) => ({ id, rank: 0 }));
    }

    const results: FindResult[] = [];
    for (const typename of filter.typenames) {
      if (
        typename === EXPANDO_TYPENAME ||
        (DXN.isDXNString(typename) && DXN.parse(typename).asTypeDXN()?.type === EXPANDO_TYPENAME)
      ) {
        results.push(...Array.from(this._index.get(null) ?? []).map((id) => ({ id, rank: 0 })));
      } else if (DXN.isDXNString(typename)) {
        const dxn = DXN.parse(typename);
        if (dxn.isLocalObjectId()) {
          const objectId = dxn.parts[1];
          results.push(...Array.from(this._index.get(objectId) ?? []).map((id) => ({ id, rank: 0 })));
        } else if (dxn.kind === DXN.kind.TYPE) {
          const typename = dxn.parts[0];
          results.push(...Array.from(this._index.get(typename) ?? []).map((id) => ({ id, rank: 0 })));
        } else {
          log.warn('Unsupported DXN', { dxn });
        }
      } else {
        results.push(...Array.from(this._index.get(typename) ?? []).map((id) => ({ id, rank: 0 })));
      }
    }
    return results.flat();
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    return JSON.stringify({
      index: Array.from(this._index.entries()).map(([type, ids]) => ({
        type,
        ids: Array.from(ids),
      })),
    });
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadProps): Promise<IndexSchema> {
    const index = new IndexSchema();
    const serializedIndex: { type: string | null; ids: string[] }[] = JSON.parse(serialized).index;
    index._identifier = identifier;
    for (const { type, ids } of serializedIndex) {
      index._index.set(type, new Set(ids));
    }
    return index;
  }
}

const getTypeFromObject = (object: Partial<ObjectStructure>): string | null =>
  object.system?.type ? (decodeReference(object.system.type).objectId ?? null) : null;

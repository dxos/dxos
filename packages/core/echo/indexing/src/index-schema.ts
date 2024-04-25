//
// Copyright 2024 DXOS.org
//

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type Filter } from '@dxos/echo-db';
import { type ObjectStructure } from '@dxos/echo-pipeline';
import { PublicKey } from '@dxos/keys';
import { type ObjectPointerEncoded } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';
import { defaultMap } from '@dxos/util';

import { type Index, type IndexStaticProps, type LoadParams, staticImplements } from './types';

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
  async update(id: string, object: Partial<ObjectStructure>) {
    if (this._index.get(getTypeFromObject(object))?.has(id)) {
      return false;
    }
    defaultMap(this._index, getTypeFromObject(object), new Set()).add(id);
    return true;
  }

  async remove(id: string) {
    for (const [_, ids] of this._index.entries()) {
      if (ids.has(id)) {
        ids.delete(id);
        return;
      }
    }
  }

  @trace.span({ showInBrowserTimeline: true })
  async find(filter: Filter) {
    return Array.from(this._index.get(filter.type?.itemId ?? null) ?? []).map((id) => ({ id, rank: 0 }));
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
  static async load({ serialized, identifier }: LoadParams): Promise<IndexSchema> {
    const index = new IndexSchema();
    const serializedIndex: { type: string | null; ids: string[] }[] = JSON.parse(serialized).index;
    index._identifier = identifier;
    for (const { type, ids } of serializedIndex) {
      index._index.set(type, new Set(ids));
    }
    return index;
  }
}

const getTypeFromObject = (object: Partial<ObjectStructure>): string | null => object.system?.type?.itemId ?? null;

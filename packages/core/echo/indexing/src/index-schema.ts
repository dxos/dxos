//
// Copyright 2024 DXOS.org
//
import * as orama from '@orama/orama';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type ObjectStructure } from '@dxos/echo-pipeline';
import { type Filter } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import { type Index, type IndexStaticProps, type LoadParams, staticImplements } from './types';

// Note: By default, Orama search returns 10 results.
const ORAMA_LIMIT = 1_000_000;

// TODO(mykola): Correct schema ref?
type OramaSchemaType = orama.Orama<
  {
    system: {
      type: { itemId: 'string' };
    };
  },
  orama.IIndex<orama.components.index.Index>,
  orama.IDocumentsStore<orama.components.documentsStore.DocumentsStore>
>;

@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexSchema extends Resource implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: IndexKind.Kind.SCHEMA_MATCH };
  public readonly updated = new Event<void>();

  private _orama?: OramaSchemaType = undefined;

  override async _open() {
    this._orama = await orama.create({
      schema: {
        system: {
          type: { itemId: 'string' },
        },
      },
    });
  }

  override async _close() {}

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: string, object: Partial<ObjectStructure>) {
    invariant(this._orama, 'Index is not initialized');
    const entry = await orama.getByID(this._orama, id);
    if (entry && entry.system.type?.itemId === object.system?.type?.itemId) {
      return false;
    }
    await orama.update<any>(this._orama, id, { ...object, id });
    return true;
  }

  async remove(id: string) {
    invariant(this._orama, 'Index is not initialized');
    await orama.remove(this._orama, id);
  }

  // TODO(mykola): Fix Filter type with new Reactive API.
  @trace.span({ showInBrowserTimeline: true })
  async find(filter: Filter) {
    invariant(this._orama, 'Index is not initialized');
    let results: orama.Results<Partial<ObjectStructure>>;
    if (!filter.type) {
      results = await orama.search(this._orama, {
        term: '',
        exact: true,
        threshold: 1,
        limit: ORAMA_LIMIT,
      });
    } else {
      results = await orama.search<OramaSchemaType, Partial<ObjectStructure>>(this._orama, {
        term: filter.type.itemId,
        exact: true,
        threshold: 0,
        limit: ORAMA_LIMIT,
      });
    }
    return results.hits.map((hit) => ({ id: hit.id, rank: hit.score }));
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    invariant(this._orama, 'Index is not initialized');
    return JSON.stringify(await orama.save(this._orama), null, 2);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadParams): Promise<IndexSchema> {
    const deserialized = JSON.parse(serialized);

    const index = new IndexSchema();
    await index.open();
    invariant(index._orama, 'Index is not initialized');
    index._identifier = identifier;
    await orama.load(index._orama, deserialized);
    return index;
  }
}

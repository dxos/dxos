//
// Copyright 2024 DXOS.org
//
import * as orama from '@orama/orama';

import { Event } from '@dxos/async';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';

import {
  type ObjectType,
  type Index,
  type IndexKind,
  staticImplements,
  type IndexStaticProps,
  type LoadParams,
} from './types';
import { type Filter } from '../query';

@staticImplements<IndexStaticProps>()
export class IndexSchema implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: 'SCHEMA_MATCH' };
  public readonly updated = new Event<void>();

  private readonly _orama: Promise<
    orama.Orama<
      {
        schema: string;
      },
      orama.IIndex<orama.components.index.Index>,
      orama.IDocumentsStore<orama.components.documentsStore.DocumentsStore>
    >
  >;

  constructor() {
    this._orama = orama.create({
      schema: {
        schema: 'string',
      },
    });
  }

  get identifier() {
    return this._identifier;
  }

  async removeObject(id: string) {
    await orama.remove(await this._orama, id);
  }

  async updateObject(id: string, object: ObjectType) {
    await orama.update<any>(await this._orama, id, object);
  }

  // TODO(mykola): Fix Filter type with new Reactive API.
  async find(filter: Filter) {
    invariant(filter.type, 'Filter type is required.');
    // TODO(mykola): Use Schema URI.
    const results = await orama.search(await this._orama, { term: filter.type.itemId, exact: true, threshold: 0 });
    const ids = results.hits.map((hit) => hit.id);
    return ids;
  }

  async serialize(): Promise<string> {
    return JSON.stringify(await orama.save(await this._orama), null, 2);
  }

  static async load({ serialized, identifier }: LoadParams): Promise<IndexSchema> {
    const deserialized = JSON.parse(serialized);

    const index = new IndexSchema();
    index._identifier = identifier;
    await orama.load(await index._orama, deserialized);
    return index;
  }
}

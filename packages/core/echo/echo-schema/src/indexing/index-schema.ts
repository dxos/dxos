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
  type IndexStaticProps,
  type LoadParams,
  staticImplements,
} from './types';
import { type Filter } from '../query';

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

@staticImplements<IndexStaticProps>()
export class IndexSchema implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: 'SCHEMA_MATCH' };
  public readonly updated = new Event<void>();

  private readonly _orama: Promise<OramaSchemaType>;

  constructor() {
    this._orama = orama.create({
      schema: {
        system: {
          type: { itemId: 'string' },
        },
      },
    });
  }

  get identifier() {
    return this._identifier;
  }

  async update(id: string, object: ObjectType) {
    await orama.update<any>(await this._orama, id, { ...object, id });
  }

  async remove(id: string) {
    await orama.remove(await this._orama, id);
  }

  // TODO(mykola): Fix Filter type with new Reactive API.
  async find(filter: Filter) {
    invariant(filter.type, 'Filter type is required.');
    // TODO(mykola): Use Schema URI.
    const results = await orama.search<OramaSchemaType, ObjectType>(await this._orama, {
      term: filter.type.itemId,
      exact: true,
      threshold: 0,
    });
    return results.hits.map((hit) => ({ id: hit.id, rank: hit.score }));
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

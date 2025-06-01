//
// Copyright 2024 DXOS.org
//

import * as Orama from '@orama/orama';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type ObjectStructure } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import type { ObjectPointerEncoded } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import {
  type IndexQuery,
  staticImplements,
  type Index,
  type IndexStaticProps,
  type LoadParams,
  type FindResult,
} from '../types';

// Note: By default, Orama search returns 10 results.
// const ORAMA_LIMIT = 1_000_000;

// Type of the Orama instance with the specific schema we're using
type OramaInstanceType = Orama.Orama<
  {
    embedding: 'vector[384]';
  },
  Orama.IIndex<Orama.components.index.Index>,
  Orama.IDocumentsStore<Orama.components.documentsStore.DocumentsStore>
>;

@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexVector extends Resource implements Index {
  private _identifier = PublicKey.random().toString();

  public readonly kind: IndexKind = { kind: IndexKind.Kind.VECTOR };
  public readonly updated = new Event<void>();

  private _orama?: OramaInstanceType = undefined;

  override async _open() {
    this._orama = await Orama.create({
      schema: {
        embedding: 'vector[384]',
      },
    });
  }

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: ObjectPointerEncoded, object: Partial<ObjectStructure>): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async remove(id: ObjectPointerEncoded) {
    invariant(this._orama, 'Index is not initialized');
    await Orama.remove(this._orama, id);
  }

  @trace.span({ showInBrowserTimeline: true })
  async find(filter: IndexQuery): Promise<FindResult[]> {
    throw new Error('Method not implemented.');
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    invariant(this._orama, 'Index is not initialized');
    return JSON.stringify(await Orama.save(this._orama), null, 2);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadParams): Promise<IndexVector> {
    const deserialized = JSON.parse(serialized);

    const index = new IndexVector();
    await index.open();
    invariant(index._orama, 'Index is not initialized');
    index._identifier = identifier;
    await Orama.load(index._orama, deserialized);
    return index;
  }
}

//
// Copyright 2024 DXOS.org
//
import * as orama from '@orama/orama';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type ObjectStructure } from '@dxos/echo-pipeline';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import { type IndexQuery, staticImplements, type Index, type IndexStaticProps, type LoadParams } from './types';

// Note: By default, Orama search returns 10 results.
// const ORAMA_LIMIT = 1_000_000;

type OramaSchemaType = orama.Orama<
  {
    // TODO(mykola): Fix type to support full text search for documents.
  },
  orama.IIndex<orama.components.index.Index>,
  orama.IDocumentsStore<orama.components.documentsStore.DocumentsStore>
>;

@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexText extends Resource implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: IndexKind.Kind.FULL_TEXT };
  public readonly updated = new Event<void>();

  private _orama?: OramaSchemaType = undefined;

  override async _open() {
    this._orama = await orama.create({
      schema: {
        // TODO(mykola): Fix type to support full text search for documents.
      },
    });
  }

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: string, object: Partial<ObjectStructure>): Promise<boolean> {
    throw new Error('Method not implemented.');
  }

  async remove(id: string) {
    invariant(this._orama, 'Index is not initialized');
    await orama.remove(this._orama, id);
  }

  @trace.span({ showInBrowserTimeline: true })
  async find(filter: IndexQuery): Promise<{ id: string; rank: number }[]> {
    throw new Error('Method not implemented.');
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    invariant(this._orama, 'Index is not initialized');
    return JSON.stringify(await orama.save(this._orama), null, 2);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadParams): Promise<IndexText> {
    const deserialized = JSON.parse(serialized);

    const index = new IndexText();
    await index.open();
    invariant(index._orama, 'Index is not initialized');
    index._identifier = identifier;
    await orama.load(index._orama, deserialized);
    return index;
  }
}

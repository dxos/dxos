//
// Copyright 2024 DXOS.org
//

import * as Orama from '@orama/orama';

import { Event } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type ObjectStructure } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import type { ObjectPointerEncoded } from '@dxos/protocols';
import { IndexKind } from '@dxos/protocols/proto/dxos/echo/indexing';
import { trace } from '@dxos/tracing';

import {
  type FindResult,
  type Index,
  type IndexQuery,
  type IndexStaticProps,
  type LoadProps,
  staticImplements,
} from '../types';

import { extractTextBlocks } from './text';

// Note: By default, Orama search returns 10 results.
// const ORAMA_LIMIT = 1_000_000;

type OramaSchemaType = Orama.Orama<
  {
    chunks: 'string[]';
  },
  Orama.IIndex<Orama.components.index.Index>,
  Orama.IDocumentsStore<Orama.components.documentsStore.DocumentsStore>
>;

@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexText extends Resource implements Index {
  private _identifier = PublicKey.random().toString();
  public readonly kind: IndexKind = { kind: IndexKind.Kind.FULL_TEXT };
  public readonly updated = new Event<void>();

  private _orama?: OramaSchemaType = undefined;

  override async _open(): Promise<void> {
    this._orama = await Orama.create({
      schema: {
        chunks: 'string[]',
      },
    });
  }

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: ObjectPointerEncoded, object: Partial<ObjectStructure>): Promise<boolean> {
    const blocks = extractTextBlocks(object);

    invariant(this._orama, 'Index is not initialized');
    await Orama.remove(this._orama, id);
    await Orama.insert(this._orama, {
      id,
      chunks: blocks.map((block) => block.content),
    });
    return true;
  }

  async remove(id: ObjectPointerEncoded): Promise<void> {
    invariant(this._orama, 'Index is not initialized');
    await Orama.remove(this._orama, id);
  }

  @trace.span({ showInBrowserTimeline: true })
  async find(filter: IndexQuery): Promise<FindResult[]> {
    invariant(filter.typenames.length === 0, 'Typenames are not supported');
    invariant(!filter.inverted, 'Inverted search is not supported');
    invariant(!filter.graph, 'Graph search is not supported');
    invariant(typeof filter.text?.query === 'string');
    invariant(filter.text?.kind === 'text');

    invariant(this._orama, 'Index is not initialized');
    const results = await Orama.search(this._orama, {
      mode: 'fulltext',
      term: filter.text.query,

      // TODO(dmaretskyi): Add a way to configure these.
      limit: 10, // Defaults to `10`
      offset: 0, // Defaults to `0`
    });

    log.info('Text search results', { query: filter.text.query, results });

    return results.hits.map((hit) => ({
      id: hit.id,
      rank: hit.score,
    })); // TODO(dmaretskyi): This re-runs all queries even if nothing changed.
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    invariant(this._orama, 'Index is not initialized');
    return JSON.stringify(await Orama.save(this._orama), null, 2);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadProps): Promise<IndexText> {
    const deserialized = JSON.parse(serialized);

    const index = new IndexText();
    await index.open();
    invariant(index._orama, 'Index is not initialized');
    index._identifier = identifier;
    await Orama.load(index._orama, deserialized);
    return index;
  }
}

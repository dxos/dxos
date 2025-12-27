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

import { EmbeddingExtractor } from './embeddings';
import { extractTextBlocks } from './text';

// Note: By default, Orama search returns 10 results.
// const ORAMA_LIMIT = 1_000_000;

// Type of the Orama instance with the specific schema we're using
type OramaInstanceType = Orama.Orama<
  {
    embedding: `vector[${number}]`;
  },
  Orama.IIndex<Orama.components.index.Index>,
  Orama.IDocumentsStore<Orama.components.documentsStore.DocumentsStore>
>;

// Must match the vector dimension of the embedding extractor.
const VECTOR_DIMENSION = 384;

@trace.resource()
@staticImplements<IndexStaticProps>()
export class IndexVector extends Resource implements Index {
  private _identifier = PublicKey.random().toString();

  private _extractor = new EmbeddingExtractor();

  public readonly kind: IndexKind = { kind: IndexKind.Kind.VECTOR };
  public readonly updated = new Event<void>();

  private _orama?: OramaInstanceType = undefined;

  override async _open(): Promise<void> {
    await this._extractor.open();

    this._orama = await Orama.create({
      schema: {
        embedding: `vector[${VECTOR_DIMENSION}]`,
      },
    });
  }

  get identifier() {
    return this._identifier;
  }

  @trace.span({ showInBrowserTimeline: true })
  async update(id: ObjectPointerEncoded, object: Partial<ObjectStructure>): Promise<boolean> {
    const blocks = extractTextBlocks(object);

    log('Extracting embeddings', { id, blocks });
    if (blocks.length === 0) {
      invariant(this._orama, 'Index is not initialized');
      await Orama.remove(this._orama, id);
      return true; // TODO(dmaretskyi): This re-runs all queries even if nothing changed.
    }

    const embeddings = await this._extractor.extract(blocks);
    invariant(embeddings.length === 1, 'Vectors must be combined');
    invariant(embeddings[0].length === VECTOR_DIMENSION, 'Vector dimension mismatch');

    invariant(this._orama, 'Index is not initialized');
    await Orama.remove(this._orama, id);
    await Orama.insert(this._orama, {
      id,
      embedding: embeddings[0],
    });
    return true; // TODO(dmaretskyi): This re-runs all queries even if nothing changed.
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
    invariant(filter.text?.kind === 'vector');

    const embeddings = await this._extractor.extract([{ content: filter.text.query }]);
    invariant(embeddings.length === 1, 'Vectors must be combined');
    invariant(embeddings[0].length === VECTOR_DIMENSION, 'Vector dimension mismatch');

    invariant(this._orama, 'Index is not initialized');
    const results = await Orama.search(this._orama, {
      mode: 'vector',
      vector: {
        value: embeddings[0],
        property: 'embedding',
      },

      // TODO(dmaretskyi): Add a way to configure these.
      similarity: 0.2, // Minimum vector search similarity. Defaults to `0.8`
      includeVectors: true, // Defaults to `false`
      limit: 10, // Defaults to `10`
      offset: 0, // Defaults to `0`
    });

    log.info('Vector search results', { query: filter.text.query, results });

    return results.hits.map((hit) => ({
      id: hit.id,
      rank: hit.score,
    }));
  }

  @trace.span({ showInBrowserTimeline: true })
  async serialize(): Promise<string> {
    invariant(this._orama, 'Index is not initialized');
    return JSON.stringify(await Orama.save(this._orama), null, 2);
  }

  @trace.span({ showInBrowserTimeline: true })
  static async load({ serialized, identifier }: LoadProps): Promise<IndexVector> {
    const deserialized = JSON.parse(serialized);

    const index = new IndexVector();
    await index.open();
    invariant(index._orama, 'Index is not initialized');
    index._identifier = identifier;
    await Orama.load(index._orama, deserialized);
    return index;
  }
}

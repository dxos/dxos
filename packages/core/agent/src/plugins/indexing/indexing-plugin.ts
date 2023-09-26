//
// Copyright 2023 DXOS.org
//

import MiniSearch from 'minisearch';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

import { PublicKey } from '@dxos/client';
import { Space } from '@dxos/client/echo';
import { Context } from '@dxos/context';
import { Query, Subscription } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';
import { ComplexMap } from '@dxos/util';

import { AbstractPlugin } from '../plugin';

export class Indexing extends AbstractPlugin {
  private readonly _ctx = new Context();
  private _index?: MiniSearch;

  /**
   * @internal
   */
  private readonly _spaceIndexes = new ComplexMap<PublicKey, SpaceIndex>(PublicKey.hash);

  private readonly _indexOptions = {
    fields: ['json'],
    idField: 'id',
  };

  private readonly _indexedObjects = new Map<string, IndexDocument>();

  constructor(private readonly _indexPath?: string) {
    super();
    if (this._indexPath && existsSync(this._indexPath)) {
      try {
        const serializedIndex = readFileSync(this._indexPath, { encoding: 'utf8' });
        const { index, options } = JSON.parse(serializedIndex);
        this._index = MiniSearch.loadJS(index, options);
      } catch (error) {
        log.warn('Failed to load index from file:', { error });
      }
    }
  }

  async open(): Promise<void> {
    log.info('Opening indexing plugin...');
    this._client!.spaces.isReady.wait()
      .then(async () => {
        invariant(this._client, 'Client is undefined.');

        const space = this._client.spaces.default;

        const unsubscribe = space.listen('dxos.agent.indexing-plugin', async (message) => {
          log('received message', { message });
          await this._processMessage(message);
        });

        this._ctx.onDispose(unsubscribe);
      })
      .catch((error: Error) => log.catch(error));

    this._indexSpaces().catch((error: Error) => log.catch(error));
  }

  async close(): Promise<void> {
    this._saveIndex();
    void this._ctx.dispose();
  }

  // TODO(mykola): Save index periodically.
  private _saveIndex() {
    if (this._indexPath) {
      invariant(this._index);
      const serializedIndex = JSON.stringify({ index: this._index.toJSON(), options: this._indexOptions });
      log('Saving index to file:', { path: this._indexPath });
      writeFileSync(this._indexPath, serializedIndex, { encoding: 'utf8' });
    }
  }

  private async _indexSpaces() {
    if (!this._index) {
      this._index = new MiniSearch(this._indexOptions);
    }
    const process = async (spaces: Space[]) =>
      Promise.all(
        spaces.map(async (space) => {
          if (!this._spaceIndexes.has(space.key)) {
            this._spaceIndexes.set(space.key, await this._indexSpace(space));
          }
        }),
      );

    invariant(this._client, 'Client is undefined.');
    await this._client.spaces.isReady.wait();
    const sub = this._client.spaces.subscribe(process);
    this._ctx.onDispose(() => sub.unsubscribe());
    await process(this._client.spaces.get());
  }

  private async _indexSpace(space: Space): Promise<SpaceIndex> {
    await space.waitUntilReady();
    const query = space.db.query();
    return {
      space,
      query,
      subscription: query.subscribe((query) => {
        invariant(this._index);
        query.objects.forEach((object) => {
          const document: IndexDocument = {
            id: `${space.key.toHex()}:${object.id}`,
            json: JSON.stringify(object.toJSON()),
          };
          if (this._indexedObjects.has(document.id)) {
            this._index!.remove(this._indexedObjects.get(document.id)!);
          }
          this._index!.add(document);
          this._indexedObjects.set(document.id, document);
        });
      }),
    };
  }

  private async _processMessage(message: GossipMessage) {
    const request: SearchRequest = message.payload;
    if (request.query) {
      const response = this._search(request);
      await this._client!.spaces.default.postMessage('dxos.agent.indexing-plugin', response);
    }
  }

  private _search(request: SearchRequest): SearchResponse {
    invariant(this._index);
    const results = this._index!.search(request.query, request.options);
    return {
      results: results.map((result) => {
        return {
          spaceKey: result.id.split(':')[0],
          objectId: result.id.split(':')[1],
          score: result.score,
          matches: Object.entries(result.match).map(([term, keys]) => ({
            term,
          })),
        };
      }),
    };
  }
}

export type SearchRequest = {
  query: string;
  options?: { fuzzy?: boolean };
};

export type SearchResponse = {
  results: {
    spaceKey: string;
    objectId: string;
    score: number;
    matches: { term: string; positions?: { key: string; start: number; length: number }[] }[];
  }[];
};

type IndexDocument = {
  id: string;
  json: string;
};

type SpaceIndex = {
  space: Space;
  query: Query;
  subscription: Subscription;
};

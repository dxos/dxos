//
// Copyright 2023 DXOS.org
//

import MiniSearch from 'minisearch';
import { existsSync, readFileSync } from 'node:fs';

import { scheduleTask } from '@dxos/async';
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
  private readonly _spaceIndexes = new ComplexMap<PublicKey, SpaceIndex>(PublicKey.hash);

  constructor(private readonly _indexPath: string) {
    super();
    if (existsSync(_indexPath)) {
      try {
        const serializedIndex = readFileSync(_indexPath, { encoding: 'utf8' });
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
          await this._processMessage(message);
        });
        log.info('Listening for indexing messages at default space.', { spaceKey: space.key.toHex() });

        this._ctx.onDispose(unsubscribe);
      })
      .catch((error: Error) => log.catch(error));

    // Index space asynchronously to not block the main thread.
    scheduleTask(this._ctx, async () => {
      this._indexSpaces();
    });
  }

  async close(): Promise<void> {
    void this._ctx.dispose();
  }

  private _indexSpaces() {
    if (!this._index) {
      this._index = new MiniSearch({
        fields: ['json'],
        idField: 'id',
      });
    }
    const process = (spaces: Space[]) => {
      spaces.forEach((space) => {
        if (!this._spaceIndexes.has(space.key)) {
          this._spaceIndexes.set(space.key, this._indexSpace(space));
        }
      });
    };

    invariant(this._client, 'Client is undefined.');
    const sub = this._client.spaces.subscribe(process);
    process(this._client.spaces.get());
    this._ctx.onDispose(() => sub.unsubscribe());
  }

  private _indexSpace(space: Space): SpaceIndex {
    const query = space.db.query();
    return {
      space,
      query,
      subscription: query.subscribe((query) => {
        invariant(this._index);
        query.objects.forEach((object) => {
          const document: IndexDocument = {
            id: `${space.key.toHex()}:${object.id}`,
            json: object.toJSON(),
          };
          this._index!.remove(document);
          this._index!.add(document);
        });
      }),
    };
  }

  private async _processMessage(message: GossipMessage) {
    const request: SearchRequest = message.payload;
    if (request.query) {
      this._search(request);
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
            positions: keys.map((key: string) => ({ key })),
          })),
        };
      }),
    };
  }
}

type SearchRequest = {
  query: string;
  options?: {};
};

type SearchResponse = {
  results: {
    spaceKey: string;
    objectId: string;
    score: number;
    matches: { term: string; positions: { key: string }[] }[];
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

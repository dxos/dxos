//
// Copyright 2023 DXOS.org
//

import { Context } from '@dxos/context';
import { Filter, base } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { QUERY_CHANNEL } from '@dxos/protocols';
import { type QueryRequest, type QueryResponse, type QueryResult } from '@dxos/protocols/proto/dxos/agent/query';
import { type Filter as FilterProto } from '@dxos/protocols/proto/dxos/echo/filter';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

import { Plugin } from '../plugin';

export class QueryPlugin extends Plugin {
  public readonly id = 'dxos.org/agent/plugin/query';
  private _ctx?: Context;

  async open(): Promise<void> {
    log.info('Opening indexing plugin...');

    if (!this._config.enabled) {
      log.info('Search disabled.');
      return;
    }
    this._ctx = new Context();

    invariant(this._pluginCtx);
    this._pluginCtx.client.spaces.isReady.subscribe(async (ready) => {
      if (!ready) {
        return;
      }
      invariant(this._pluginCtx, 'Client is undefined.');

      const space = this._pluginCtx.client.spaces.default;

      const unsubscribe = space.listen(QUERY_CHANNEL, async (message) => {
        log('received message', { message });
        await this._processRequest(message);
      });

      this._ctx?.onDispose(unsubscribe);
    });

    this.statusUpdate.emit();
  }

  async close(): Promise<void> {
    void this._ctx?.dispose();
    this.statusUpdate.emit();
  }

  private async _processRequest(message: GossipMessage) {
    if (message.payload['@type'] !== 'dxos.agent.query.QueryRequest') {
      log('Indexing plugin received unexpected message type.', { type: message.payload['@type'] });
      return;
    }

    await this._initialized.wait();

    const request: QueryRequest = message.payload;
    const response: QueryResponse = { queryId: request.queryId, results: await this._search(request.filter) };
    await this._pluginCtx!.client!.spaces.default.postMessage(QUERY_CHANNEL, {
      '@type': 'dxos.agent.query.QueryResponse',
      ...response,
    });
  }

  private async _search(request: FilterProto): Promise<QueryResult[]> {
    const filter = Filter.fromProto(request);
    const query = this._pluginCtx!.client.spaces.query(filter, filter.options);

    const queryResults = query.results;
    return queryResults.map((result) => ({
      id: result.id,
      spaceKey: result.spaceKey,
      rank: result.match?.rank ?? 0,
      item: result.object![base]._item!.createSnapshot(),
    }));
  }
}

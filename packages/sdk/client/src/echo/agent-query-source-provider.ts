//
// Copyright 2023 DXOS.org
//

import { Event } from '@dxos/async';
import { type Space } from '@dxos/client-protocol';
import { todo } from '@dxos/debug';
import { type Filter, type QueryResult, type QuerySource, type QuerySourceProvider } from '@dxos/echo-db';
import { type EchoReactiveObject } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { QUERY_CHANNEL } from '@dxos/protocols';
import { QueryOptions, type Filter as FilterProto } from '@dxos/protocols/proto/dxos/echo/filter';
import { type EchoObject as EchoObjectProto } from '@dxos/protocols/proto/dxos/echo/object';
import { type QueryRequest, type QueryResponse } from '@dxos/protocols/proto/dxos/echo/query';
import { type GossipMessage } from '@dxos/protocols/proto/dxos/mesh/teleport/gossip';

const ERR_CLOSING = new Error();

export class AgentQuerySourceProvider implements QuerySourceProvider {
  private readonly _responsePromises = new Map<
    string,
    { resolve: (response: QueryResponse) => void; reject: (error: Error) => void }
  >();

  private _unsubscribe?: () => void = undefined;

  /**
   * Constructor.
   * @param _space Space instance that will be used for messaging with the agent through the gossip protocol.
   */
  constructor(private readonly _space: Space) {}

  async open() {
    this._unsubscribe = this._space.listen(QUERY_CHANNEL, (message) => this._handleMessage(message));
  }

  async close() {
    this._unsubscribe?.();
    this._responsePromises.forEach((promise) => promise.reject(ERR_CLOSING));
    this._responsePromises.clear();
  }

  // TODO(burdon): Make async?
  // TODO(burdon): Define return type.
  private _sendRequest(filter: FilterProto) {
    const request: QueryRequest = { queryId: PublicKey.random().toHex(), filter };
    this._space
      .postMessage(QUERY_CHANNEL, {
        '@type': 'dxos.agent.query.QueryRequest',
        ...request,
      })
      .catch((error) => log.catch(error));

    let cancelRequest: () => void;
    return {
      response: new Promise<QueryResponse>((resolve, reject) => {
        invariant(request.queryId);
        this._responsePromises.set(request.queryId, { resolve, reject });
        cancelRequest = () => {
          reject(new Error('Request cancelled.'));
          this._responsePromises.delete(request.queryId!);
        };
      }),
      cancelRequest: () => {
        cancelRequest();
      },
    };
  }

  private _handleMessage(message: GossipMessage) {
    if (message.payload['@type'] !== 'dxos.agent.query.QueryResponse') {
      return;
    }

    const response = message.payload as QueryResponse;
    invariant(response.queryId, 'QueryId is undefined.');
    const responsePromise = this._responsePromises.get(response.queryId);
    if (!responsePromise) {
      log('Request for this response was canceled.', { response });
      return;
    }

    responsePromise.resolve(response);
    this._responsePromises.delete(response.queryId);
  }

  create(): AgentQuerySource {
    return new AgentQuerySource({ sendRequest: this._sendRequest.bind(this) });
  }
}

export class AgentQuerySource implements QuerySource {
  private _results?: QueryResult[];
  private _cancelPreviousRequest?: () => void = undefined;

  public readonly changed = new Event<void>();

  constructor(
    private readonly _params: {
      sendRequest: (filter: FilterProto) => { response: Promise<QueryResponse>; cancelRequest: () => void };
    },
  ) {}

  getResults(): QueryResult[] {
    return this._results ?? [];
  }

  async run(): Promise<QueryResult[]> {
    return this._results ?? [];
  }

  update(filter: Filter): void {
    if (filter.options.dataLocation === undefined || filter.options.dataLocation === QueryOptions.DataLocation.LOCAL) {
      // Disabled by dataLocation filter.
      return;
    }

    this._results = undefined;
    this.changed.emit();

    if (this._cancelPreviousRequest) {
      this._cancelPreviousRequest();
    }

    // TODO(burdon): Make async.
    const startTime = Date.now();
    const { response, cancelRequest } = this._params.sendRequest(filter.toProto());
    this._cancelPreviousRequest = cancelRequest;
    response
      .then((response) => {
        this._results =
          response.results?.map((result) => {
            const objSnapshot = response.objects?.find((obj) => obj.objectId === result.id);
            return {
              id: result.id,
              spaceKey: result.spaceKey,
              spaceId: result.spaceId as SpaceId,
              object: objSnapshot && getEchoObjectFromSnapshot(objSnapshot),
              match: {
                rank: result.rank,
              },
              resolution: {
                source: 'remote',
                time: Date.now() - startTime,
              },
            };
          }) ?? [];

        this.changed.emit();
      })
      .catch((error) => error === ERR_CLOSING || log.catch(error));
  }

  close(): void {
    // No-op.
  }
}

const getEchoObjectFromSnapshot = (objSnapshot: EchoObjectProto): EchoReactiveObject<any> | undefined => {
  invariant(objSnapshot.genesis, 'Genesis is undefined.');
  invariant(objSnapshot.snapshot, 'Genesis model type is undefined.');

  return todo();

  // if (objSnapshot.genesis.modelType === DocumentModel.meta.type) {
  //   const modelSnapshot: ObjectSnapshot = DocumentModel.meta.snapshotCodec!.decode(objSnapshot.snapshot.model.value);
  //   const obj = new TypedObject(undefined, {
  //     type: modelSnapshot.typeRef && Reference.fromValue(modelSnapshot.typeRef),
  //     immutable: true,
  //   });
  //   setStateFromSnapshot(obj, modelSnapshot);
  //   return obj;
  // } else if (objSnapshot.genesis.modelType === TextModel.meta.type) {
  //   return new TextObject();
  // } else {
  //   log.warn('Unknown model type', { type: objSnapshot.genesis.modelType });
  //   return undefined;
  // }
};

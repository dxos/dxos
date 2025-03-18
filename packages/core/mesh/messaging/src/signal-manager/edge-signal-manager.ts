//
// Copyright 2024 DXOS.org
//

import { Event, scheduleMicroTask } from '@dxos/async';
import { Resource } from '@dxos/context';
import { type EdgeConnection, protocol } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { EdgeService } from '@dxos/protocols';
import { buf, bufWkt } from '@dxos/protocols/buf';
import {
  PeerSchema,
  SwarmRequestSchema,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmResponseSchema,
  type Message as EdgeMessage,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';
import { type SwarmResponse } from '@dxos/protocols/proto/dxos/edge/messenger';

import {
  type SignalManager,
  type PeerInfo,
  type Message,
  type JoinRequest,
  type LeaveRequest,
  type QueryRequest,
} from './signal-manager';

export class EdgeSignalManager extends Resource implements SignalManager {
  public swarmState = new Event<SwarmResponse>();
  public onMessage = new Event<Message>();

  /**
   * Swarm key -> { peer: <own state payload>, joinedPeers: <state of swarm> }.
   */
  // TODO(mykola): This class should not contain swarm state joinedPeers. Temporary before network-manager API changes to accept list of peers.
  private readonly _joinedSwarms = new Map<string, { lastState?: Uint8Array }>();

  private readonly _edgeConnection: EdgeConnection;

  constructor({ edgeConnection }: { edgeConnection: EdgeConnection }) {
    super();
    this._edgeConnection = edgeConnection;
  }

  protected override async _open() {
    this._ctx.onDispose(this._edgeConnection.onMessage((message) => this._onMessage(message)));
    this._ctx.onDispose(
      this._edgeConnection.onReconnected(() => {
        scheduleMicroTask(this._ctx, () => this._rejoinAllSwarms());
      }),
    );
  }

  /**
   * Warning: PeerInfo is inferred from edgeConnection.
   */
  async join({ swarmKey, peer }: JoinRequest): Promise<void> {
    if (!this._matchSelfPeerInfo(peer)) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring peer info on join request', {
        peer,
        expected: {
          peerKey: this._edgeConnection.peerKey,
          identityKey: this._edgeConnection.identityKey,
        },
      });

      peer.identityKey = this._edgeConnection.identityKey;
      peer.peerKey = this._edgeConnection.peerKey;
    }

    this._joinedSwarms.set(swarmKey, { lastState: peer.state });
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(swarmKey, peer),
        payload: { action: SwarmRequestAction.JOIN, swarmKeys: [swarmKey] },
      }),
    );
  }

  async leave({ swarmKey, peer }: LeaveRequest): Promise<void> {
    this._joinedSwarms.delete(swarmKey);
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(swarmKey, peer),
        payload: { action: SwarmRequestAction.LEAVE, swarmKeys: [swarmKey] },
      }),
    );
  }

  async query({ swarmKey }: QueryRequest): Promise<void> {
    await this._edgeConnection.send(
      protocol.createMessage(SwarmRequestSchema, {
        serviceId: EdgeService.SWARM,
        source: createMessageSource(swarmKey, {
          peerKey: this._edgeConnection.peerKey,
          identityKey: this._edgeConnection.identityKey,
        }),
        payload: { action: SwarmRequestAction.QUERY, swarmKeys: [swarmKey] },
      }),
    );
  }

  async sendMessage(message: Message): Promise<void> {
    if (!this._matchSelfPeerInfo(message.author)) {
      // NOTE: Could only join swarm with the same peer info as the edge connection.
      log.warn('ignoring author on send request', {
        author: message.author,
        expected: { peerKey: this._edgeConnection.peerKey, identityKey: this._edgeConnection.identityKey },
      });
    }

    await this._edgeConnection.send(
      protocol.createMessage(bufWkt.AnySchema, {
        serviceId: EdgeService.SIGNAL,
        source: message.author,
        target: [message.recipient],
        payload: { typeUrl: message.payload.type_url, value: message.payload.value },
      }),
    );
  }

  async subscribeMessages(peerInfo: PeerInfo): Promise<void> {
    // No-op.
  }

  async unsubscribeMessages(peerInfo: PeerInfo): Promise<void> {
    // No-op.
  }

  private _onMessage(message: EdgeMessage) {
    switch (message.serviceId) {
      case EdgeService.SWARM: {
        this._processSwarmResponse(message);
        break;
      }
      case EdgeService.SIGNAL: {
        this._processMessage(message);
      }
    }
  }

  private _processSwarmResponse(message: EdgeMessage) {
    invariant(protocol.getPayloadType(message) === SwarmResponseSchema.typeName, 'Wrong payload type');
    const payload = protocol.getPayload(message, SwarmResponseSchema);
    this.swarmState.emit(payload);
  }

  private _processMessage(message: EdgeMessage) {
    invariant(protocol.getPayloadType(message) === bufWkt.AnySchema.typeName, 'Wrong payload type');
    const payload = protocol.getPayload(message, bufWkt.AnySchema);
    invariant(message.source, 'source is missing');
    invariant(message.target, 'target is missing');
    invariant(message.target.length === 1, 'target should have exactly one item');

    this.onMessage.emit({
      author: message.source,
      recipient: message.target[0],
      payload: {
        type_url: payload.typeUrl,
        value: payload.value,
      },
    });
  }

  private _matchSelfPeerInfo(peer: PeerInfo) {
    return (
      peer && (peer.peerKey === this._edgeConnection.peerKey || peer.identityKey === this._edgeConnection.identityKey)
    );
  }

  private async _rejoinAllSwarms() {
    log('rejoin swarms', { swarms: Array.from(this._joinedSwarms.keys()) });
    for (const [swarmKey, { lastState }] of this._joinedSwarms.entries()) {
      await this.join({
        swarmKey,
        peer: {
          peerKey: this._edgeConnection.peerKey,
          identityKey: this._edgeConnection.identityKey,
          state: lastState,
        },
      });
    }
  }
}

const createMessageSource = (swarmKey: string, peerInfo: PeerInfo): buf.MessageInitShape<typeof PeerSchema> => {
  return buf.create(PeerSchema, {
    swarmKey,
    ...peerInfo,
  });
};

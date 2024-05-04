//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';
import { HTTPException } from 'hono/http-exception';

import { raise } from '@dxos/debug';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type Env } from './defs';
import {
  decodeMessage,
  encodeMessage,
  type Peer,
  type SignalMessage,
  type SwarmPayload,
  type WebRTCPayload,
} from '../protocol';

// TODO(burdon): How to unit test logic outside of worker?
// TODO(burdon): Alarms (time-based triggers).
// TODO(burdon): Hibernation.
//  https://developers.cloudflare.com/durable-objects/api/websockets/#serializeattachment
// TODO(burdon): Security/encryption info (e2e).
//  https://developers.cloudflare.com/durable-objects/reference/data-security

/**
 * The class provides message routing between peers.
 *
 * The RouterObject is a Durable Object identified by a discovery key used to find a group of connected peers.
 * For example, all devices for a given user will connect to a router using a discovery key that is the hash of the identity key.
 * Peers starting a key exchange will use a temporary discovery key determined by the exchanged invitation object.
 *
 * Implementation:
 * WebSockets are long-lived TCP connections that enable bi-directional, real-time communication between client and server.
 * Cloudflare Durable Objects coordinate Cloudflare Workers to manage WebSocket connections between peers.
 * https://developers.cloudflare.com/workers/runtime-apis/websockets
 *
 * Hibernation allows Durable Objects that do not have events handlers (i.e., not handling peer messages)
 * to be removed from memory without disconnecting the WebSocket.
 * https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server
 * Hibernation supports up to 32,768 connections per Durable Object.
 *
 * Pricing model.
 * https://developers.cloudflare.com/durable-objects/platform/pricing/#example-2
 * Example: $300/mo for 10,000 peers (very actively connected).
 */
export class RouterObject extends DurableObject<Env> {
  /**
   * @param state
   * @param env
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    log.info('RouterObject', { id: state.id.toString().slice(0, 8) });
  }

  public async getDiscoveryKey(): Promise<PublicKey> {
    const discoveryKey = await this.ctx.storage.get<string>('discoveryKey');
    return PublicKey.from(discoveryKey!);
  }

  private getDeviceKey(ws: WebSocket): PublicKey {
    const deviceKey = this.ctx.getTags(ws)[0];
    return PublicKey.from(deviceKey);
  }

  private getSocket(peerKey: PublicKey): WebSocket | undefined {
    const sockets = this.ctx.getWebSockets();
    return sockets.find((socket) => this.getDeviceKey(socket).equals(peerKey));
  }

  /**
   * Accepts incoming HTTP request and upgrades to web socket.
   * Client connect to a socket endpoint associated with their user id.
   */
  // TODO(burdon): Authenticate by requiring signed proof of identity.
  override async fetch(request: Request) {
    const parts = request.url.split('/');
    const deviceKey = PublicKey.from(parts.pop()!);
    const discoveryKey = PublicKey.from(parts.pop()!);
    await this.ctx.storage.put('discoveryKey', discoveryKey.toHex());
    log.info('connecting...', { discoveryKey: discoveryKey.truncate(), deviceKey: deviceKey.truncate() });

    // Creates two ends of a WebSocket connection.
    const [client, server] = Object.values(new WebSocketPair());

    // Bind the socket to the Durable Object but make it hibernatable. Set a tag with the device key.
    // https://developers.cloudflare.com/durable-objects/api/websockets/#state-methods
    this.ctx.acceptWebSocket(server, [deviceKey.toHex()]);

    // TODO(burdon): Auto-respond without waking object.
    // this.ctx.setWebSocketAutoResponse();

    log.info('connected', {
      discoveryKey: discoveryKey.truncate(),
      deviceKey: deviceKey.truncate(),
      peers: this.ctx.getWebSockets().length,
    });

    return new Response(null, {
      status: 101, // Change (upgrade) protocol.
      webSocket: client,
    });
  }

  /**
   * Socket closed (by client or server).
   */
  override async webSocketClose(ws: WebSocket, code: number, reason: string, wasClean: boolean) {
    const deviceKey = this.getDeviceKey(ws);
    log.info('closing...', { deviceKey: deviceKey.truncate(), code, reason, wasClean });

    // Check if client has disconnected.
    // https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1
    if (code !== 1005) {
      ws.close(code, 'closing WebSocket');
    }

    const swarmKeys = await this.getSwarmMap(deviceKey);
    for (const swarmKey of swarmKeys) {
      await this.leaveSwarm(PublicKey.from(swarmKey), deviceKey);
    }

    log.info('closed', { deviceKey: deviceKey.truncate(), sockets: this.ctx.getWebSockets().length });
  }

  /**
   * Socket error.
   */
  override async webSocketError(ws: WebSocket, error: Error) {
    log.catch(error);
  }

  /**
   * Handle message from client.
   */
  override async webSocketMessage(ws: WebSocket, _message: ArrayBuffer | string) {
    const deviceKey = this.getDeviceKey(ws);
    const message = decodeMessage(_message);
    log.info('message', { deviceKey: deviceKey.truncate(), message });
    if (!message) {
      return;
    }

    // https://developers.cloudflare.com/workers/runtime-apis/rpc
    // https://developers.cloudflare.com/workers/runtime-apis/rpc/#structured-clonable-types-and-more
    // https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/#call-rpc-methods

    const { type, data } = message;
    switch (type) {
      case 'ping': {
        ws.send(encodeMessage({ type: 'pong' }));
        break;
      }

      case 'join': {
        const { swarmKey: _swarmKey } = data as SwarmPayload;
        invariant(_swarmKey);
        const swarmKey = PublicKey.from(_swarmKey);
        await this.joinSwarm(swarmKey, deviceKey);
        break;
      }

      case 'leave': {
        const { swarmKey: _swarmKey } = data as SwarmPayload;
        invariant(_swarmKey);
        const swarmKey = PublicKey.from(_swarmKey);
        await this.leaveSwarm(swarmKey, deviceKey);
        break;
      }

      // Send message to other peers.
      default: {
        const { peer } = data as WebRTCPayload;
        if (peer) {
          const router = this.env.ROUTER.get(this.env.ROUTER.idFromName(peer.discoveryKey));
          await router.sendMessage(peer.peerKey, message);
        }
      }
    }
  }

  /**
   * Relay message to peer.
   */
  public async sendMessage(peerKey: string, message: SignalMessage) {
    const socket =
      this.getSocket(PublicKey.from(peerKey)) ?? raise(new HTTPException(404, { message: 'peer not found ' }));
    socket.send(encodeMessage(message));
  }

  /**
   * Notify change of peers.
   */
  public async notifySwarmUpdated(peerKey: string, swarmKey: string, peers: Peer[]) {
    log.info('notifySwarmUpdated', { swarmKey: PublicKey.from(swarmKey).truncate(), peers: peers.length });
    const socket = this.getSocket(PublicKey.from(peerKey));
    if (socket) {
      const deviceKey = this.getDeviceKey(socket);
      const swarms = Array.from(await this.getSwarmMap(deviceKey));
      if (swarms.find((_swarmKey) => _swarmKey === swarmKey)) {
        socket.send(encodeMessage<SwarmPayload>({ type: 'update', data: { swarmKey, peers } }));
      }
    }
  }

  /**
   * Join swarm object.
   */
  private async joinSwarm(swarmKey: PublicKey, deviceKey: PublicKey) {
    log.info('joinSwarm', { swarmKey: swarmKey.truncate(), deviceKey: deviceKey.truncate() });

    const swarms = await this.getSwarmMap(deviceKey);
    swarms.add(swarmKey.toHex());
    await this.setSwarmMap(deviceKey, swarms);

    const discoveryKey = await this.getDiscoveryKey();
    const swarm = this.env.SWARM.get(this.env.SWARM.idFromName(swarmKey.toHex()));
    await swarm.setSwarmKey(swarmKey.toHex()); // Ideally we'd pass this to the constructor.
    await swarm.join({ discoveryKey: discoveryKey.toHex(), peerKey: deviceKey.toHex() });
  }

  /**
   * Leave swarm object.
   */
  private async leaveSwarm(swarmKey: PublicKey, deviceKey: PublicKey) {
    log.info('leaveSwarm', { swarmKey: swarmKey.truncate(), deviceKey: deviceKey.truncate() });

    const swarms = await this.getSwarmMap(deviceKey);
    swarms.delete(swarmKey.toHex());
    await this.setSwarmMap(deviceKey, swarms);

    const discoveryKey = await this.getDiscoveryKey();
    const swarm = this.env.SWARM.get(this.env.SWARM.idFromName(swarmKey.toHex()));
    await swarm.leave({ discoveryKey: discoveryKey.toHex(), peerKey: deviceKey.toHex() });
  }

  /**
   * Gets a set of swarm keys for the given peer.
   */
  private async getSwarmMap(peerKey: PublicKey): Promise<Set<string>> {
    return (await this.ctx.storage.get<Set<string>>(peerKey.toHex())) || new Set();
  }

  /**
   * Sets a set of swarm keys for the given peer.
   */
  private async setSwarmMap(peerKey: PublicKey, swarmKeys: Set<string>) {
    await this.ctx.storage.put(peerKey.toHex(), swarmKeys);
  }
}

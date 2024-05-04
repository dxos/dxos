//
// Copyright 2024 DXOS.org
//

import { DurableObject } from 'cloudflare:workers';

import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';

import { type Env } from './defs';
import { decodeMessage, encodeMessage, type SwarmPayload } from '../protocol';

/**
 * The SocketObject is a Durable Object identified by the user's identity key.
 * All devices connect to the same SocketObject.
 * The class provide a general message routing and subscription mechanism.
 *
 * WebSockets are long-lived TCP connections that enable bi-directional, real-time communication between client and server.
 * Cloudflare Durable Objects coordinate Cloudflare Workers to manage WebSocket connections between peers.
 *
 * https://developers.cloudflare.com/workers/runtime-apis/websockets
 *
 * Hibernation allows Durable Objects that do not have events handlers (i.e., not handling peer messages)
 * to be removed from memory without disconnecting the WebSocket.
 *
 * https://developers.cloudflare.com/durable-objects/examples/websocket-hibernation-server
 * Max 32,768 connections per Durable Object.
 *
 * Pricing model.
 * https://developers.cloudflare.com/durable-objects/platform/pricing/#example-2
 * Example: $300/mo for 10,000 peers (very actively connected).
 */
export class SocketObject extends DurableObject<Env> {
  // TODO(burdon): Alarms (time based trigger).

  // TODO(burdon): Security/encryption.
  // https://developers.cloudflare.com/durable-objects/reference/data-security

  /**
   * @param state
   * @param env
   */
  constructor(state: DurableObjectState, env: Env) {
    super(state, env);
    log.info('SocketObject', { id: state.id.toString().slice(0, 8) });
  }

  // TODO(burdon): Should match name of object id (this.ctx.id.name).
  async getIdentityKey(): Promise<PublicKey> {
    const identityKey = await this.ctx.storage.get<string>('identityKey');
    return PublicKey.from(identityKey!);
  }

  getDeviceKey(ws: WebSocket): PublicKey {
    const deviceKey = this.ctx.getTags(ws)[0];
    return PublicKey.from(deviceKey);
  }

  /**
   * Accepts incoming HTTP request and upgrades to web socket.
   * Client connect to a socket endpoint associated with their user id.
   */
  // TODO(burdon): Authenticate by requiring signed proof of identity.
  override async fetch(request: Request) {
    // TODO(burdon): Get the device key? e.g., /ws/identity/device.
    const parts = request.url.split('/');
    const deviceKey = PublicKey.from(parts.pop()!);
    const identityKey = PublicKey.from(parts.pop()!);
    await this.ctx.storage.put('identityKey', identityKey.toHex());
    log.info('connecting...', { identityKey: identityKey.truncate(), deviceKey: deviceKey.truncate() });

    // Creates two ends of a WebSocket connection.
    const [client, server] = Object.values(new WebSocketPair());

    // Bind the socket to the Durable Object but make it hibernatable. Set a tag with the identityKey.
    // https://developers.cloudflare.com/durable-objects/api/websockets/#state-methods
    this.ctx.acceptWebSocket(server, [deviceKey.toHex()]);

    // TODO(burdon): Auto-respond without waking object.
    // this.ctx.setWebSocketAutoResponse();

    log.info('connected', {
      identityKey: identityKey.truncate(),
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

    // @ts-ignore
    // TODO(burdon): Persist data for hibernation (2k).
    // https://developers.cloudflare.com/durable-objects/api/websockets/#serializeattachment

    const swarmKeys = await this.getSwarmMap(deviceKey);
    for (const swarmKey of swarmKeys) {
      await this.leave(deviceKey, PublicKey.from(swarmKey));
    }

    log.info('closed', { identityKey: deviceKey.truncate(), sockets: this.ctx.getWebSockets().length });
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

    const { type, data } = message;
    switch (type) {
      case 'ping': {
        ws.send(encodeMessage({ type: 'pong' }));
        break;
      }

      // TODO(burdon): Notify other identities.
      //  Swarm objects

      // https://developers.cloudflare.com/workers/runtime-apis/rpc
      // https://developers.cloudflare.com/workers/runtime-apis/rpc/#structured-clonable-types-and-more
      // https://developers.cloudflare.com/durable-objects/best-practices/create-durable-object-stubs-and-send-requests/#call-rpc-methods
      case 'join': {
        const { swarmKey: _swarmKey } = data as SwarmPayload;
        invariant(_swarmKey);
        const swarmKey = PublicKey.from(_swarmKey);
        await this.join(deviceKey, swarmKey);
        break;
      }

      case 'leave': {
        const { swarmKey: _swarmKey } = data as SwarmPayload;
        const swarmKey = PublicKey.from(_swarmKey!);
        invariant(swarmKey);
        await this.leave(deviceKey, swarmKey);
        break;
      }

      // Send message to other peer.
      // TODO(burdon): Implement signaling protocol: advertise, offer, answer.
      // default: {
      //   if (recipient) {
      //     // Send to peer.
      //     const peer = this.ctx.getWebSockets().find((peer) => this.getPeerKey(peer)?.equals(recipient));
      //     peer?.send(encodeMessage({ type, sender, data }));
      //   } else {
      //     // Broadcast to all connected peers.
      //     for (const { ws: peer } of this.getOtherPeers(ws)) {
      //       peer.send(encodeMessage({ type, sender, data }));
      //     }
      //   }
      // }
    }
  }

  /**
   * Notify change of peers.
   */
  public async notify(swarmId: string, peerKeys: string[]) {
    // TODO(burdon): Notify all sockets that have joined this swarm (need to get topic or store).
    const sockets = this.ctx.getWebSockets();
    for (const socket of sockets) {
      const deviceKey = this.getDeviceKey(socket);
      for (const swarmKey of await this.getSwarmMap(deviceKey)) {
        if (this.env.SWARM.idFromName(swarmId).equals(this.env.SWARM.idFromName(swarmKey))) {
          console.log('###', swarmKey.slice(0, 8), peerKeys.length);
        }
      }
    }

    // log.info('###', { swarmKey, name: swarmKey.name, peerKeys: peerKeys.length, sockets: sockets.length });
  }

  /**
   * Join swarm object.
   */
  private async join(deviceKey: PublicKey, swarmKey: PublicKey): Promise<string[]> {
    log.info('join', { deviceKey: deviceKey.truncate(), swarmKey: swarmKey.truncate() });
    const id = this.env.SWARM.idFromName(swarmKey.toHex());
    const swarm = this.env.SWARM.get(id);
    const peerKeys = await swarm.join(deviceKey.toHex(), this.ctx.id.toString());
    const swarms = await this.getSwarmMap(deviceKey);
    swarms.add(swarmKey.toHex());
    await this.setSwarmMap(deviceKey, swarms);
    return peerKeys;
  }

  /**
   * Leave swarm object.
   */
  private async leave(deviceKey: PublicKey, swarmKey: PublicKey) {
    log.info('leave', { deviceKey: deviceKey.truncate(), swarmKey: swarmKey.truncate() });
    const id = this.env.SWARM.idFromName(swarmKey.toHex());
    const swarm = this.env.SWARM.get(id);
    await swarm.leave(deviceKey.toHex(), this.ctx.id.toString());
    const swarms = await this.getSwarmMap(deviceKey);
    swarms.delete(swarmKey.toHex());
    await this.setSwarmMap(deviceKey, swarms);
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
  private async setSwarmMap(peerKey: PublicKey, peers: Set<string>) {
    await this.ctx.storage.put(peerKey.toHex(), peers);
  }

  /**
   * Get other connected peers.
   */
  // getOtherPeers(current: WebSocket): Peer[] {
  //   return this.ctx
  //     .getWebSockets()
  //     .filter((ws) => ws !== current)
  //     .map((ws) => ({ ws, deviceKey: await this.getDeviceKey() }));
  // }

  /**
   * Broadcast peer keys to all connected peers.
   */
  // updatePeers() {
  //   for (const socket of this.ctx.getWebSockets()) {
  //     const peerKeys = this.getOtherPeers(socket).map(({ deviceKey }) => peerKey.toHex());
  //     socket.send(encodeMessage<SwarmPayload>({ type: 'info', data: { peerKeys } }));
  //   }
  // }
}

// type Peer = {
//   ws: WebSocket;
//   deviceKey: PublicKey;
// };

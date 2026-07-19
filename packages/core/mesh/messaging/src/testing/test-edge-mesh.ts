//
// Copyright 2026 DXOS.org
//

import { Event } from '@dxos/async';
import { type Context } from '@dxos/context';
import { type EdgeConnection, type EdgeStatus, protocol } from '@dxos/edge-client';
import { EdgeService } from '@dxos/protocols';
import {
  type Message,
  SwarmRequest_Action as SwarmRequestAction,
  SwarmRequestSchema,
} from '@dxos/protocols/buf/dxos/edge/messenger_pb';

/**
 * In-memory stand-in for the EDGE router + swarm, feature-complete for the messaging paths
 * {@link EdgeSignalManager} exercises: swarm membership (JOIN/LEAVE), tag subscriptions (SUBSCRIBE),
 * point-to-point relay, and tag broadcast fan-out (DX-1125). Multiple {@link TestEdgeConnection}s
 * attach to one mesh, so a broadcast from one client is delivered to the matching subscribers of
 * another — mirroring the real edge without a WebSocket or Durable Object.
 */
export class TestEdgeMesh {
  /** peerKey -> connection. */
  private readonly _connections = new Map<string, TestEdgeConnection>();
  /** swarmKey -> (peerKey -> subscription tags). */
  private readonly _subscriptions = new Map<string, Map<string, string[]>>();
  /** swarmKey -> set of member peerKeys. */
  private readonly _members = new Map<string, Set<string>>();

  createConnection({ peerKey, identityDid }: { peerKey: string; identityDid: string }): TestEdgeConnection {
    const connection = new TestEdgeConnection({ peerKey, identityDid, mesh: this });
    this._connections.set(peerKey, connection);
    return connection;
  }

  removeConnection(peerKey: string): void {
    this._connections.delete(peerKey);
    for (const members of this._members.values()) {
      members.delete(peerKey);
    }
    for (const subs of this._subscriptions.values()) {
      subs.delete(peerKey);
    }
  }

  /** Handle a message sent by a client connection. */
  receive(fromPeerKey: string, message: Message): void {
    switch (message.serviceId) {
      case EdgeService.SWARM:
        this._handleSwarmRequest(fromPeerKey, message);
        break;
      case EdgeService.SIGNAL:
        this._handleSignal(fromPeerKey, message);
        break;
    }
  }

  private _handleSwarmRequest(fromPeerKey: string, message: Message): void {
    const request = protocol.getPayload(message, SwarmRequestSchema);
    const swarmKeys = request.swarmKeys ?? [];
    switch (request.action) {
      case SwarmRequestAction.JOIN:
        for (const swarmKey of swarmKeys) {
          this._memberSet(swarmKey).add(fromPeerKey);
        }
        break;
      case SwarmRequestAction.LEAVE:
        for (const swarmKey of swarmKeys) {
          this._memberSet(swarmKey).delete(fromPeerKey);
          this._subscriptionMap(swarmKey).delete(fromPeerKey);
        }
        break;
      case SwarmRequestAction.SUBSCRIBE:
        // Set/replace this peer's broadcast subscription on each named swarm (DX-1125).
        for (const swarmKey of swarmKeys) {
          this._subscriptionMap(swarmKey).set(fromPeerKey, request.subscribeTags ?? []);
        }
        break;
    }
  }

  private _handleSignal(fromPeerKey: string, message: Message): void {
    const tags = message.tags ?? [];
    const targets = message.target ?? [];

    // Broadcast (DX-1125): tags present, no target -> fan out to matching subscribers on the swarm.
    if (tags.length > 0 && targets.length === 0) {
      const swarmKey = message.source?.swarmKey;
      if (!swarmKey) {
        return;
      }
      for (const [peerKey, subscriptionTags] of this._subscriptionMap(swarmKey)) {
        if (peerKey === fromPeerKey) {
          continue; // No self-delivery.
        }
        if (subscriptionTags.some((tag) => tags.includes(tag))) {
          this._connections.get(peerKey)?.deliver(message);
        }
      }
      return;
    }

    // Point-to-point relay.
    for (const target of targets) {
      if (target.peerKey) {
        this._connections.get(target.peerKey)?.deliver(message);
      }
    }
  }

  private _memberSet(swarmKey: string): Set<string> {
    let set = this._members.get(swarmKey);
    if (!set) {
      set = new Set();
      this._members.set(swarmKey, set);
    }
    return set;
  }

  private _subscriptionMap(swarmKey: string): Map<string, string[]> {
    let map = this._subscriptions.get(swarmKey);
    if (!map) {
      map = new Map();
      this._subscriptions.set(swarmKey, map);
    }
    return map;
  }
}

/**
 * In-memory {@link EdgeConnection} bound to a {@link TestEdgeMesh}. Only the members
 * {@link EdgeSignalManager} uses are functional; the rest are inert stubs.
 */
export class TestEdgeConnection implements EdgeConnection {
  public readonly statusChanged = new Event<EdgeStatus>();
  private readonly _messageListeners = new Set<(message: Message) => void>();
  private readonly _peerKey: string;
  private readonly _identityDid: string;
  private readonly _mesh: TestEdgeMesh;

  constructor({ peerKey, identityDid, mesh }: { peerKey: string; identityDid: string; mesh: TestEdgeMesh }) {
    this._peerKey = peerKey;
    this._identityDid = identityDid;
    this._mesh = mesh;
  }

  get info(): any {
    return { peerKey: this._peerKey, identityDid: this._identityDid };
  }

  get identityDid(): string {
    return this._identityDid;
  }

  get peerKey(): string {
    return this._peerKey;
  }

  get isOpen(): boolean {
    return true;
  }

  get status(): EdgeStatus {
    return {} as EdgeStatus;
  }

  setIdentity(): void {}

  async send(_ctx: Context, message: Message): Promise<void> {
    this._mesh.receive(this._peerKey, message);
  }

  onMessage(listener: (message: Message) => void): () => void {
    this._messageListeners.add(listener);
    return () => this._messageListeners.delete(listener);
  }

  onReconnected(listener: () => void, opts?: { emitCurrentState?: boolean }): () => void {
    if (opts?.emitCurrentState !== false) {
      listener();
    }
    return () => {};
  }

  /** Deliver a message from the mesh to this connection's listeners. */
  deliver(message: Message): void {
    for (const listener of this._messageListeners) {
      listener(message);
    }
  }

  async open(): Promise<void> {}
  async close(): Promise<void> {
    this._mesh.removeConnection(this._peerKey);
  }
}

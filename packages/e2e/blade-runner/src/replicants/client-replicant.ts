//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';
import net from 'node:net';

import { Trigger, waitForCondition } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { type CancellableInvitation, InvitationEncoder } from '@dxos/client-protocol';
import { createEdgeIdentity } from '@dxos/client/edge';
import { LocalClientServices } from '@dxos/client/local';
import { waitForSpace } from '@dxos/client/testing';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { isEdgePeerId } from '@dxos/echo-protocol';
import { authenticateViaChallengeEndpoint, encodeAuthHeader } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { createRtcTransportFactory } from '@dxos/network-manager';
import { Runtime_Client_Storage_SqliteMode } from '@dxos/protocols/buf/dxos/config_pb';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

/**
 * The one document type the stress test manipulates.
 *
 * `docId` is the orchestrator's logical id, so digests key on something the model can name without
 * knowing ECHO's object ids. `counters` is a per-writer register map — each client only ever writes
 * its own key, which is what lets the model predict an exact value under concurrent merges.
 */
export class EdgeStressDocument extends Type.makeObject<EdgeStressDocument>(
  DXN.make('org.dxos.type.bladeRunner.edgeStressDocument', '0.1.0'),
)(
  Schema.Struct({
    docId: Schema.String,
    content: Schema.String,
    counters: Schema.mutable(Schema.Array(Schema.Number)),
  }),
) {}

export type SyncSummary = {
  connected: boolean;
  missingOnLocal: number;
  missingOnRemote: number;
  differentDocuments: number;
  localDocumentCount: number;
};

export type DocumentDigest = {
  tokens: string[];
  counters: number[];
};

export type SpaceDigest = {
  docs: Record<string, DocumentDigest>;
};

const INVITATION_TIMEOUT = 60_000;
const SPACE_READY_TIMEOUT = 60_000;
const DOCUMENT_READY_TIMEOUT = 60_000;

/**
 * One real `@dxos/client` peer, driven entirely over RPC by the `edgeStress` plan.
 *
 * Deliberately dumb: it holds no notion of the model or of what is being tested. Every public
 * method is an RPC verb (blade-runner reflects over the prototype), so arguments and return values
 * must be JSON-serializable, plus the `PublicKey` and `Uint8Array` the RPC codec tags.
 */
export class ClientReplicant {
  #env: ReplicantEnv;
  #client?: Client = undefined;
  #services?: LocalClientServices = undefined;
  #config?: { edgeUrl: string; agents: boolean; partitions: boolean } = undefined;
  /** Held open so late guests can still redeem a multi-use invitation. */
  #hostedInvitations = new Map<string, CancellableInvitation>();
  /**
   * Every connection to EDGE is routed through this loopback TCP proxy so the test can cut the wire
   * without touching the client. Closing the client's own `EdgeConnection` instead does not work:
   * it is built with `deferConnect`, and a reopened one never dials again.
   */
  #proxy?: net.Server = undefined;
  #proxyLive = true;
  #sockets = new Set<net.Socket>();

  constructor(env: ReplicantEnv) {
    this.#env = env;
  }

  //
  // Lifecycle.
  //

  @trace.span()
  async init({
    edgeUrl,
    agents,
    partitions,
  }: {
    edgeUrl: string;
    agents: boolean;
    partitions: boolean;
  }): Promise<void> {
    invariant(!this.#client, 'client already initialized');
    this.#config = { edgeUrl, agents, partitions };
    // The proxy exists only so `goOffline` can cut the wire, and it is a raw byte pipe — it cannot
    // stand in front of an `https:` endpoint, where the client would offer a TLS handshake to a
    // plain socket and send `Host: localhost`. A run without partitions needs no proxy, so dial
    // EDGE directly and keep the deployed environments reachable.
    const proxiedUrl = partitions ? await this.#startProxy(edgeUrl) : edgeUrl;

    // Storage lives under the replicant's own out dir so a destroy/init cycle recovers from disk
    // rather than starting empty — that is what makes `Restart` a crash-recovery test.
    const fullConfig = new Config({
      version: 1,
      runtime: {
        services: { edge: { url: proxiedUrl } },
        client: {
          storage: {
            persistent: true,
            dataRoot: `${this.#env.params.outDir}/storage`,
            // Without FILE the backend silently stays in-memory, so a restarted client comes back
            // empty and `Restart` tests nothing (observed in every local run — RESULTS.md §5).
            sqliteMode: Runtime_Client_Storage_SqliteMode.FILE,
          },
          // Edge-only data replication (D7): signaling carries invitations, no client-to-client data path.
          edgeFeatures: { subductionReplicator: true, feedReplicator: true, signaling: true, agents },
        },
      },
    });

    const services = new LocalClientServices({
      config: fullConfig,
      // FILE mode reads this from the constructor, not from config: `LocalClientServices` never
      // derives it from `data_root`, despite what its own error message suggests.
      sqlitePath: `${this.#env.params.outDir}/storage/index.sqlite`,
      // Mirrors `setupNetworking`'s edge branch: with edge signaling the signal manager is built by
      // the services host, so only the transport factory is supplied here.
      transportFactory: createRtcTransportFactory({ iceServers: fullConfig.get('runtime.services.ice') }),
    });

    const client = new Client({ config: fullConfig, services });
    await client.initialize();
    await client.addTypes([EdgeStressDocument]);

    this.#services = services;
    this.#client = client;
    log.info('client initialized', { replicant: this.#env.params.replicantId });
  }

  @trace.span()
  async destroy(): Promise<void> {
    await this.#client?.destroy();
    this.#client = undefined;
    this.#services = undefined;
    this.#hostedInvitations.clear();
    await this.#stopProxy();
  }

  /**
   * Re-create the client from persistent storage, as a reload would.
   *
   * The link is restored first: `client.destroy()` leaves its swarms over EDGE and throws when the
   * connection is gone, so restarting an offline client is a reconnect-and-restart, matching the
   * model's `online` post-state.
   */
  @trace.span()
  async restart(): Promise<void> {
    invariant(this.#config, 'never initialized');
    const config = this.#config;
    this.#proxyLive = true;
    await this.destroy();
    await this.init(config);
  }

  /**
   * Sever the EDGE link while the process keeps running, so local edits accumulate offline.
   */
  @trace.span()
  async goOffline(): Promise<void> {
    invariant(this.#proxy, 'no offline proxy: this replicant was initialized with partitions off');
    this.#proxyLive = false;
    for (const socket of this.#sockets) {
      socket.destroy();
    }
    this.#sockets.clear();
  }

  @trace.span()
  async goOnline(): Promise<void> {
    // The client's own reconnect loop dials again; nothing else has to be told.
    this.#proxyLive = true;
  }

  async isEdgeConnected(): Promise<boolean> {
    const connection = this.#services?.host?.edgeConnection;
    return connection?.status?.state === 1;
  }

  //
  // Identity and devices.
  //

  @trace.span()
  async createIdentity({ displayName }: { displayName: string }): Promise<{ identityDid: string }> {
    const identity = await this.#getClient().halo.createIdentity({ displayName });
    return { identityDid: identity.did };
  }

  @trace.span()
  async createAgent(): Promise<void> {
    const client = this.#getClient();
    await client.services.services.EdgeAgentService!.createAgent(undefined, { timeout: 30_000 });
  }

  /**
   * Host half of a HALO device invitation; the returned code admits another replicant as a second
   * device of this identity.
   */
  @trace.span()
  async inviteDevice(): Promise<{ invitationCode: string }> {
    const observable = this.#getClient().halo.share({
      authMethod: Invitation.AuthMethod.NONE,
      multiUse: false,
    });
    return { invitationCode: await this.#invitationCode(observable) };
  }

  @trace.span()
  async joinAsDevice({ invitationCode }: { invitationCode: string }): Promise<{ identityDid: string }> {
    const observable = this.#getClient().halo.join(InvitationEncoder.decode(invitationCode));
    await this.#awaitInvitationSuccess(observable);
    const identity = this.#getClient().halo.identity.get();
    invariant(identity, 'no identity after device join');
    return { identityDid: identity.did };
  }

  //
  // Spaces.
  //

  @trace.span()
  async createSpace({ label }: { label: string }): Promise<{ spaceId: string }> {
    const space = await this.#getClient().spaces.create({ name: label });
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    return { spaceId: space.id };
  }

  /**
   * Open a multi-use delegated invitation and keep it alive for the rest of the run.
   *
   * Delegated is the point: the credential is written to the space's control feed and redemption
   * goes through EDGE (`EdgeInvitationHandler`), so any member can admit the guest. An interactive
   * invitation instead "requires both to be online to complete key exchange" (invitation.proto),
   * which is why a guest that restarted could sit until the join timed out.
   */
  @trace.span()
  async shareSpace({ spaceId }: { spaceId: string }): Promise<{ invitationCode: string }> {
    const observable = (await this.#getSpace(spaceId)).share({
      type: Invitation.Type.DELEGATED,
      authMethod: Invitation.AuthMethod.KNOWN_PUBLIC_KEY,
      multiUse: true,
    });
    const invitationCode = await this.#delegatedInvitationCode(observable);
    this.#hostedInvitations.set(spaceId, observable);
    return { invitationCode };
  }

  @trace.span()
  async joinSpace({ invitationCode }: { invitationCode: string }): Promise<{ spaceId: string }> {
    const client = this.#getClient();
    const observable = client.spaces.join(InvitationEncoder.decode(invitationCode));
    const invitation = await this.#awaitInvitationSuccess(observable);
    invariant(invitation.spaceKey, 'no space key on completed invitation');

    const space = await waitForSpace(client, invitation.spaceKey, { timeout: INVITATION_TIMEOUT, ready: true });
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    return { spaceId: space.id };
  }

  /** Whether this device currently holds the space — no waiting, so callers can poll. */
  async hasSpace({ spaceId }: { spaceId: string }): Promise<boolean> {
    return this.#getClient()
      .spaces.get()
      .some((candidate) => candidate.id === spaceId);
  }

  async listSpaces(): Promise<{ spaceIds: string[] }> {
    return {
      spaceIds: this.#getClient()
        .spaces.get()
        .map((space) => space.id),
    };
  }

  //
  // Documents.
  //

  @trace.span()
  async createDocument({
    spaceId,
    docId,
    counterSlots,
  }: {
    spaceId: string;
    docId: string;
    counterSlots: number;
  }): Promise<void> {
    const db = (await this.#getSpace(spaceId)).db;
    db.add(Obj.make(EdgeStressDocument, { docId, content: '', counters: new Array(counterSlots).fill(0) }));
    await db.flush();
  }

  /**
   * Splice a token the orchestrator generated into the text, at a position it chose. All randomness
   * comes from the orchestrator: replicant processes are never seeded.
   */
  @trace.span()
  async editDocumentText({
    spaceId,
    docId,
    token,
    positionRatio,
  }: {
    spaceId: string;
    docId: string;
    token: string;
    positionRatio: number;
  }): Promise<void> {
    const db = (await this.#getSpace(spaceId)).db;
    const doc = await this.#findDocument(spaceId, docId);
    const accessor = Doc.createAccessor(doc, ['content']);
    const position = Math.floor(positionRatio * (doc.content?.length ?? 0));
    accessor.handle.change((raw) => {
      A.splice(raw, accessor.path.slice(), position, 0, token);
    });
    await db.flush();
  }

  @trace.span()
  async editDocumentCounter({
    spaceId,
    docId,
    slot,
  }: {
    spaceId: string;
    docId: string;
    slot: number;
  }): Promise<number> {
    const db = (await this.#getSpace(spaceId)).db;
    const doc = await this.#findDocument(spaceId, docId);
    const next = (doc.counters[slot] ?? 0) + 1;
    // ECHO rejects a direct property write; the counter is a per-writer register, so a
    // read-modify-write inside the callback cannot lose another client's increment.
    Obj.update(doc, (mutable) => {
      mutable.counters[slot] = next;
    });
    await db.flush();
    return next;
  }

  @trace.span()
  async deleteDocument({ spaceId, docId }: { spaceId: string; docId: string }): Promise<void> {
    const db = (await this.#getSpace(spaceId)).db;
    const doc = await this.#findDocument(spaceId, docId);
    db.remove(doc);
    await db.flush();
  }

  async flush({ spaceId }: { spaceId: string }): Promise<void> {
    await (await this.#getSpace(spaceId)).db.flush();
  }

  /**
   * Delete this identity and the spaces it names, through EDGE's self-serve data-management API.
   *
   * Self-serve rather than admin-key: the endpoints authenticate with a verifiable presentation
   * the identity signs, and the replicant is the only party holding those credentials. That is
   * what lets a run against a shared environment clean up after itself with no shared secret.
   *
   * Spaces first — deleting an identity that still owns spaces would orphan them. Nothing here
   * throws: a cleanup failure must never mask the run's own result.
   */
  @trace.span()
  async deleteOwnData({ spaceIds }: { spaceIds: string[] }): Promise<{ accepted: string[]; refused: string[] }> {
    invariant(this.#config, 'never initialized');
    const edgeUrl = this.#config.edgeUrl;
    const client = this.#getClient();
    const identity = client.halo.identity.get();
    invariant(identity, 'no identity to delete');

    const accepted: string[] = [];
    const refused: string[] = [];
    const authentication = await authenticateViaChallengeEndpoint(edgeUrl, createEdgeIdentity(client));
    if (!authentication) {
      log.warn('cleanup: edge issued no auth challenge', { edgeUrl });
      return { accepted, refused: [...spaceIds, identity.did] };
    }
    const authorization = encodeAuthHeader(authentication.presentation);

    const remove = async (path: string, label: string): Promise<void> => {
      try {
        const response = await fetch(new URL(path, edgeUrl), { method: 'DELETE', headers: { authorization } });
        if (response.ok) {
          accepted.push(label);
          return;
        }
        refused.push(label);
        log.warn('cleanup request refused', { path, status: response.status });
      } catch (err) {
        refused.push(label);
        log.warn('cleanup request threw', { path, err });
      }
    };

    for (const spaceId of spaceIds) {
      await remove(`/data/space/${spaceId}`, spaceId);
    }
    await remove(`/data/identity/${identity.did}`, identity.did);
    return { accepted, refused };
  }

  //
  // Observation.
  //

  /**
   * Sync state against the EDGE peer specifically — a space also has client peers, and only edge
   * quiescence means "everything I have reached the hub".
   */
  async getSyncState({ spaceId }: { spaceId: string }): Promise<SyncSummary> {
    const space = await this.#getSpace(spaceId);
    const state = await space.db.getAutomergeSyncState();
    const peer = state.peers?.find((candidate) => isEdgePeerId(candidate.peerId, space.id));
    if (!peer) {
      return {
        connected: false,
        missingOnLocal: -1,
        missingOnRemote: -1,
        differentDocuments: -1,
        localDocumentCount: 0,
      };
    }

    return {
      connected: true,
      missingOnLocal: peer.missingOnLocal,
      missingOnRemote: peer.missingOnRemote,
      differentDocuments: peer.differentDocuments,
      localDocumentCount: peer.localDocumentCount,
    };
  }

  /**
   * The observable state of a space, reduced to exactly what the model can predict.
   */
  async digest({ spaceId }: { spaceId: string }): Promise<SpaceDigest> {
    const objects = await (await this.#getSpace(spaceId)).db.query(Query.select(Filter.type(EdgeStressDocument))).run();
    const docs: Record<string, DocumentDigest> = {};
    for (const object of objects) {
      docs[object.docId] = {
        tokens: (object.content?.match(/⟦[^⟧]*⟧/g) ?? []).sort(),
        counters: [...object.counters],
      };
    }
    return { docs };
  }

  //
  // Internal.
  //

  /**
   * Listen on loopback and pipe each connection to the real EDGE endpoint, so `goOffline` can drop
   * every socket and refuse new ones — indistinguishable from the network going away.
   */
  async #startProxy(edgeUrl: string): Promise<string> {
    const target = new URL(edgeUrl);
    invariant(
      target.protocol === 'http:',
      `partitions need a plain-http EDGE endpoint; the offline proxy cannot front ${target.protocol}//`,
    );
    const port = Number(target.port !== '' ? target.port : 80);
    this.#proxyLive = true;

    const server = net.createServer((downstream) => {
      if (!this.#proxyLive) {
        downstream.destroy();
        return;
      }
      const upstream = net.connect({ host: target.hostname, port });
      const pair = [downstream, upstream];
      const drop = () => {
        for (const socket of pair) {
          this.#sockets.delete(socket);
          socket.destroy();
        }
      };
      for (const socket of pair) {
        this.#sockets.add(socket);
        socket.on('error', drop);
        socket.on('close', drop);
      }
      downstream.pipe(upstream);
      upstream.pipe(downstream);
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const address = server.address();
    invariant(address !== null && typeof address === 'object', 'proxy did not bind');
    this.#proxy = server;
    return `http://127.0.0.1:${address.port}`;
  }

  async #stopProxy(): Promise<void> {
    for (const socket of this.#sockets) {
      socket.destroy();
    }
    this.#sockets.clear();
    const server = this.#proxy;
    this.#proxy = undefined;
    if (server) {
      await new Promise<void>((resolve) => server.close(() => resolve()));
    }
  }

  #getClient(): Client {
    invariant(this.#client, 'client not initialized');
    return this.#client;
  }

  /**
   * A restarted client rehydrates its spaces from storage asynchronously, and a just-joined one
   * receives them over the network, so every accessor waits rather than asserting on a race.
   */
  async #getSpace(spaceId: string) {
    const client = this.#getClient();
    const space = await waitForCondition({
      condition: () => client.spaces.get().find((candidate) => candidate.id === spaceId),
      timeout: SPACE_READY_TIMEOUT,
      interval: 100,
      error: new Error(`space not found: ${spaceId}`),
    });
    // It only resolves on a truthy value, but its return type keeps the predicate's `undefined`.
    invariant(space, `space not found: ${spaceId}`);
    await space.waitUntilReady();
    return space;
  }

  /**
   * Wait for the document to arrive, rather than requiring it to be here already.
   *
   * A peer cannot edit an object another peer created until replication delivers it — issuing the
   * edit the moment the model knows about the document made an ordinary propagation delay look
   * like a missing object. A timeout here is the real finding: replication never delivered.
   */
  async #findDocument(spaceId: string, docId: string): Promise<EdgeStressDocument> {
    const db = (await this.#getSpace(spaceId)).db;
    const doc = await waitForCondition({
      condition: async () => {
        const objects = await db.query(Query.select(Filter.type(EdgeStressDocument))).run();
        return objects.find((object: EdgeStressDocument) => object.docId === docId);
      },
      timeout: DOCUMENT_READY_TIMEOUT,
      interval: 100,
      error: new Error(`document never replicated: ${docId}`),
    });
    invariant(doc, `document never replicated: ${docId}`);
    return doc;
  }

  /**
   * For an interactive invitation (device pairing) the code carries a redeemable swarm key only
   * once it reaches CONNECTING, so it is minted from that state rather than the initial value.
   */
  async #invitationCode(observable: CancellableInvitation): Promise<string> {
    const connecting = new Trigger<Invitation>();
    const subscription = observable.subscribe(
      (invitation: Invitation) => {
        if (invitation.state === Invitation.State.CONNECTING) {
          connecting.wake(invitation);
        }
      },
      (err: Error) => log.warn('invitation error', { err }),
    );

    try {
      const invitation = await connecting.wait({ timeout: INVITATION_TIMEOUT });
      return InvitationEncoder.encode(invitation);
    } finally {
      subscription.unsubscribe();
    }
  }

  /**
   * A delegated invitation is redeemable only once its delegation credential is in the control
   * feed; `InvitationsManager` re-emits the invitation carrying `delegationCredentialId` then.
   */
  async #delegatedInvitationCode(observable: CancellableInvitation): Promise<string> {
    const delegated = new Trigger<Invitation>();
    const subscription = observable.subscribe(
      (invitation: Invitation) => {
        if (invitation.delegationCredentialId) {
          delegated.wake(invitation);
        }
      },
      (err: Error) => log.warn('invitation error', { err }),
    );

    try {
      return InvitationEncoder.encode(await delegated.wait({ timeout: INVITATION_TIMEOUT }));
    } finally {
      subscription.unsubscribe();
    }
  }

  async #awaitInvitationSuccess(observable: CancellableInvitation): Promise<Invitation> {
    const done = new Trigger<Invitation>();
    const failed = new Trigger<Error>();
    const subscription = observable.subscribe(
      (invitation: Invitation) => {
        if (invitation.state === Invitation.State.SUCCESS) {
          done.wake(invitation);
        }
      },
      (err: Error) => failed.wake(err),
    );

    try {
      const invitation = await Promise.race([
        done.wait({ timeout: INVITATION_TIMEOUT }),
        failed.wait({ timeout: INVITATION_TIMEOUT }).then((err) => {
          throw err;
        }),
      ]);
      return invitation;
    } finally {
      subscription.unsubscribe();
    }
  }
}

ReplicantRegistry.instance.register(ClientReplicant);

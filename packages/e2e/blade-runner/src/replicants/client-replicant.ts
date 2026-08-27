//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import * as Schema from 'effect/Schema';

import { Trigger } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { LocalClientServices } from '@dxos/client/local';
import { waitForSpace } from '@dxos/client/testing';
import { type CancellableInvitation, InvitationEncoder } from '@dxos/client-protocol';
import { Context } from '@dxos/context';
import { DXN, Filter, Obj, Query, Type } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { isEdgePeerId } from '@dxos/echo-protocol';
import { invariant } from '@dxos/invariant';
import { type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';
import { createRtcTransportFactory } from '@dxos/network-manager';
import { Invitation } from '@dxos/protocols/proto/dxos/client/services';
import { EdgeReplicationSetting } from '@dxos/protocols/proto/dxos/echo/metadata';
import { trace } from '@dxos/tracing';

import { type ReplicantEnv, ReplicantRegistry } from '../env';

/**
 * The one document type the property test manipulates.
 *
 * `docId` is the orchestrator's logical id, so digests key on something the model can name without
 * knowing ECHO's object ids. `counters` is a per-writer register map — each client only ever writes
 * its own key, which is what lets the model predict an exact value under concurrent merges.
 */
export class PbtDocument extends Type.makeObject<PbtDocument>(
  DXN.make('org.dxos.type.bladeRunner.pbtDocument', '0.1.0'),
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

/**
 * One real `@dxos/client` peer, driven entirely over RPC by the `edgePbt` plan.
 *
 * Deliberately dumb: it holds no notion of the model or of what is being tested. Every public
 * method is an RPC verb (blade-runner reflects over the prototype), so arguments and return values
 * must be JSON-serializable — no `PublicKey`, no `Uint8Array`.
 */
export class ClientReplicant {
  #env: ReplicantEnv;
  #client?: Client = undefined;
  #services?: LocalClientServices = undefined;
  #config?: { edgeUrl: string; agents: boolean } = undefined;
  /** Held open so late guests can still redeem a multi-use invitation. */
  #hostedInvitations = new Map<string, CancellableInvitation>();

  constructor(env: ReplicantEnv) {
    this.#env = env;
  }

  //
  // Lifecycle.
  //

  @trace.span()
  async init({ edgeUrl, agents }: { edgeUrl: string; agents: boolean }): Promise<void> {
    invariant(!this.#client, 'client already initialized');
    this.#config = { edgeUrl, agents };

    // Storage lives under the replicant's own out dir so a destroy/init cycle recovers from disk
    // rather than starting empty — that is what makes `Restart` a crash-recovery test.
    const fullConfig = new Config({
      version: 1,
      runtime: {
        services: { edge: { url: edgeUrl } },
        client: {
          storage: { persistent: true, dataRoot: `${this.#env.params.outDir}/storage` },
          // Edge-only data replication (D7): signaling carries invitations, no client-to-client data path.
          edgeFeatures: { subductionReplicator: true, feedReplicator: true, signaling: true, agents },
        },
      },
    });

    const services = new LocalClientServices({
      config: fullConfig,
      // Mirrors `setupNetworking`'s edge branch: with edge signaling the signal manager is built by
      // the services host, so only the transport factory is supplied here.
      transportFactory: createRtcTransportFactory({ iceServers: fullConfig.get('runtime.services.ice') }),
    });

    const client = new Client({ config: fullConfig, services });
    await client.initialize();
    await client.addTypes([PbtDocument]);

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
  }

  /**
   * Re-create the client from persistent storage, as a crash/reload would.
   */
  @trace.span()
  async restart(): Promise<void> {
    invariant(this.#config, 'never initialized');
    const config = this.#config;
    await this.destroy();
    await this.init(config);
  }

  /**
   * Sever the EDGE link while the process keeps running, so local edits accumulate offline.
   */
  @trace.span()
  async goOffline(): Promise<void> {
    await this.#edgeConnection().close();
  }

  @trace.span()
  async goOnline(): Promise<void> {
    await this.#edgeConnection().open(new Context());
  }

  async isEdgeConnected(): Promise<boolean> {
    return this.#edgeConnection().isOpen;
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
   * Open a multi-use invitation and keep it alive for the rest of the run, so an identity that was
   * offline when the space appeared can still be admitted later.
   */
  @trace.span()
  async shareSpace({ spaceId }: { spaceId: string }): Promise<{ invitationCode: string }> {
    const observable = this.#getSpace(spaceId).share({
      authMethod: Invitation.AuthMethod.NONE,
      multiUse: true,
    });
    const invitationCode = await this.#invitationCode(observable);
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

  async listSpaces(): Promise<{ spaceIds: string[] }> {
    return { spaceIds: this.#getClient().spaces.get().map((space) => space.id) };
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
    const db = this.#getSpace(spaceId).db;
    db.add(Obj.make(PbtDocument, { docId, content: '', counters: new Array(counterSlots).fill(0) }));
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
    const db = this.#getSpace(spaceId).db;
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
    const db = this.#getSpace(spaceId).db;
    const doc = await this.#findDocument(spaceId, docId);
    const next = (doc.counters[slot] ?? 0) + 1;
    doc.counters[slot] = next;
    await db.flush();
    return next;
  }

  @trace.span()
  async deleteDocument({ spaceId, docId }: { spaceId: string; docId: string }): Promise<void> {
    const db = this.#getSpace(spaceId).db;
    const doc = await this.#findDocument(spaceId, docId);
    db.remove(doc);
    await db.flush();
  }

  async flush({ spaceId }: { spaceId: string }): Promise<void> {
    await this.#getSpace(spaceId).db.flush();
  }

  //
  // Observation.
  //

  /**
   * Sync state against the EDGE peer specifically — a space also has client peers, and only edge
   * quiescence means "everything I have reached the hub".
   */
  async getSyncState({ spaceId }: { spaceId: string }): Promise<SyncSummary> {
    const space = this.#getSpace(spaceId);
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
    const objects = await this.#getSpace(spaceId).db.query(Query.select(Filter.type(PbtDocument))).run();
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

  #getClient(): Client {
    invariant(this.#client, 'client not initialized');
    return this.#client;
  }

  #edgeConnection() {
    const connection = this.#services?.host?.edgeConnection;
    invariant(connection, 'no edge connection');
    return connection;
  }

  #getSpace(spaceId: string) {
    const space = this.#getClient()
      .spaces.get()
      .find((candidate) => candidate.id === spaceId);
    invariant(space, `space not found: ${spaceId}`);
    return space;
  }

  async #findDocument(spaceId: string, docId: string): Promise<PbtDocument> {
    const objects = await this.#getSpace(spaceId)
      .db.query(Query.select(Filter.type(PbtDocument)))
      .run();
    const doc = objects.find((object: PbtDocument) => object.docId === docId);
    invariant(doc, `document not found: ${docId}`);
    return doc;
  }

  /**
   * The invitation only carries a redeemable swarm key once it reaches CONNECTING, so the code is
   * minted from that state rather than from the initial value.
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

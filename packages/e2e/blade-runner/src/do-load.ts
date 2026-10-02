//
// Copyright 2026 DXOS.org
//

// Load test for EDGE's SubductionAutomergeReplicator DO: one space, one very large many-op document,
// then escalating bursts of document creation, with EDGE sync progress sampled after each burst.
//
// Usage (from packages/e2e/blade-runner):
//   node --import tsx src/do-load.ts <phase> [--key value ...]
// Phases: setup | bigdoc | burst | join | status. State lives in $OUT/state.json, client storage in
// $OUT/<client>/storage, so phases run as separate processes against the same identity.

import { next as A } from '@automerge/automerge';
import { create } from '@bufbuild/protobuf';
import { randomBytes } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

import { sleep, waitForCondition } from '@dxos/async';
import { Client, Config } from '@dxos/client';
import { InvitationEncoder } from '@dxos/client-protocol';
import { LocalClientServices } from '@dxos/client/local';
import { Context } from '@dxos/context';
import { Filter, Obj, Query } from '@dxos/echo';
import { Doc } from '@dxos/echo-doc';
import { isEdgePeerId } from '@dxos/echo-protocol';
import { HubHttpClient } from '@dxos/edge-client';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { requirePublicKey } from '@dxos/protocols/buf';
import {
  Invitation_AuthMethod,
  Invitation_State,
  Invitation_Type,
} from '@dxos/protocols/buf/dxos/client/invitation_pb';
import { Runtime_Client_Storage_SqliteMode } from '@dxos/protocols/buf/dxos/config_pb';
import { EdgeReplicationSetting } from '@dxos/protocols/buf/dxos/echo/metadata_pb';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';

import { EdgeStressDocument } from './replicants/client-replicant.ts';

const EDGE_URL = process.env.EDGE_URL ?? 'https://dev.dxos.network';
const OUT = process.env.OUT ?? path.resolve('out/do-load');
const STATE_FILE = path.join(OUT, 'state.json');

type State = {
  spaceId?: string;
  invitationCode?: string;
  bigDocId?: string;
  bigDocChanges?: number;
  documents?: number;
  bursts?: { at: string; size: number; createMs: number; syncedMs: number | null; total: number }[];
};

const readState = (): State => (fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {});
const writeState = (state: State) => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2));

const args = Object.fromEntries(
  process.argv
    .slice(3)
    .reduce<string[][]>(
      (pairs, arg, index, all) => (arg.startsWith('--') ? [...pairs, [arg.slice(2), all[index + 1]]] : pairs),
      [],
    ),
);
const num = (key: string, fallback: number) => (args[key] !== undefined ? Number(args[key]) : fallback);

const stamp = () => new Date().toISOString();
const report = (event: string, data: Record<string, unknown> = {}) => {
  const line = JSON.stringify({ at: stamp(), event, ...data });
  console.log(line);
  fs.appendFileSync(path.join(OUT, 'events.ndjson'), line + '\n');
};

const openClient = async (name: string): Promise<Client> => {
  const dataRoot = path.join(OUT, name, 'storage');
  fs.mkdirSync(dataRoot, { recursive: true });
  const config = new Config({
    version: 1,
    runtime: {
      services: { edge: { url: EDGE_URL } },
      client: {
        storage: { persistent: true, dataRoot, sqliteMode: Runtime_Client_Storage_SqliteMode.FILE },
        disableP2pReplication: true,
        edgeFeatures: { subductionReplicator: true, feedReplicator: true, signaling: true, agents: false },
      },
    },
  });
  const services = new LocalClientServices({ config, sqlitePath: path.join(dataRoot, 'index.sqlite') });
  const client = new Client({ config, services });
  await client.initialize();
  await client.addTypes([EdgeStressDocument]);
  return client;
};

const getSpace = async (client: Client, spaceId: string) => {
  const space = await waitForCondition({
    condition: () => client.spaces.get().find((candidate) => candidate.id === spaceId),
    timeout: 120_000,
    interval: 200,
  });
  invariant(space, `space not found: ${spaceId}`);
  await space.waitUntilReady();
  return space;
};

const syncState = async (client: Client, spaceId: string) => {
  const space = await getSpace(client, spaceId);
  const state = await space.db.getAutomergeSyncState();
  const peer = state.peers?.find((candidate) => isEdgePeerId(candidate.peerId, space.id));
  return peer
    ? {
        connected: true,
        missingOnLocal: peer.missingOnLocal,
        missingOnRemote: peer.missingOnRemote,
        different: peer.differentDocuments,
        local: peer.localDocumentCount,
        remote: peer.remoteDocumentCount,
      }
    : { connected: false };
};

/** Polls until EDGE reports holding everything this client has, or the timeout passes. */
const waitForEdge = async (client: Client, spaceId: string, timeoutMs: number): Promise<number | null> => {
  const began = Date.now();
  let last = 0;
  while (Date.now() - began < timeoutMs) {
    const state = await syncState(client, spaceId);
    if (state.connected && state.missingOnRemote === 0 && state.different === 0) {
      return Date.now() - began;
    }
    if (Date.now() - last > 10_000) {
      report('sync-progress', { elapsedMs: Date.now() - began, ...state });
      last = Date.now();
    }
    await sleep(1_000);
  }
  report('sync-timeout', { timeoutMs, ...(await syncState(client, spaceId)) });
  return null;
};

const phases: Record<string, () => Promise<void>> = {
  setup: async () => {
    const state = readState();
    invariant(!state.spaceId, `already set up: ${state.spaceId}`);
    const client = await openClient('owner');
    const identity = await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: 'do-load owner' }));
    const hub = new HubHttpClient(`${EDGE_URL}/hub/`);
    const bound = await hub.redeemInvitationCode(new Context(), {
      email: process.env.OWNER_EMAIL ?? 'test+do-load-owner@dxos.org',
      identityDid: identity.did,
      identityKey: requirePublicKey(identity.identityKey).toHex(),
    });
    report('account', { bound });
    const space = await client.spaces.create({ name: 'do-load' });
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    const observable = space.share({
      type: Invitation_Type.DELEGATED,
      authMethod: Invitation_AuthMethod.KNOWN_PUBLIC_KEY,
      multiUse: true,
    });
    const invitationCode = await new Promise<string>((resolve, reject) => {
      observable.subscribe((invitation) => {
        if (invitation.state === Invitation_State.CONNECTING && invitation.delegationCredentialId) {
          resolve(InvitationEncoder.encode(invitation));
        }
      }, reject);
    });
    writeState({ spaceId: space.id, invitationCode, documents: 0, bursts: [] });
    report('setup', { spaceId: space.id, identityDid: identity.did });
    await waitForEdge(client, space.id, 120_000);
    await client.destroy();
  },

  /** One document with a long history: `--changes` edits of `--bytes` random characters each. */
  bigdoc: async () => {
    const state = readState();
    invariant(state.spaceId, 'run setup first');
    const changes = num('changes', 20_000);
    const bytes = num('bytes', 1_024);
    const flushEvery = num('flush', 50);
    const client = await openClient('owner');
    const space = await getSpace(client, state.spaceId);
    // Always a fresh document, written in one process: reopening a multi-megabyte document trips the
    // client's fixed 10s hydration timeout, so a resumed run could not get the object back.
    const name = args.name ?? `big-${Date.now()}`;
    const doc = space.db.add(Obj.make(EdgeStressDocument, { docId: name, content: '', counters: [0] }));
    await space.db.flush();
    state.bigDocId = doc.id;
    state.bigDocChanges = 0;
    writeState(state);
    report('bigdoc-created', { name, id: doc.id });
    const accessor = Doc.createAccessor(doc, ['content']);
    const began = Date.now();
    for (let index = 0; index < changes; index++) {
      const token = randomBytes(Math.ceil((bytes * 3) / 4))
        .toString('base64')
        .slice(0, bytes);
      // A scalar overwrite is one op per change, so history grows by `bytes` per change; spliced text
      // costs one op per character, and 20 MB of it exhausts automerge-wasm's 4 GB address space.
      Obj.update(doc, (doc) => {
        doc.content = token;
      });
      if ((index + 1) % flushEvery === 0) {
        await space.db.flush();
        state.bigDocChanges = index + 1;
        writeState(state);
      }
      if ((index + 1) % 1_000 === 0) {
        const size = A.save(accessor.handle.doc()).byteLength;
        report('bigdoc-progress', { changes: index + 1, savedBytes: size, elapsedMs: Date.now() - began });
      }
    }
    await space.db.flush();
    state.bigDocChanges = changes;
    writeState(state);
    report('bigdoc-written', { changes, savedBytes: A.save(accessor.handle.doc()).byteLength });
    const syncedMs = await waitForEdge(client, state.spaceId, num('timeout', 900_000));
    report('bigdoc-synced', { syncedMs });
    await client.destroy();
  },

  /** `--bursts` bursts; burst k creates `--size * --growth^k` documents in one go. */
  burst: async () => {
    const state = readState();
    invariant(state.spaceId, 'run setup first');
    const client = await openClient('owner');
    const space = await getSpace(client, state.spaceId);
    const bursts = num('bursts', 5);
    const growth = num('growth', 2);
    let size = num('size', 100);
    for (let burst = 0; burst < bursts; burst++) {
      const began = Date.now();
      for (let index = 0; index < size; index++) {
        const docId = `d${(state.documents ?? 0) + index}`;
        space.db.add(Obj.make(EdgeStressDocument, { docId, content: docId, counters: [0] }));
      }
      await space.db.flush();
      const createMs = Date.now() - began;
      state.documents = (state.documents ?? 0) + size;
      report('burst-created', { burst, size, createMs, total: state.documents });
      const syncedMs = num('nowait', 0) ? null : await waitForEdge(client, state.spaceId, num('timeout', 600_000));
      state.bursts = [...(state.bursts ?? []), { at: stamp(), size, createMs, syncedMs, total: state.documents }];
      writeState(state);
      report('burst-synced', { burst, size, syncedMs, total: state.documents });
      await sleep(num('pause', 10_000));
      size = Math.round(size * growth);
    }
    await client.destroy();
  },

  /** A fresh device-less identity joins and pulls the whole space; times it. */
  join: async () => {
    const state = readState();
    invariant(state.spaceId && state.invitationCode, 'run setup first');
    const name = args.name ?? `joiner-${Date.now()}`;
    const client = await openClient(name);
    await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: name }));
    const began = Date.now();
    const observable = client.spaces.join(InvitationEncoder.decode(state.invitationCode));
    const invitation = await new Promise<{ spaceKey?: { data: Uint8Array } }>((resolve, reject) =>
      observable.subscribe((value) => value.state === Invitation_State.SUCCESS && resolve(value), reject),
    );
    invariant(invitation.spaceKey, 'no space key');
    const spaceKey = PublicKey.from(invitation.spaceKey.data);
    const space = await waitForCondition({
      condition: () => client.spaces.get().find((candidate) => candidate.key.equals(spaceKey)),
      timeout: 120_000,
      interval: 200,
    });
    invariant(space, 'joined space never appeared');
    await space.waitUntilReady();
    await space.internal.setEdgeReplicationPreference(EdgeReplicationSetting.ENABLED);
    report('join-admitted', { name, ms: Date.now() - began });
    const expected = (state.documents ?? 0) + (state.bigDocId ? 1 : 0);
    const timeout = num('timeout', 900_000);
    let last = 0;
    while (Date.now() - began < timeout) {
      const sync = await syncState(client, space.id);
      const objects = await space.db.query(Query.select(Filter.type(EdgeStressDocument))).run();
      if (objects.length >= expected && sync.connected && sync.missingOnLocal === 0) {
        report('join-complete', { name, objects: objects.length, ms: Date.now() - began, ...sync });
        await client.destroy();
        return;
      }
      if (Date.now() - last > 10_000) {
        report('join-progress', { name, objects: objects.length, expected, ms: Date.now() - began, ...sync });
        last = Date.now();
      }
      await sleep(1_000);
    }
    report('join-timeout', { name, expected });
    await client.destroy();
  },

  /** Keeps the owner online for `--ms` so delegated invitations can be admitted. */
  host: async () => {
    const state = readState();
    invariant(state.spaceId, 'run setup first');
    const client = await openClient('owner');
    await getSpace(client, state.spaceId);
    report('host-online', { ms: num('ms', 1_800_000) });
    await sleep(num('ms', 1_800_000));
    await client.destroy();
  },

  status: async () => {
    const state = readState();
    invariant(state.spaceId, 'run setup first');
    const client = await openClient('owner');
    report('status', { state, sync: await syncState(client, state.spaceId) });
    await client.destroy();
  },
};

const phase = process.argv[2];
invariant(phase && phases[phase], `phase must be one of ${Object.keys(phases).join(', ')}`);
fs.mkdirSync(OUT, { recursive: true });
await phases[phase]();
process.exit(0);

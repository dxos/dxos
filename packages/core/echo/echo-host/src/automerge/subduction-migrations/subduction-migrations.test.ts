//
// Copyright 2026 DXOS.org
//

import * as A from '@automerge/automerge';
import { initSubduction } from '@automerge/automerge-repo';
import {
  BlobMeta,
  CommitId,
  Fragment,
  FragmentInput,
  FragmentWithBlob,
  MemorySigner,
  SedimentreeId,
  type SedimentreeStorage,
  SignedFragment,
  type SignedLooseCommit,
  Subduction,
} from '@automerge/automerge-subduction';
import bs58check from 'bs58check';
import * as Effect from 'effect/Effect';
import * as SqlClient from 'effect/unstable/sql/SqlClient';
import { beforeAll, describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { RuntimeProvider } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';

import { type TestSqliteRuntime, createTestSqliteRuntime } from '../../testing/index.ts';
import { AutomergeHost } from '../automerge-host.ts';
import { parseSignedFragmentRecord, selfCheckpointRepair } from '../fragment-checkpoints.ts';
import { SqliteStorageAdapter, SUBDUCTION_PREFIX } from '../sqlite-storage-adapter.ts';
import { deleteRemoteHeads } from './0001_delete_remote_heads.ts';
import { selfCheckpointedFragments } from './0002_self_checkpointed_fragments.ts';
import { type SubductionMigration, hasSubductionMigration, runSubductionMigrations } from './index.ts';

/**
 * The data migrations `AutomergeHost.open()` runs over the Subduction records in `automerge_chunks`,
 * and the runner that records them in `automerge_subduction_migrations`. Fixtures are synthetic
 * documents and ids.
 */
describe('subduction migrations', () => {
  beforeAll(async () => {
    await initSubduction();
  });

  const setup = async () => {
    const { runtime, dispose } = createTestSqliteRuntime();
    const adapter = new SqliteStorageAdapter({ runtime });
    await adapter.open();
    await RuntimeProvider.runPromise(runtime)(adapter.migrate);
    onTestFinished(async () => {
      await adapter.close();
      await dispose();
    });
    return { runtime, adapter };
  };

  const openHost = async (runtime: TestSqliteRuntime['runtime']) => {
    const host = new AutomergeHost({ runtime, useSubduction: true });
    await host.open();
    onTestFinished(async () => {
      if (host.isOpen) {
        await host.close();
      }
    });
    return host;
  };

  const applied = (runtime: TestSqliteRuntime['runtime'], name: string) =>
    RuntimeProvider.runPromise(runtime)(hasSubductionMigration(name));

  /** Empties the ledger, as a profile from before it existed has none. */
  const forgetMigrations = (runtime: TestSqliteRuntime['runtime']) =>
    RuntimeProvider.runPromise(runtime)(
      Effect.gen(function* () {
        const sql = yield* SqlClient.SqlClient;
        yield* sql`DELETE FROM automerge_subduction_migrations`;
      }),
    );

  describe('runner', () => {
    const migration = (name: string, complete: boolean, ran: string[]): SubductionMigration => ({
      name,
      run: async () => {
        ran.push(name);
        return { complete, counts: {} };
      },
    });

    test('runs unrecorded migrations in order, records the complete ones, and stops at a throw', async () => {
      const { runtime, adapter } = await setup();
      const subduction = new Subduction({ signer: MemorySigner.generate(), storage: memoryStorage() });
      const context = { runtime, storage: adapter, subduction };
      const ran: string[] = [];
      const migrations = [
        migration('0001_first', true, ran),
        migration('0002_partial', false, ran),
        migration('0003_complete', true, ran),
        { name: '0004_throws', run: async () => Promise.reject(new Error('boom')) },
        migration('0005_after', true, ran),
      ];

      await expect(runSubductionMigrations(context, migrations)).rejects.toThrow('boom');
      expect(ran).toEqual(['0001_first', '0002_partial', '0003_complete']);
      expect(await applied(runtime, '0001_first')).toBe(true);
      expect(await applied(runtime, '0002_partial')).toBe(false);
      expect(await applied(runtime, '0003_complete')).toBe(true);
      expect(await applied(runtime, '0005_after')).toBe(false);

      // A second run picks up the partial one again and nothing that is recorded.
      ran.length = 0;
      await runSubductionMigrations(context, migrations.slice(0, 3));
      expect(ran).toEqual(['0002_partial']);
    });
  });

  describe('0001_delete_remote_heads', () => {
    const remoteHeads = ['sid1', 'sid2'].flatMap((sedimentreeId) =>
      ['peerA', 'peerB'].map((peerId) => [SUBDUCTION_PREFIX, 'remote-heads', sedimentreeId, peerId]),
    );
    const unrelated = [
      [SUBDUCTION_PREFIX, 'ids', 'sid1'],
      [SUBDUCTION_PREFIX, 'commits', 'sid1', 'commit1'],
      ['doc1', 'incremental', 'hash1'],
    ];

    test('deletes the stored remote heads once, on the first open', async () => {
      const { runtime, adapter } = await setup();
      const marker = new Uint8Array([1]);
      for (const key of [...remoteHeads, ...unrelated]) {
        await adapter.save(key, marker);
      }

      const host = await openHost(runtime);
      expect(await adapter.loadRange([SUBDUCTION_PREFIX, 'remote-heads'])).toEqual([]);
      for (const key of unrelated) {
        expect(await adapter.load(key), key.join('/')).toEqual(marker);
      }
      expect(await applied(runtime, deleteRemoteHeads.name)).toBe(true);
      expect(await applied(runtime, selfCheckpointedFragments.name)).toBe(true);
      await host.close();

      // Recorded: records written after the first open are the live cache, and stay.
      for (const key of remoteHeads) {
        await adapter.save(key, marker);
      }
      await openHost(runtime);
      expect(await adapter.loadRange([SUBDUCTION_PREFIX, 'remote-heads'])).toHaveLength(remoteHeads.length);
    });
  });

  describe('0002_self_checkpointed_fragments', () => {
    /** A fragment-only document: its whole history in one blob, the old self-checkpointed shape. */
    const syntheticDocument = () => {
      let doc = A.from<{ text: string }>({ text: 'one' });
      doc = A.change(doc, (draft) => {
        draft.text = 'two';
      });
      doc = A.change(doc, (draft) => {
        draft.text = 'three';
      });
      const [head] = A.getHeads(doc);
      return { doc, headBytes: hexToBytes(head), blob: A.save(doc) };
    };

    test('rewrites the stored fragment on open; the engine then lists the head and serves the same bytes', async () => {
      const { runtime, adapter } = await setup();
      const { doc, headBytes, blob } = syntheticDocument();
      const sedimentreeBytes = padTo32(PublicKey.random().asUint8Array().slice(0, 16));
      const planted = await plantOldShapeFragment(adapter, { sedimentreeBytes, headBytes, blob });

      // Before: the stored records yield no head.
      expect(await headsSeenBy(adapter)).toEqual([{ id: bytesToHex(sedimentreeBytes), heads: [] }]);

      const host = await openHost(runtime);

      // The record chunk was replaced under its key with the valid shape; the blob chunk is untouched.
      const rewritten = await adapter.load(planted.fragmentKey);
      expect(rewritten).toBeDefined();
      expect(rewritten).not.toEqual(planted.signed);
      const record = parseSignedFragmentRecord(rewritten!);
      expect(record?.head).toEqual(headBytes);
      expect(record?.boundary).toEqual([]);
      expect(record?.checkpoints).toEqual([]);
      expect(selfCheckpointRepair(rewritten!)).toBeUndefined();
      expect(await adapter.load(planted.blobKey)).toEqual(blob);
      expect(await applied(runtime, selfCheckpointedFragments.name)).toBe(true);

      // After: the host's own engine and a fresh one over the rows both report the head, and the
      // engine hands out the very blob that was stored — the document it carries is unchanged.
      const subduction = await host.subduction;
      const allHeads = await subduction.getAllHeads();
      expect(allHeads.map((entry) => entry.heads.map((head) => head.toHexString()))).toEqual([[bytesToHex(headBytes)]]);
      expect(await headsSeenBy(adapter)).toEqual([
        { id: bytesToHex(sedimentreeBytes), heads: [bytesToHex(headBytes)] },
      ]);
      const blobs = await subduction.getBlobs(SedimentreeId.fromBytes(sedimentreeBytes));
      expect(blobs).toEqual([blob]);
      const loaded = A.load<{ text: string }>(blobs[0]);
      expect(loaded.text).toEqual('three');
      expect(A.getHeads(loaded)).toEqual(A.getHeads(doc));
    });

    test('a document the host wrote reopens unchanged, with the head the old fragment hid restored', async () => {
      const { runtime, adapter } = await setup();
      const host = await openHost(runtime);
      const created = await host.createDoc<{ text: string }>({ text: 'first' });
      created.change((draft) => {
        draft.text = 'second';
      });
      await host.flush(Context.default());
      const url = created.url;
      const documentId = created.documentId;
      const doc = created.doc()!;
      const [head] = A.getHeads(doc);
      const sedimentreeBytes = padTo32(bs58check.decode(documentId));
      await host.close();

      // A pre-3.5 client's fragment over the same history, at the document's head: the loose
      // commits the host stored are valid, but the fragment's own checkpoint hides the head. The
      // ledger is cleared with it: a profile that build wrote has no ledger yet.
      await plantOldShapeFragment(adapter, { sedimentreeBytes, headBytes: hexToBytes(head), blob: A.save(doc) });
      await forgetMigrations(runtime);
      const [before] = await headsSeenBy(adapter);
      expect(before.heads).not.toContain(head);

      const reopened = await openHost(runtime);
      const lease = await reopened.loadDoc<{ text: string }>(Context.default(), url);
      expect(lease).not.toBeNull();
      await lease!.waitUntilReady();
      expect(lease!.doc()?.text).toEqual('second');
      expect(A.getHeads(lease!.doc()!)).toEqual([head]);
      const allHeads = await (await reopened.subduction).getAllHeads();
      const entry = allHeads.find((candidate) => candidate.id.toString() === bytesToHex(sedimentreeBytes));
      expect(entry?.heads.map((commitId) => commitId.toHexString())).toEqual([head]);
    });

    test('a second open changes nothing', async () => {
      const { runtime, adapter } = await setup();
      const { headBytes, blob } = syntheticDocument();
      const sedimentreeBytes = padTo32(PublicKey.random().asUint8Array().slice(0, 16));
      const planted = await plantOldShapeFragment(adapter, { sedimentreeBytes, headBytes, blob });

      const host = await openHost(runtime);
      const rewritten = await adapter.load(planted.fragmentKey);
      await host.close();

      await openHost(runtime);
      expect(await adapter.load(planted.fragmentKey)).toEqual(rewritten);
      expect(await adapter.load(planted.blobKey)).toEqual(blob);
    });

    test('repairs a fragment that arrives after the migration was recorded', async () => {
      const { runtime, adapter } = await setup();
      const { headBytes, blob } = syntheticDocument();
      const sedimentreeBytes = padTo32(PublicKey.random().asUint8Array().slice(0, 16));
      const host = await openHost(runtime);
      expect(await applied(runtime, selfCheckpointedFragments.name)).toBe(true);

      // Through the host's own adapter, as the engine's storage bridge stores what a peer sent.
      const planted = await plantOldShapeFragment(host.storage, { sedimentreeBytes, headBytes, blob });
      const rewritten = await waitForRewrite(adapter, planted.fragmentKey, planted.signed);
      expect(selfCheckpointRepair(rewritten)).toBeUndefined();
      expect(parseSignedFragmentRecord(rewritten)?.head).toEqual(headBytes);
      expect(await adapter.load(planted.blobKey)).toEqual(blob);
      expect(await headsSeenBy(adapter)).toEqual([
        { id: bytesToHex(sedimentreeBytes), heads: [bytesToHex(headBytes)] },
      ]);
    });

    // A loaded tree keeps one in-memory fragment per head, the lower digest, and the digest
    // depends only on the fragment payload — so for about half of all document ids the old
    // fragment would win over its rewrite for the rest of the session. A document id where it
    // does is mined here, and the host is then shown to report the head anyway: the rewrite
    // landed before the engine loaded the tree.
    test('runs before the engine loads the tree', async () => {
      const { runtime, adapter } = await setup();
      const { headBytes, blob } = syntheticDocument();
      const sedimentreeBytes = await mineSedimentreeWhereOldFragmentWins({ headBytes, blob });
      await plantOldShapeFragment(adapter, { sedimentreeBytes, headBytes, blob });

      const host = await openHost(runtime);

      const subduction = await host.subduction;
      const allHeads = await subduction.getAllHeads();
      expect(allHeads.map((entry) => entry.heads.map((head) => head.toHexString()))).toEqual([[bytesToHex(headBytes)]]);
    });
  });
});

type OldShapeFragment = { sedimentreeBytes: Uint8Array; headBytes: Uint8Array; blob: Uint8Array };

/**
 * Stores `fragment` into `storage` in the old shape — the head listed as its own checkpoint —
 * through a throwaway engine, so the record is byte-for-byte what a pre-3.5 client wrote.
 */
const storeOldShape = async (storage: SedimentreeStorage, { sedimentreeBytes, headBytes, blob }: OldShapeFragment) => {
  const engine = new Subduction({ signer: MemorySigner.generate(), storage });
  await engine.storeFragment(
    SedimentreeId.fromBytes(sedimentreeBytes),
    CommitId.fromBytes(headBytes),
    [],
    [CommitId.fromBytes(headBytes)],
    blob,
  );
};

/** Writes the old shape into the adapter under the keys `SubductionStorageBridge` uses. */
const plantOldShapeFragment = async (adapter: SqliteStorageAdapter, fragment: OldShapeFragment) => {
  const captured = memoryStorage();
  await storeOldShape(captured, fragment);
  const [row] = [...captured.fragments.values()];
  const sedimentreeHex = bytesToHex(fragment.sedimentreeBytes);
  const headHex = bytesToHex(fragment.headBytes);
  const fragmentKey = [SUBDUCTION_PREFIX, 'fragments', sedimentreeHex, headHex];
  const blobKey = [SUBDUCTION_PREFIX, 'fragment-blobs', sedimentreeHex, headHex];
  await adapter.saveBatch([
    [[SUBDUCTION_PREFIX, 'ids', sedimentreeHex], new Uint8Array([1])],
    [fragmentKey, row.signed],
    [blobKey, fragment.blob],
  ]);
  return { fragmentKey, blobKey, signed: row.signed };
};

/** Polls until the record under `key` differs from `planted`; the arrival repair runs from a deferred task. */
const waitForRewrite = async (adapter: SqliteStorageAdapter, key: string[], planted: Uint8Array) => {
  for (let attempt = 0; attempt < 100; attempt++) {
    const current = await adapter.load(key);
    if (current && !bytesEqual(current, planted)) {
      return current;
    }
    await sleep(20);
  }
  throw new Error('fragment record was not rewritten');
};

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => right[index] === byte);

/** Heads per sedimentree as a fresh engine over the adapter's rows reports them. */
const headsSeenBy = async (adapter: SqliteStorageAdapter) => {
  const chunks = await adapter.loadRange([SUBDUCTION_PREFIX]);
  const storage = memoryStorage();
  for (const { key, data } of chunks) {
    if (!data) {
      continue;
    }
    if (key[1] === 'ids') {
      storage.ids.add(key[2]);
    } else if (key[1] === 'fragments') {
      const blob = chunks.find(
        (chunk) => chunk.key.join('/') === [SUBDUCTION_PREFIX, 'fragment-blobs', key[2], key[3]].join('/'),
      );
      storage.fragments.set(`${key[2]}/${key[3]}`, { signed: data, blob: blob!.data! });
    }
  }
  const engine = new Subduction({ signer: MemorySigner.generate(), storage });
  const all = await engine.getAllHeads();
  return all.map((entry) => ({ id: entry.id.toString(), heads: entry.heads.map((head) => head.toHexString()) }));
};

/**
 * A sedimentree id for which rewriting the old fragment under an already-loaded tree loses the
 * tiebreak — shown directly: the engine still reports no head after the rewrite.
 */
const mineSedimentreeWhereOldFragmentWins = async ({ headBytes, blob }: Omit<OldShapeFragment, 'sedimentreeBytes'>) => {
  for (let attempt = 0; attempt < 64; attempt++) {
    const sedimentreeBytes = padTo32(PublicKey.random().asUint8Array().slice(0, 16));
    const storage = memoryStorage();
    await storeOldShape(storage, { sedimentreeBytes, headBytes, blob });
    const engine = new Subduction({ signer: MemorySigner.generate(), storage });
    const sedimentreeId = SedimentreeId.fromBytes(sedimentreeBytes);
    await engine.getAllHeads();
    const fragment = new Fragment(sedimentreeId, CommitId.fromBytes(headBytes), [], [], new BlobMeta(blob));
    await engine.storeBuiltBatch(sedimentreeId, [], [new FragmentInput(fragment, blob)]);
    const [entry] = await engine.getAllHeads();
    if (entry.heads.length === 0) {
      return sedimentreeBytes;
    }
  }
  throw new Error('no sedimentree id where the old fragment wins the tiebreak in 64 attempts');
};

type MemoryStorage = SedimentreeStorage & {
  ids: Set<string>;
  fragments: Map<string, { signed: Uint8Array; blob: Uint8Array }>;
};

/** The narrowest in-memory storage the engine accepts: sedimentree ids and fragments only. */
const memoryStorage = (): MemoryStorage => {
  const ids = new Set<string>();
  const fragments = new Map<string, { signed: Uint8Array; blob: Uint8Array }>();
  const rowKey = (sedimentreeId: SedimentreeId, head: CommitId) => `${sedimentreeId.toString()}/${head.toHexString()}`;
  const rowsOf = (sedimentreeId: SedimentreeId) =>
    [...fragments.entries()].filter(([key]) => key.startsWith(`${sedimentreeId.toString()}/`)).map(([, row]) => row);
  const fragmentWithBlob = (row: { signed: Uint8Array; blob: Uint8Array }): FragmentWithBlob =>
    new FragmentWithBlob(SignedFragment.tryDecode(row.signed), row.blob);
  return {
    ids,
    fragments,
    saveSedimentreeId: async (sedimentreeId) => void ids.add(sedimentreeId.toString()),
    deleteSedimentreeId: async (sedimentreeId) => void ids.delete(sedimentreeId.toString()),
    loadAllSedimentreeIds: async () => [...ids].map((hex) => SedimentreeId.fromBytes(hexToBytes(hex))),
    saveCommit: async () => {},
    loadCommit: async () => null,
    listCommitIds: async () => [],
    loadAllCommits: async () => [],
    deleteCommit: async () => {},
    deleteAllCommits: async () => {},
    saveFragment: async (sedimentreeId, head, signedFragment, blob) => {
      fragments.set(rowKey(sedimentreeId, head), { signed: new Uint8Array(signedFragment.encode()), blob });
    },
    loadFragment: async (sedimentreeId, head) => {
      const row = fragments.get(rowKey(sedimentreeId, head));
      return row ? fragmentWithBlob(row) : null;
    },
    listFragmentIds: async (sedimentreeId) =>
      [...fragments.keys()]
        .filter((key) => key.startsWith(`${sedimentreeId.toString()}/`))
        .map((key) => CommitId.fromHexString(key.split('/')[1])),
    loadAllFragments: async (sedimentreeId) => rowsOf(sedimentreeId).map(fragmentWithBlob),
    deleteFragment: async (sedimentreeId, head) => void fragments.delete(rowKey(sedimentreeId, head)),
    deleteAllFragments: async (sedimentreeId) => {
      for (const key of [...fragments.keys()]) {
        if (key.startsWith(`${sedimentreeId.toString()}/`)) {
          fragments.delete(key);
        }
      }
    },
    saveBatchAll: async (sedimentreeId, commits: Array<{ signedCommit: SignedLooseCommit }>, batch) => {
      for (const { fragmentHead, signedFragment, blob } of batch) {
        fragments.set(rowKey(sedimentreeId, fragmentHead), { signed: new Uint8Array(signedFragment.encode()), blob });
      }
      return commits.length + batch.length;
    },
  };
};

const padTo32 = (bytes: Uint8Array): Uint8Array => {
  const out = new Uint8Array(32);
  out.set(bytes);
  return out;
};

const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from({ length: hex.length / 2 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));

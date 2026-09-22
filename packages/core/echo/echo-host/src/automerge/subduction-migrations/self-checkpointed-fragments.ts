//
// Copyright 2026 DXOS.org
//

import {
  BlobMeta,
  CommitId,
  Fragment,
  FragmentInput,
  SedimentreeId,
  type Subduction,
} from '@automerge/automerge-subduction/slim';

import { log } from '@dxos/log';

import { type SelfCheckpointRepair, selfCheckpointRepair } from './fragment-checkpoints.ts';
import { type SubductionMigration } from './framework.ts';

/** One stored fragment record as raw bytes, without its blob. */
export type StoredFragmentRecord = {
  sedimentreeId: Uint8Array;
  head: Uint8Array;
  /** The signed record, as `SignedFragment.encode()` produced it. */
  signed: Uint8Array;
};

/**
 * Read access to a store's fragment records, in whatever shape the store keeps them (rows on the
 * edge, `[subduction, fragments, …]` chunks on a client). Records are a few hundred bytes each, so a
 * full scan stays cheap where loading every blob would not; the blob is fetched only for a record
 * that is going to be rewritten.
 */
export type FragmentRecordStore = {
  loadFragmentRecords(): Promise<StoredFragmentRecord[]>;
  loadFragmentBlob(sedimentreeId: Uint8Array, head: Uint8Array): Promise<Uint8Array | undefined>;
};

export type SelfCheckpointedFragmentsContext = {
  /** An engine no tree has been loaded into yet. */
  subduction: Subduction;
  fragments: FragmentRecordStore;
  /** `Date.now()` after which no further sedimentree is rewritten; the rest is reported as deferred. */
  deadline?: number;
};

export type FragmentRepairResult = {
  /** Fragment records inspected. */
  scanned: number;
  /** Self-checkpointed records rewritten into the valid shape. */
  rewritten: number;
  /** Self-checkpointed records that can never be rewritten: blob missing or not matching its digest. */
  skipped: number;
  /** Self-checkpointed records whose rewrite threw; the stored rows are untouched and a later run retries. */
  failed: number;
  /** Sedimentrees with self-checkpointed records left untouched because the deadline passed. */
  deferred: Uint8Array[];
};

/**
 * Store-wide {@link repairSelfCheckpointedFragments}. Complete — and so recorded — once no rewrite
 * failed and no tree was deferred past the deadline; a permanently skipped record does not hold it
 * open, since nothing later can change it. Deferred trees are picked up on the next start.
 */
export const selfCheckpointedFragments: SubductionMigration<SelfCheckpointedFragmentsContext> = {
  name: 'self_checkpointed_fragments',
  run: async ({ subduction, fragments, deadline }) => {
    const result = await repairSelfCheckpointedFragments(subduction, fragments, { deadline });
    return {
      complete: result.failed === 0 && result.deferred.length === 0,
      counts: {
        scanned: result.scanned,
        rewritten: result.rewritten,
        skipped: result.skipped,
        failed: result.failed,
        deferred: result.deferred.length,
      },
    };
  },
};

/**
 * Rewrites every self-checkpointed fragment in `fragments` — what every client on
 * `@automerge/automerge` < 3.5 wrote, and a shape the engine reports no head for — into the valid
 * one: same head, boundary and blob; checkpoints without the head and the boundary ids. Goes
 * through `subduction.storeBuiltBatch`, which signs the new record with the engine's signer and
 * replaces the stored record under its existing key (records are keyed by sedimentree and head).
 * See `fragment-checkpoints.ts` for why.
 *
 * Never deletes and never edits stored bytes: a record that does not parse is not a fragment of ours
 * to touch, and one whose blob is missing or mismatched, or whose rewrite throws, is left exactly as
 * it was. Idempotent — a rewritten record no longer matches, so a second sweep changes nothing. One
 * `storeBuiltBatch` (one storage transaction) per sedimentree.
 *
 * Runs against an engine whose trees are not loaded yet: a loaded tree keeps one in-memory fragment
 * per head (the lower digest wins), so rewriting under it would fix storage while the live view
 * kept the old copy until the tree was next loaded.
 */
export const repairSelfCheckpointedFragments = async (
  subduction: Subduction,
  fragments: FragmentRecordStore,
  { deadline }: { deadline?: number } = {},
): Promise<FragmentRepairResult> => {
  const records = await fragments.loadFragmentRecords();
  const result: FragmentRepairResult = { scanned: records.length, rewritten: 0, skipped: 0, failed: 0, deferred: [] };
  const bySedimentree = new Map<string, Array<{ record: StoredFragmentRecord; repair: SelfCheckpointRepair }>>();
  for (const record of records) {
    const repair = selfCheckpointRepair(record.signed);
    if (!repair) {
      continue;
    }
    const key = bytesToHex(record.sedimentreeId);
    const group = bySedimentree.get(key) ?? [];
    group.push({ record, repair });
    bySedimentree.set(key, group);
  }

  for (const [sedimentreeHex, group] of bySedimentree) {
    const sedimentreeBytes = group[0].record.sedimentreeId;
    if (deadline !== undefined && Date.now() >= deadline) {
      result.deferred.push(sedimentreeBytes);
      continue;
    }
    const sedimentreeId = SedimentreeId.fromBytes(sedimentreeBytes);
    const inputs: FragmentInput[] = [];
    for (const { record, repair } of group) {
      const blob = await fragments.loadFragmentBlob(sedimentreeBytes, record.head);
      if (!blob) {
        result.skipped++;
        continue;
      }
      const blobMeta = new BlobMeta(blob);
      if (!bytesEqual(blobMeta.digest().toBytes(), repair.blobDigest)) {
        log.warn('subduction fragment migration: stored blob does not match its record; leaving it', {
          sedimentreeId: sedimentreeHex,
          head: bytesToHex(record.head),
        });
        result.skipped++;
        continue;
      }
      const fragment = new Fragment(
        sedimentreeId,
        CommitId.fromBytes(repair.head),
        repair.boundary.map((id) => CommitId.fromBytes(id)),
        repair.checkpoints.map((id) => CommitId.fromBytes(id)),
        blobMeta,
      );
      inputs.push(new FragmentInput(fragment, blob));
    }
    if (inputs.length === 0) {
      continue;
    }
    try {
      await subduction.storeBuiltBatch(sedimentreeId, [], inputs);
      result.rewritten += inputs.length;
    } catch (err) {
      result.failed += inputs.length;
      log.warn('subduction fragment migration: rewrite failed; leaving the stored records', {
        sedimentreeId: sedimentreeHex,
        fragments: inputs.length,
        err,
      });
    }
  }
  return result;
};

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => right[index] === byte);

export const bytesToHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

export const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from({ length: hex.length / 2 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));

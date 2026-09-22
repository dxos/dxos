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
} from '@automerge/automerge-subduction';

import { log } from '@dxos/log';

import { type SelfCheckpointRepair, selfCheckpointRepair } from '../fragment-checkpoints.ts';
import { type SqliteStorageAdapter, SUBDUCTION_PREFIX } from '../sqlite-storage-adapter.ts';
import { type SubductionMigration } from './index.ts';

const FRAGMENTS_FAMILY = 'fragments';
const FRAGMENT_BLOBS_FAMILY = 'fragment-blobs';

export type FragmentRepairResult = {
  /** Fragment records inspected. */
  scanned: number;
  /** Self-checkpointed records rewritten into the valid shape. */
  rewritten: number;
  /** Self-checkpointed records that can never be rewritten: blob missing or not matching its digest. */
  skipped: number;
  /** Self-checkpointed records whose rewrite threw; the stored rows are untouched and a later run retries. */
  failed: number;
};

/**
 * Rewrites every self-checkpointed fragment in `storage` — what every client on
 * `@automerge/automerge` < 3.5 wrote, and a shape the engine reports no head for — into the valid
 * one: same head, boundary and blob; checkpoints without the head and the boundary ids. Goes
 * through `subduction.storeBuiltBatch`, which signs the new record with the Repo's signer and
 * replaces the two chunks (`[subduction, fragments, <sid>, <head>]` and its `fragment-blobs`
 * twin) under their existing keys. See `fragment-checkpoints.ts` for why.
 *
 * Never deletes and never edits stored bytes: a chunk that does not parse is not a fragment of ours
 * to touch, and one whose blob is missing or mismatched, or whose rewrite throws, is left exactly
 * as it was. Idempotent — a rewritten record no longer matches. One `storeBuiltBatch` per
 * sedimentree.
 *
 * Runs before the engine loads any tree: a loaded tree keeps one in-memory fragment per head (the
 * lower digest wins), so rewriting under it would fix storage while the live view kept the old
 * copy until the tree was next loaded.
 */
export const repairSelfCheckpointedFragments = async (
  subduction: Subduction,
  storage: SqliteStorageAdapter,
): Promise<FragmentRepairResult> => {
  const result: FragmentRepairResult = { scanned: 0, rewritten: 0, skipped: 0, failed: 0 };
  const chunks = await storage.loadRange([SUBDUCTION_PREFIX, FRAGMENTS_FAMILY]);
  const bySedimentree = new Map<string, Array<{ headHex: string; repair: SelfCheckpointRepair }>>();
  for (const { key, data } of chunks) {
    if (key.length !== 4 || !data) {
      continue;
    }
    result.scanned++;
    const repair = selfCheckpointRepair(data);
    if (!repair) {
      continue;
    }
    const [, , sedimentreeHex, headHex] = key;
    const group = bySedimentree.get(sedimentreeHex) ?? [];
    group.push({ headHex, repair });
    bySedimentree.set(sedimentreeHex, group);
  }

  for (const [sedimentreeHex, group] of bySedimentree) {
    const sedimentreeId = SedimentreeId.fromBytes(hexToBytes(sedimentreeHex));
    const inputs: FragmentInput[] = [];
    for (const { headHex, repair } of group) {
      const blob = await storage.load([SUBDUCTION_PREFIX, FRAGMENT_BLOBS_FAMILY, sedimentreeHex, headHex]);
      if (!blob) {
        result.skipped++;
        continue;
      }
      const blobMeta = new BlobMeta(blob);
      if (!bytesEqual(blobMeta.digest().toBytes(), repair.blobDigest)) {
        log.warn('subduction fragment migration: stored blob does not match its record; leaving it', {
          sedimentreeId: sedimentreeHex,
          head: headHex,
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

/**
 * Store-wide {@link repairSelfCheckpointedFragments}. Complete — and so recorded — once no rewrite
 * failed; a permanently skipped record does not hold it open, since nothing later can change it.
 */
export const selfCheckpointedFragments: SubductionMigration = {
  name: '0002_self_checkpointed_fragments',
  run: async ({ subduction, storage }) => {
    const result = await repairSelfCheckpointedFragments(subduction, storage);
    return { complete: result.failed === 0, counts: { ...result } };
  },
};

const bytesEqual = (left: Uint8Array, right: Uint8Array): boolean =>
  left.length === right.length && left.every((byte, index) => right[index] === byte);

const hexToBytes = (hex: string): Uint8Array =>
  Uint8Array.from({ length: hex.length / 2 }, (_, index) => parseInt(hex.slice(index * 2, index * 2 + 2), 16));

//
// Copyright 2026 DXOS.org
//

import { type Page } from '@playwright/test';

import { type SpaceId } from '@dxos/keys';

/**
 * The prefix an EDGE replicator's peer id carries, scoped to one space.
 *
 * Restated rather than imported from `@dxos/echo-protocol`: `isEdgePeerId` is not exported from
 * that package's index, and this expression is evaluated inside the PAGE anyway, so a module
 * import would not cross the boundary. The composition is
 * `compositeKey(EdgeService.SUBDUCTION_REPLICATOR, spaceId)` — renaming it there means renaming it
 * here, which is why an absent peer is reported (`edgePeer: false`) rather than read as zero work.
 */
const EDGE_PEER_PREFIX = 'subduction-replicator';

/** How often the space is asked where replication has got to. */
const POLL_INTERVAL_MS = 500;

/**
 * The fraction that counts as replicated for the hold rule below.
 *
 * Not 1: the app keeps writing after the fixture stops — presence, indexing and the space's own
 * metadata all produce mutations — so a tail of a few documents can stay outstanding indefinitely
 * while the bulk of the fixture is long since on the remote. Waiting for a true zero would trade a
 * noisy measurement for a timeout.
 */
const NEARLY_REPLICATED = 0.95;

/** How long {@link NEARLY_REPLICATED} has to hold before the space counts as replicated. */
const HOLD_MS = 10_000;

/** Default ceiling on the whole wait. */
const DEFAULT_TIMEOUT_MS = 180_000;

/** One reading of the space's combined (automerge documents + feed blocks) sync state. */
export type ReplicationState = {
  /**
   * Whether the EDGE replicator is a peer of this space at all.
   *
   * The integrity column, and the reason every count below is read together with it: the combined
   * sync state reports zeroes for every document field when no peer is selected, so "replicated"
   * and "not replicating" are indistinguishable from the counts alone.
   */
  edgePeer: boolean;
  localDocumentCount: number;
  remoteDocumentCount: number;
  totalDocumentCount: number;
  unsyncedDocumentCount: number;
  blocksToPull: number;
  blocksToPush: number;
  totalBlocks: number;
};

export type ReplicationSample = ReplicationState & {
  /** Ms since the wait began. */
  atMs: number;
  /** Documents outstanding plus feed blocks outstanding, in either direction. */
  pending: number;
  /** Documents known to either peer plus blocks held locally. */
  total: number;
  /** `pending` against `total`, clamped to 0..1. `0` whenever the EDGE peer is absent. */
  progress: number;
};

export type ReplicationOutcome =
  /** Nothing outstanding: the space and EDGE agree on every document and every block. */
  | 'replicated'
  /** {@link NEARLY_REPLICATED} held for {@link HOLD_MS}; the remaining tail is not settling. */
  | 'held'
  /** Neither of the above inside the budget. */
  | 'timeout';

export type ReplicationResult = {
  outcome: ReplicationOutcome;
  elapsedMs: number;
  final: ReplicationSample;
  /**
   * The readings where something CHANGED, first and last included.
   *
   * A trail rather than every poll: at 500ms over a three-minute budget the full series is a few
   * hundred identical rows, and what a timeout has to explain is whether replication was moving at
   * all — which only the transitions show.
   */
  transitions: ReplicationSample[];
};

export type WaitForReplicationOptions = {
  timeoutMs?: number;
  pollIntervalMs?: number;
  nearlyReplicated?: number;
  holdMs?: number;
};

/**
 * Reads the space's sync state from inside the page.
 *
 * Both calls, because they answer different halves of one question: `getSyncState` is the combined
 * documents-and-feed-blocks view already selected against the EDGE peer (the predicate
 * `plugin-client`'s own progress reporting uses), while `getAutomergeSyncState` is the only place
 * the peer LIST is visible, and therefore the only way to tell an absent replicator from a
 * replicated space.
 */
const readState = (page: Page, spaceId: SpaceId): Promise<ReplicationState> =>
  page.evaluate(
    async ({ spaceId, edgePeerPrefix }) => {
      const space = globalThis.dxos?.spaces?.().find((candidate) => candidate.id === spaceId);
      if (!space) {
        throw new Error(`space ${spaceId} is not in the client's space list`);
      }

      const automerge = await space.db.getAutomergeSyncState();
      const state = await space.db.getSyncState();
      return {
        edgePeer: (automerge.peers ?? []).some((peer) => peer.peerId.startsWith(`${edgePeerPrefix}:${spaceId}`)),
        localDocumentCount: state.localDocumentCount,
        remoteDocumentCount: state.remoteDocumentCount,
        totalDocumentCount: state.totalDocumentCount,
        unsyncedDocumentCount: state.unsyncedDocumentCount,
        // Strings on the wire, because a block count can exceed `Number.MAX_SAFE_INTEGER` in
        // principle; at this fixture's size the conversion is exact.
        blocksToPull: Number(state.blocksToPull),
        blocksToPush: Number(state.blocksToPush),
        totalBlocks: Number(state.totalBlocks),
      };
    },
    { spaceId, edgePeerPrefix: EDGE_PEER_PREFIX },
  );

/**
 * Drains pending head updates before the first reading.
 *
 * `SpaceProxy._syncToEdge` does the same thing for the same reason: `db.flush()` propagates
 * recorded heads into the collection synchronizer, and without it the first sync state can be read
 * from stale local heads and report nothing outstanding — resolving the wait before the fixture's
 * writes have even been offered to the remote.
 */
const flush = (page: Page, spaceId: SpaceId): Promise<void> =>
  page.evaluate(async (spaceId) => {
    const space = globalThis.dxos?.spaces?.().find((candidate) => candidate.id === spaceId);
    if (!space) {
      throw new Error(`space ${spaceId} is not in the client's space list`);
    }
    await space.db.flush();
  }, spaceId);

const sampleOf = (state: ReplicationState, atMs: number): ReplicationSample => {
  const pending = state.unsyncedDocumentCount + state.blocksToPull + state.blocksToPush;
  const total = state.totalDocumentCount + state.totalBlocks;
  // `totalBlocks` counts what is held LOCALLY while `blocksToPull` counts what is not, so the ratio
  // can leave the unit interval on either side; the clamp keeps `progress` readable as a fraction
  // rather than making the hold rule depend on which side overshot.
  const progress = !state.edgePeer ? 0 : total === 0 ? 1 : Math.min(1, Math.max(0, 1 - pending / total));
  return { ...state, atMs, pending, total, progress };
};

/** One line carrying what the wait saw — the log line, and the error message on a timeout. */
export const describeReplication = (result: ReplicationResult): string => {
  const { final, outcome, elapsedMs, transitions } = result;
  return [
    `replication ${outcome} after ${Math.round(elapsedMs / 1000)}s`,
    `progress=${(final.progress * 100).toFixed(1)}%`,
    `edgePeer=${final.edgePeer}`,
    `docs=${final.unsyncedDocumentCount} unsynced of ${final.totalDocumentCount}`,
    `blocks=${final.blocksToPush} to push, ${final.blocksToPull} to pull of ${final.totalBlocks}`,
    `transitions=${transitions.length}`,
  ].join(', ');
};

/**
 * Blocks until the space has replicated to EDGE, or until the budget runs out.
 *
 * Why the flow needs this at all: the fixture's writes keep replicating long after the last
 * `tasks.create` resolves, so whichever measured stage happens to be running absorbs the SQLite
 * writes and the socket traffic of work that belongs to setup. That is the whole explanation for a
 * per-stage I/O spread far wider than the stages themselves — a stage's disk and network columns
 * were measuring where a background upload landed, not what the stage did.
 *
 * Two ways to finish, because a strict zero is not reachable: `replicated` when nothing is
 * outstanding, and `held` when {@link NEARLY_REPLICATED} has held for {@link HOLD_MS} — the app
 * keeps producing small mutations of its own, so the last few documents can stay outstanding
 * indefinitely while the fixture itself is long since on the remote.
 *
 * Never throws on a timeout: it returns the trail instead, and the caller decides. A throw here
 * would lose the one reading that explains why the wait failed.
 */
export const waitForReplication = async (
  page: Page,
  spaceId: SpaceId,
  options: WaitForReplicationOptions = {},
): Promise<ReplicationResult> => {
  const {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    pollIntervalMs = POLL_INTERVAL_MS,
    nearlyReplicated = NEARLY_REPLICATED,
    holdMs = HOLD_MS,
  } = options;

  await flush(page, spaceId);

  const started = Date.now();
  const transitions: ReplicationSample[] = [];
  let heldSince: number | undefined;
  let last: ReplicationSample | undefined;

  for (;;) {
    const sample = sampleOf(await readState(page, spaceId), Date.now() - started);
    if (!last || last.progress !== sample.progress || last.edgePeer !== sample.edgePeer) {
      transitions.push(sample);
    }
    last = sample;

    const done = (outcome: ReplicationOutcome): ReplicationResult => {
      // The last reading always ends the trail, whether or not it changed anything: a trail whose
      // final row is minutes old reads as if the wait stopped observing.
      if (transitions.at(-1) !== sample) {
        transitions.push(sample);
      }
      return { outcome, elapsedMs: Date.now() - started, final: sample, transitions };
    };

    if (sample.edgePeer && sample.pending === 0) {
      return done('replicated');
    }

    if (sample.edgePeer && sample.progress >= nearlyReplicated) {
      heldSince ??= Date.now();
      if (Date.now() - heldSince >= holdMs) {
        return done('held');
      }
    } else {
      // Reset rather than accumulate: the rule is 95% HELD, so a run that oscillates across the
      // threshold has not settled and the ten seconds start again.
      heldSince = undefined;
    }

    if (Date.now() - started >= timeoutMs) {
      return done('timeout');
    }

    await page.waitForTimeout(pollIntervalMs);
  }
};

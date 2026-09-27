//
// Copyright 2026 DXOS.org
//

import { next as A } from '@automerge/automerge';
import { type DocumentId, type UrlHeads, encodeHeads } from '@automerge/automerge-repo';

import { type Context } from '@dxos/context';
import {
  type DatabaseDirectory,
  EncodedReference,
  type EntityStructure,
  PROPERTY_ID,
  isEncodedReference,
} from '@dxos/echo-protocol';
import { resolveMergeRedirect } from '@dxos/echo/internal';
import { type EntityMeta, type Referrer } from '@dxos/index-core';
import { EID, type EntityId, type SpaceId } from '@dxos/keys';
import { log } from '@dxos/log';

import { mergeCandidates } from './merge-core.ts';

/**
 * The document surface a merge needs — structurally satisfied by the host's `DocumentLease`
 * (whose disposal the merge honors) and by a bare `DocHandle` in tests.
 */
export type MergeDocumentRef = {
  readonly documentId: DocumentId;
  doc(): A.Doc<DatabaseDirectory>;
  change(callback: A.ChangeFn<DatabaseDirectory>): void;

  /** Forks at `heads`, applies the change, and merges the result back — the creation-heads replay's write. */
  changeAt(
    heads: UrlHeads,
    callback: A.ChangeFn<DatabaseDirectory>,
    options?: A.ChangeOptions<DatabaseDirectory>,
  ): UrlHeads | undefined;
  [Symbol.dispose]?: () => void;
};

/**
 * A referrer document is loaded on the index's say-so alone, so the rewrite path never waits on
 * the network: a document that is not locally available has no local references to rewrite, and a
 * best-effort optimization must not stall the indexing loop. The timeout is a backstop for the
 * local load itself.
 */
const REFERRER_LOAD_OPTIONS = { fetchFromNetwork: false, timeout: 10_000 };

export type ConvergenceKeyMergerDeps = {
  loadDoc: (
    ctx: Context,
    documentId: DocumentId,
    opts?: { timeout?: number; fetchFromNetwork?: boolean },
  ) => Promise<MergeDocumentRef | null>;

  /**
   * Persist a document's pending changes durably. Winner and loser live in different documents
   * with no cross-document write ordering, so the merge flushes the winner's folded data before
   * writing any tombstone whose watermark claims that fold happened.
   */
  flushDoc: (ctx: Context, documentId: DocumentId) => Promise<void>;

  /**
   * Detection point lookup (`IndexEngine.queryByConvergenceKeys`), already bound to the host
   * runtime. Promise-typed so tests can supply rows without a database.
   */
  queryByConvergenceKeys: (spaceId: SpaceId, convergenceKeys: readonly string[]) => Promise<readonly EntityMeta[]>;

  /**
   * Referrers of one entity (`IndexEngine.queryReferrers`) — the point lookup behind reference
   * rewriting. Index rows are derived state; every hit is re-verified against the document before
   * anything is written.
   */
  queryReferrers: (spaceId: SpaceId, targetId: EntityId) => Promise<readonly Referrer[]>;
};

export type ConvergenceKeyMergeResult = {
  /** Duplicate groups that required writes (a merge or a late-edit fold). */
  mergedGroups: number;

  /** Keys serviced to completion, per space — safe to clear from the durable intent log. */
  serviced: Map<SpaceId, Set<string>>;
};

/**
 * Merges convergence-key duplicates surfaced by the indexing intent log — the worker-side trigger.
 *
 * The merge operates on the raw document structures via the storage-independent core in
 * `@dxos/echo/internal`; the writes replicate to clients like any other change, and the
 * `documentsSaved` event re-indexes the tombstones, which is what removes the losers from query
 * results everywhere.
 */
export class ConvergenceKeyMerger {
  readonly #deps: ConvergenceKeyMergerDeps;

  constructor(deps: ConvergenceKeyMergerDeps) {
    this.#deps = deps;
  }

  /**
   * Merge every duplicate group among the given pending keys.
   *
   * Runs after the index engine processes changed documents, which is the earliest a duplicate
   * can exist on this device: duplicates are born from replication, and a replicated write is
   * exactly what lands here. Detection is a point lookup on only the pending keys, so the cost
   * is proportional to writes that carry one — nil for everything else — and no client, query,
   * or full scan is involved.
   *
   * Already-redirected entities that re-index — a straggler peer's late edits replicating onto a
   * tombstone, or a loser resurrected by `db.add` — are serviced too: their post-merge edits are
   * folded into the winner and the tombstone is re-asserted, which is what makes `mergedInto`
   * sticky and the convergence argument hold without any client-side pass.
   *
   * Failure containment: a key whose group throws is reported un-serviced (it stays in the intent
   * log and the next pass retries it) without blocking the rest of the batch. A group member whose
   * document cannot be loaded is merged around — the merge over the loadable subset is safe, and
   * the missing document's eventual arrival is itself an indexed write that re-presents the key.
   */
  async mergeDuplicates(
    ctx: Context,
    convergenceKeys: ReadonlyMap<SpaceId, ReadonlySet<string>>,
  ): Promise<ConvergenceKeyMergeResult> {
    let mergedGroups = 0;
    const serviced = new Map<SpaceId, Set<string>>();
    for (const [spaceId, keys] of convergenceKeys) {
      if (keys.size === 0) {
        continue;
      }

      let rows;
      try {
        rows = await this.#deps.queryByConvergenceKeys(spaceId, [...keys]);
      } catch (err) {
        log.warn('convergence-key detection failed; keys stay pending', { spaceId, keys: keys.size, err });
        continue;
      }

      const groups = new Map<string, { objectId: EntityId; documentId: string }[]>();
      for (const row of rows) {
        if (!row.convergenceKey || !row.documentId) {
          continue;
        }
        const group = groups.get(row.convergenceKey) ?? [];
        if (!group.some(({ objectId }) => objectId === row.objectId)) {
          group.push({ objectId: row.objectId, documentId: row.documentId });
        }
        groups.set(row.convergenceKey, group);
      }

      const servicedKeys = new Set<string>();
      serviced.set(spaceId, servicedKeys);
      for (const convergenceKey of keys) {
        const group = groups.get(convergenceKey);
        if (group === undefined || group.length < 2) {
          // A lone row, or rows that no longer carry the key — nothing to merge.
          servicedKeys.add(convergenceKey);
          continue;
        }
        try {
          if (await this.mergeGroup(ctx, spaceId, convergenceKey, group)) {
            mergedGroups++;
          }
          servicedKeys.add(convergenceKey);
        } catch (err) {
          log.warn('convergence-key merge group failed; will retry', { spaceId, convergenceKey, err });
        }
      }
    }

    if (mergedGroups > 0) {
      log('merged convergence-key duplicates', { groups: mergedGroups });
    }
    return { mergedGroups, serviced };
  }

  /**
   * Merge one convergence-key group: the live candidates fold into the minimum-id winner, and
   * already-redirected members get their late edits folded and their tombstones re-asserted.
   *
   * Public as the unit under test — `mergeDuplicates` adds detection and failure containment
   * around it.
   */
  async mergeGroup(
    ctx: Context,
    spaceId: SpaceId,
    convergenceKey: string,
    group: readonly { objectId: EntityId; documentId: string }[],
  ): Promise<boolean> {
    // Load phase: awaited doc loads, during which replicated changes are free to land — nothing
    // has been read yet. The index row is derived state and can trail the truth, so everything is
    // re-verified against the documents below.
    const handles = new Map<EntityId, MergeDocumentRef>();
    try {
      for (const { objectId, documentId } of group) {
        const handle = await this.#deps.loadDoc(ctx, documentId as DocumentId);
        if (!handle) {
          continue;
        }
        if (handles.has(objectId)) {
          handle[Symbol.dispose]?.();
          continue;
        }
        handles.set(objectId, handle);
      }

      // Classification reads current state, and `#mergeCandidates` computes the merge from these
      // same reads synchronously — replicated changes apply through the event loop, so nothing can
      // land between a read and the write derived from it. `#foldRedirected` re-reads on its own:
      // by the time it runs, awaits inside `#mergeCandidates` may have let changes land — including
      // the redirects the merge itself just wrote, which a fold must follow to their live end.
      const candidates: GroupMember[] = [];
      const redirectedIds: EntityId[] = [];
      for (const [objectId, handle] of handles) {
        const entity = _readEntity(handle, objectId, convergenceKey);
        if (!entity) {
          continue;
        }
        if (entity.system?.mergedInto !== undefined) {
          redirectedIds.push(objectId);
        } else if (!entity.system?.deleted) {
          // A user-deleted entity without a redirect is neither: deletion is respected, not merged.
          candidates.push({ objectId, handle, entity });
        }
      }

      let changed = candidates.length >= 2 && (await this.#mergeCandidates(ctx, spaceId, convergenceKey, candidates));
      for (const objectId of redirectedIds) {
        changed = (await this.#foldRedirected(ctx, spaceId, objectId, handles, convergenceKey)) || changed;
      }
      return changed;
    } finally {
      // Leased documents must be returned or the host keeps them resident forever.
      for (const handle of handles.values()) {
        handle[Symbol.dispose]?.();
      }
    }
  }

  /**
   * Merge live duplicates: fold every loser's state into the minimum-id winner, flush the winner
   * durably, then redirect and tombstone the losers.
   *
   * The member reads, the merge computation, the losers' watermark heads, and the winner write all
   * belong to one synchronous block, so the tombstones' `mergedAtHeads` cover exactly the state
   * the merge folded — an edit landing later is above the watermark and reachable by a later fold.
   * The only await is the durability flush between the winner write and the loser tombstones; the
   * loser callbacks re-verify eligibility after it.
   */
  async #mergeCandidates(
    ctx: Context,
    spaceId: SpaceId,
    convergenceKey: string,
    candidates: readonly GroupMember[],
  ): Promise<boolean> {
    const result = mergeCandidates(
      candidates.map(({ objectId, entity }) => ({
        id: objectId,
        convergenceKey,
        data: (entity.data ?? {}) as Record<string, unknown>,
        keys: entity.meta?.keys,
      })),
    );

    const byId = new Map(candidates.map((member) => [member.objectId, member]));
    const winner = byId.get(result.winner);
    if (!winner) {
      return false;
    }

    // Transitively closed: a loser that already absorbed others hands those on.
    const absorbed = new Set<EntityId>(winner.entity.system?.mergedFrom ?? []);
    for (const loserId of result.losers) {
      absorbed.add(loserId);
      for (const inherited of byId.get(loserId)?.entity.system?.mergedFrom ?? []) {
        absorbed.add(inherited);
      }
    }

    // Watermark heads, captured from the same doc states the merge was computed over.
    const loserHeads = new Map<EntityId, string[]>();
    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      if (loser) {
        loserHeads.set(loserId, A.getHeads(loser.handle.doc()));
      }
    }

    // The change callback runs in the same tick as the reads the merge was computed from, so the
    // re-checks are a backstop against out-of-band mutation, not the concurrency mechanism.
    let applied = false;
    winner.handle.change((doc: DatabaseDirectory) => {
      const entity = doc.objects?.[winner.objectId];
      if (
        !entity ||
        entity.system?.mergedInto !== undefined ||
        entity.system?.deleted ||
        entity.meta?.convergenceKey !== convergenceKey
      ) {
        return;
      }
      // `x ??= y` evaluates to the plain right-hand value, not the proxy the document wraps it in,
      // so every container is re-read through the entity after assignment — mutations on the alias
      // of the right-hand value would go nowhere.
      if (entity.data === undefined) {
        entity.data = {};
      }
      for (const [field, value] of Object.entries(result.data)) {
        // Per-field writes, and only where the value differs, so a concurrent edit to a field the
        // merge never touched keeps its last-write-wins outcome.
        if (!_jsonEqual(entity.data[field], value)) {
          entity.data[field] = _clone(value);
        }
      }
      // Stored meta can predate the `keys` array (the client backfills it on read); the raw document
      // does not.
      if (entity.meta.keys === undefined) {
        entity.meta.keys = [];
      }
      const keys = entity.meta.keys;
      for (const key of result.keys) {
        if (!keys.some((existing) => existing.source === key.source && existing.id === key.id)) {
          keys.push(_clone(key));
        }
      }
      if (entity.system === undefined) {
        entity.system = {};
      }
      // Append to the existing list rather than assigning a new one: concurrent assignments are
      // whole-list conflicts and LWW would drop one peer's ids; concurrent inserts both survive,
      // and reads deduplicate.
      if (entity.system.mergedFrom === undefined) {
        entity.system.mergedFrom = [];
      }
      const mergedFrom = entity.system.mergedFrom;
      for (const id of [...absorbed].sort()) {
        if (!mergedFrom.includes(id)) {
          mergedFrom.push(id);
        }
      }
      applied = true;
    });
    if (!applied) {
      // Tombstoning the losers without having folded their state would strand it.
      return false;
    }

    // Creation-heads replay (M0-REPORT.md item 4): the flat write above is a no-op for every field
    // the winner already defines — trivially true when a migration's fan-out wrote every field on
    // every duplicate — so a loser's unconflicted edit would otherwise vanish without this. Skipped
    // group-wide, falling back to the flat result above, when the winner's own creation heads can't
    // be derived; skipped per-loser when that loser's can't.
    const winnerCreationHeads = deriveCreationHeads(winner.handle.doc(), winner.objectId);
    if (winnerCreationHeads === undefined) {
      log.debug('winner creation heads not found; falling back to the flat merge result', {
        convergenceKey,
        winnerId: winner.objectId,
      });
    } else {
      for (const loserId of result.losers) {
        const loser = byId.get(loserId);
        if (loser) {
          this.#replayLoserEdits(winner, loser, winnerCreationHeads, convergenceKey);
        }
      }
    }

    // Make the fold durable before any tombstone can be: a crash that persists a loser's
    // watermark without the winner's folded data would strand the loser's state below a
    // watermark nothing re-reads.
    await this.#deps.flushDoc(ctx, winner.handle.documentId);

    // The flush is an await — re-read the winner before tombstoning against it. A deletion that
    // replicated in during it is respected: tombstoning the losers under a deleted winner would
    // make every copy invisible. The losers stay live and a later pass re-merges them.
    if (winner.handle.doc()?.objects?.[winner.objectId]?.system?.deleted) {
      return true;
    }

    // Only losers whose redirect was actually written may have their referrers repointed: a loser
    // whose callback declines (re-keyed, deleted, concurrently redirected) carries no redirect of
    // ours, and rewriting refs to a live independent entity would sever them with no way back.
    const redirected = new Map<EntityId, EntityId>();
    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      const heads = loserHeads.get(loserId);
      if (!loser || !heads) {
        continue;
      }
      loser.handle.change((doc: DatabaseDirectory) => {
        const entity = doc.objects?.[loserId];
        // Changes that landed during the flush win: an existing redirect owns the watermark its
        // fold depends on; a changed key means this is no longer the entity that was merged; a
        // deletion is respected, not converted into a redirect.
        if (
          !entity ||
          entity.system?.mergedInto !== undefined ||
          entity.system?.deleted ||
          entity.meta?.convergenceKey !== convergenceKey
        ) {
          return;
        }
        if (entity.system === undefined) {
          entity.system = {};
        }
        entity.system.mergedInto = result.winner;
        entity.system.mergedAtHeads = [...heads];
        entity.system.deleted = true;
        redirected.set(loserId, result.winner);
      });
    }

    // The durability rule's dual: returning marks the key serviced and lets the orchestrator clear
    // its durable intent, so the tombstones must be on disk first — an intent must never die before
    // the tombstone it claims exists.
    const flushedDocs = new Set([winner.handle.documentId]);
    for (const loserId of result.losers) {
      const loser = byId.get(loserId);
      if (loser && !flushedDocs.has(loser.handle.documentId)) {
        flushedDocs.add(loser.handle.documentId);
        await this.#deps.flushDoc(ctx, loser.handle.documentId);
      }
    }

    log('merged group', { convergenceKey, winner: result.winner, losers: result.losers });

    // References to the losers repoint at the winner now that the tombstones exist. Outside the
    // durability guarantee by design: resolution follows the redirect regardless, so this is an
    // optimization plus the compat path for clients too old to follow `mergedInto`.
    if (redirected.size > 0) {
      const groupHandles = new Map([...byId].map(([objectId, member]) => [objectId, member.handle]));
      await this.#rewriteReferences(ctx, spaceId, redirected, groupHandles);
    }
    return true;
  }

  /**
   * Replay `loser`'s edits since ITS OWN creation onto `winner`'s document at `winner`'s creation
   * heads (M0-REPORT.md "the final design" item 4, prototyped in `fan-out-engine.test.ts` /
   * `text.test.ts`).
   *
   * Each duplicate lives in its own document (confirmed empirically in E5a), so its creation heads
   * are a real baseline: diffing the loser from them (`deriveCreationHeads`) names exactly its
   * post-creation edits. Replaying those at the winner's own creation heads lands them concurrent
   * with whatever the winner itself wrote since its own creation — a clean fast-forward when the
   * winner never touched the field, a real Automerge register conflict (`A.getConflicts`) when it
   * did, on every peer identically. Text fields replay their splice/del patches character-wise
   * (`text.test.ts` Ta1/Tb1) instead of the whole-value copy scalar fields get, and only when both
   * copies' creation-time text agrees — a divergent baseline misaligns every offset and corrupts the
   * winner (Tb2), so a mismatch is skipped and logged rather than risked.
   *
   * The change `message` doubles as the idempotence marker (no new persisted field): a loser already
   * tagged `merge-replay: <loserId>` in the winner's own history has nothing left to do, so a retried
   * pass — the crash window between this write's flush and the loser's tombstone, the only way
   * `#mergeCandidates` can see the same live candidate twice — is a genuine no-op rather than a
   * duplicated conflict alternative or, for text, a duplicated splice.
   */
  #replayLoserEdits(
    winner: GroupMember,
    loser: GroupMember,
    winnerCreationHeads: string[],
    convergenceKey: string,
  ): void {
    const message = _replayMessageFor(loser.objectId);
    if (_hasReplayMarker(winner.handle.doc(), loser.objectId)) {
      return;
    }

    const loserDoc = loser.handle.doc();
    const loserCreationHeads = deriveCreationHeads(loserDoc, loser.objectId);
    if (loserCreationHeads === undefined) {
      log.debug('loser creation heads not found; keeping the flat merge result for this loser', {
        convergenceKey,
        loserId: loser.objectId,
      });
      return;
    }
    const loserCurrentHeads = A.getHeads(loserDoc);
    if (_headsEqual(loserCreationHeads, loserCurrentHeads)) {
      return; // The loser never edited anything after its own creation — nothing to replay.
    }

    const prefix = ['objects', loser.objectId, 'data'];
    const fieldPatches = new Map<string, A.Patch[]>();
    for (const patch of A.diff(loserDoc, loserCreationHeads, loserCurrentHeads)) {
      if (patch.path.length <= prefix.length || !prefix.every((key, index) => patch.path[index] === key)) {
        continue;
      }
      const field = String(patch.path[prefix.length]);
      if (field === PROPERTY_ID) {
        continue;
      }
      const forField = fieldPatches.get(field) ?? [];
      forField.push(patch);
      fieldPatches.set(field, forField);
    }
    if (fieldPatches.size === 0) {
      return;
    }

    const loserData = loser.entity.data ?? {};
    const scalarFields: string[] = [];
    const textPatchesByField = new Map<string, (A.SpliceTextPatch | A.DelPatch)[]>();
    for (const [field, patches] of fieldPatches) {
      // A whole-value reassignment recreates the text container (a `put` recreating an empty one,
      // even for a scalar register write — `text.test.ts` Ta0) before any splice, so a field is a
      // genuine incremental text edit — safe for character-wise replay — only when EVERY patch since
      // the loser's creation is a splice/del; one `put` anywhere means "replaced", not "edited", and
      // the field is replayed as a whole-value scalar copy like today's flat merge.
      const isPureTextEdit =
        patches.length > 0 && patches.every((patch) => patch.action === 'splice' || patch.action === 'del');
      if (!isPureTextEdit) {
        scalarFields.push(field);
        continue;
      }
      const textPatches = patches.filter(
        (patch): patch is A.SpliceTextPatch | A.DelPatch => patch.action === 'splice' || patch.action === 'del',
      );
      const winnerBaseline = _valueAt(winner.handle.doc(), winner.objectId, field, winnerCreationHeads);
      const loserBaseline = _valueAt(loserDoc, loser.objectId, field, loserCreationHeads);
      if (typeof winnerBaseline === 'string' && winnerBaseline === loserBaseline) {
        textPatchesByField.set(field, textPatches);
      } else {
        log.debug('skipping text replay across mismatched creation baselines', {
          convergenceKey,
          loserId: loser.objectId,
          field,
        });
      }
    }
    if (scalarFields.length === 0 && textPatchesByField.size === 0) {
      return;
    }

    winner.handle.changeAt(
      encodeHeads(winnerCreationHeads),
      (doc: DatabaseDirectory) => {
        const entity = doc.objects?.[winner.objectId];
        if (!entity) {
          return;
        }
        if (entity.data === undefined) {
          entity.data = {};
        }
        for (const field of scalarFields) {
          const value = loserData[field];
          if (value === undefined) {
            delete entity.data[field];
          } else {
            entity.data[field] = _clone(value);
          }
        }
        for (const [field, textPatches] of textPatchesByField) {
          const path = ['objects', winner.objectId, 'data', field];
          for (const patch of textPatches) {
            const offset = patch.path.at(-1);
            if (typeof offset !== 'number') {
              continue;
            }
            if (patch.action === 'splice') {
              A.splice(doc, path, offset, 0, patch.value);
            } else {
              A.splice(doc, path, offset, patch.length ?? 1);
            }
          }
        }
      },
      { message },
    );
  }

  /**
   * Service an already-redirected entity: fold data edits made since its recorded watermark into
   * the surviving entity, and re-assert the tombstone.
   *
   * This is what makes the redirect durable. A peer offline during the merge keeps editing its
   * copy; those edits replicate onto the tombstone, re-index it, and land here — re-running the
   * field-wise merge could not rescue them (it prefers the smallest-id candidate, the winner).
   * And `db.add` un-deletes, so a restored loser would otherwise be a live duplicate that
   * detection ignores forever; re-tombstoning makes `mergedInto` sticky, with the restore's edits
   * carried to the winner by the same fold.
   *
   * Redirect resolution, the diff, the folded values, and the watermark all read the documents'
   * current state in one synchronous block: the fold can never write a value older than the heads
   * it advances the watermark to, and a redirect chain that collapsed earlier in this same pass is
   * followed to its live end. The watermark advances only when the fold write actually applied —
   * otherwise the edits stay above it for a later pass.
   */
  async #foldRedirected(
    ctx: Context,
    spaceId: SpaceId,
    loserId: EntityId,
    handles: ReadonlyMap<EntityId, MergeDocumentRef>,
    convergenceKey: string,
  ): Promise<boolean> {
    const handle = handles.get(loserId);
    const doc = handle?.doc();
    const entity = doc?.objects?.[loserId];
    const mergedInto = entity?.system?.mergedInto;
    if (!handle || !doc || !entity || mergedInto === undefined || entity.meta?.convergenceKey !== convergenceKey) {
      return false;
    }
    const mergedAtHeads = _watermarkUnion(entity);

    const winnerId = resolveMergeRedirect(loserId, (id) => handles.get(id)?.doc()?.objects?.[id]?.system?.mergedInto);
    const winnerHandle = winnerId !== loserId ? handles.get(winnerId) : undefined;
    const winnerEntity = winnerHandle?.doc()?.objects?.[winnerId];
    // The chain's end must be live to fold into. Deleted → the edits wait above the watermark
    // until the winner is restored; still redirected (a non-decreasing edge stopped the walk) →
    // corrupt data, leave it alone.
    const winnerLive =
      winnerEntity !== undefined && winnerEntity.system?.mergedInto === undefined && !winnerEntity.system?.deleted;

    const currentHeads = A.getHeads(doc);
    let changedFields: string[] = [];
    if (mergedAtHeads !== undefined && winnerLive) {
      const prefix = ['objects', loserId, 'data'];
      const changed = new Set<string>();
      for (const patch of A.diff(doc, mergedAtHeads, currentHeads)) {
        if (patch.path.length > prefix.length && prefix.every((key, index) => patch.path[index] === key)) {
          changed.add(String(patch.path[prefix.length]));
        }
      }
      changedFields = [...changed].filter((field) => field !== PROPERTY_ID);
    }

    let applied = false;
    if (changedFields.length > 0 && winnerHandle !== undefined) {
      const loserData = (entity.data ?? {}) as Record<string, unknown>;
      winnerHandle.change((target: DatabaseDirectory) => {
        const targetEntity = target.objects?.[winnerId];
        if (!targetEntity || targetEntity.system?.mergedInto !== undefined || targetEntity.system?.deleted) {
          return;
        }
        if (targetEntity.data === undefined) {
          targetEntity.data = {};
        }
        for (const field of changedFields) {
          const value = loserData[field];
          if (value === undefined) {
            delete targetEntity.data[field];
          } else if (!_jsonEqual(targetEntity.data[field], value)) {
            targetEntity.data[field] = _clone(value);
          }
        }
        applied = true;
      });
    }

    if (applied && winnerHandle !== undefined) {
      // Durability order, as in `#mergeCandidates`: a watermark must never outlive the fold it
      // claims happened.
      await this.#deps.flushDoc(ctx, winnerHandle.documentId);
    }

    const needsTombstone = entity.system?.deleted !== true;
    if (applied || needsTombstone) {
      handle.change((target: DatabaseDirectory) => {
        const targetEntity = target.objects?.[loserId];
        // A concurrent redirect elsewhere owns the watermark now; leave it to that merge's fold.
        if (!targetEntity || targetEntity.system === undefined || targetEntity.system.mergedInto !== mergedInto) {
          return;
        }
        if (applied) {
          // Advance the watermark so the same edit is never folded twice.
          targetEntity.system.mergedAtHeads = [...currentHeads];
        }
        targetEntity.system.deleted = true;
      });
      // The durability rule's dual, as in `#mergeCandidates`: the watermark advance and re-asserted
      // tombstone must be on disk before the intent that claims this fold happened can be cleared.
      await this.#deps.flushDoc(ctx, handle.documentId);
      log('serviced redirected entity', {
        loserId,
        winnerId,
        foldedFields: applied ? changedFields : [],
        tombstoneReasserted: needsTombstone,
      });
    }

    // Even a pass with nothing to fold re-covers referrers: a loser re-indexing is the only signal
    // that re-presents the key, so this is where late referrers (§4.11's freshness residual) catch
    // up. Idempotent — a rewritten referrer re-indexes with rows naming the winner, so the loser's
    // steady-state lookup is empty and no documents are loaded.
    if (winnerLive) {
      await this.#rewriteReferences(ctx, spaceId, new Map([[loserId, winnerId]]), handles);
    }
    return applied || needsTombstone;
  }

  /**
   * Repoint references at merged-away losers to their winners, index-driven: the reverse-reference
   * index names each referrer and the property holding the ref, so every rewrite is a point load —
   * no scan, no client, no hydration. A referrer holding refs to several losers is loaded and
   * written once, covering all of them.
   *
   * Best-effort by design (see §4.11): a ref that stays behind still resolves through the redirect,
   * and the loser's next re-index re-presents the work — so every failure surface here, the write
   * included, is logged and swallowed, and no flush is ordered. A throw escaping this method would
   * mark the key un-serviced and wedge the intent on permanent retry, which a non-load-bearing
   * optimization must never do. The reference's own spelling (local or space-qualified) is
   * preserved; the index restricts rows to same-space referrers with a document.
   */
  async #rewriteReferences(
    ctx: Context,
    spaceId: SpaceId,
    redirects: ReadonlyMap<EntityId, EntityId>,
    handles: ReadonlyMap<EntityId, MergeDocumentRef>,
  ): Promise<void> {
    // One batch entry per referrer object, accumulating the rewrites every loser asks of it.
    type ReferrerBatch = {
      referrer: Referrer;
      rewrites: { loserId: EntityId; winnerId: EntityId; propPaths: Referrer['propPaths'] }[];
    };
    const batches = new Map<string, ReferrerBatch>();
    for (const [loserId, winnerId] of redirects) {
      let referrers: readonly Referrer[];
      try {
        referrers = await this.#deps.queryReferrers(spaceId, loserId);
      } catch (err) {
        log.warn('referrer lookup failed; references stay on the redirect', { spaceId, loserId, err });
        continue;
      }
      for (const referrer of referrers) {
        if (referrer.propPaths.length === 0) {
          continue;
        }
        const key = `${referrer.documentId}/${referrer.objectId}`;
        const batch = batches.get(key) ?? { referrer, rewrites: [] };
        batch.rewrites.push({ loserId, winnerId, propPaths: referrer.propPaths });
        batches.set(key, batch);
      }
    }

    for (const { referrer, rewrites } of batches.values()) {
      try {
        // A group member (the winner included) is already loaded; reuse its lease rather than
        // taking a second one — but only when the lease holds the document the index row names.
        const shared = handles.get(referrer.objectId);
        const reusable = shared !== undefined && shared.documentId === referrer.documentId;
        const handle = reusable
          ? shared
          : ((await this.#deps.loadDoc(ctx, referrer.documentId as DocumentId, REFERRER_LOAD_OPTIONS)) ?? undefined);
        if (!handle) {
          continue;
        }
        try {
          const rewritten: string[] = [];
          handle.change((doc: DatabaseDirectory) => {
            const entity = doc.objects?.[referrer.objectId];
            // A merged-away referrer is left alone: a write would land above its own fold
            // watermark and be carried into its winner as if it were a straggler's edit. A
            // plain-deleted referrer is also left alone — if it is restored, the loser's next
            // re-index re-covers it.
            if (!entity || entity.system?.mergedInto !== undefined || entity.system?.deleted || !entity.data) {
              return;
            }
            for (const { loserId, winnerId, propPaths } of rewrites) {
              for (const path of propPaths) {
                if (_rewriteReferenceAt(entity.data as Record<string, unknown>, path, loserId, winnerId)) {
                  rewritten.push(path.join('.'));
                }
              }
            }
          });
          if (rewritten.length > 0) {
            log('rewrote references', { referrer: referrer.objectId, paths: rewritten });
          }
        } finally {
          if (!reusable) {
            handle[Symbol.dispose]?.();
          }
        }
      } catch (err) {
        log.warn('referrer rewrite failed; references stay on the redirect', { referrer: referrer.objectId, err });
      }
    }
  }
}

type GroupMember = {
  objectId: EntityId;
  handle: MergeDocumentRef;

  /** Current entity state, read in the same synchronous block as the merge computed from it. */
  entity: EntityStructure;
};

/**
 * Read an entity's current state, or `undefined` when it is not a merge subject for this key.
 *
 * Objects only: relations and types index as document entities too, but merging a relation would
 * tombstone it without reconciling its endpoints, and merging a type would break schema
 * resolution for its instances. The kind is read leniently — throwing here would wedge the
 * indexing loop on one corrupt entity.
 */
const _readEntity = (
  handle: MergeDocumentRef,
  objectId: EntityId,
  convergenceKey: string,
): EntityStructure | undefined => {
  const entity = handle.doc()?.objects?.[objectId];
  if (!entity || (entity.system?.kind ?? 'object') !== 'object' || entity.meta?.convergenceKey !== convergenceKey) {
    return undefined;
  }
  return entity;
};

/** The change `message` a creation-heads replay writes and later looks for — see `#replayLoserEdits`. */
const _replayMessageFor = (loserId: EntityId): string => `merge-replay: ${loserId}`;

/**
 * Whether `doc` already carries a replay for `loserId` — the idempotence check that lets a retried
 * `#mergeCandidates` (the crash window between the replay's flush and the loser's tombstone) skip
 * straight to re-tombstoning instead of writing a duplicate conflict alternative or splice.
 */
const _hasReplayMarker = (doc: A.Doc<DatabaseDirectory>, loserId: EntityId): boolean => {
  const message = _replayMessageFor(loserId);
  return A.getChangesMetaSince(doc, []).some((meta) => meta.message === message);
};

/**
 * Derives an entity's creation heads from its OWN document history: the frontier right after the
 * earliest change whose diff touches `objects.<objectId>` — the change that created its entry.
 *
 * No new persisted field: an ECHO object's document keeps its full change history (no compaction
 * that would discard it — epochs, the one mechanism that would, are out of scope per M0-REPORT.md
 * item 8), so this is always derivable from what the document already carries. The scan is the same
 * frontier-accumulation idiom `getObjectChanges` (`echo-client/src/echo-handler/edit-history.ts`)
 * uses to walk a document's history in topological order. It is robust to both layouts a candidate's
 * document can have: for the common case (confirmed empirically in `fan-out-engine.test.ts` E5a) of
 * one object per document, the object's entry is created in the document's very first change, so the
 * loop returns after one iteration; a multi-object document (or one that held a different object
 * first) is handled identically, by walking forward until this object's id first appears.
 */
export const deriveCreationHeads = (doc: A.Doc<DatabaseDirectory>, objectId: EntityId): string[] | undefined => {
  let frontier: string[] = [];
  for (const meta of A.getChangesMetaSince(doc, [])) {
    const previous = frontier;
    frontier = [...previous.filter((hash) => !meta.deps.includes(hash)), meta.hash].sort();
    const patches = A.diff(doc, previous, frontier);
    if (patches.some((patch) => patch.path[0] === 'objects' && patch.path[1] === objectId)) {
      return frontier;
    }
  }
  return undefined;
};

/** The value of `objectId`'s `field` as of `heads`, read from a historical view (never the live proxy). */
const _valueAt = (doc: A.Doc<DatabaseDirectory>, objectId: EntityId, field: string, heads: string[]): unknown => {
  const view = A.view(doc, heads);
  return view.objects?.[objectId]?.data?.[field];
};

/** Set-equality of two head frontiers, order-independent — heads are unordered by construction. */
const _headsEqual = (a: readonly string[], b: readonly string[]): boolean =>
  [...a].sort().join(',') === [...b].sort().join(',');

/**
 * The effective fold watermark: the stored `mergedAtHeads` unioned with every conflicting value
 * of that register.
 *
 * Peers merging the same group concurrently each record their own watermark; automerge keeps one
 * as the register value and the rest as conflicts. Diffing from the union means an edit *any*
 * peer already folded is never re-presented — a re-fold from a stale surviving watermark would
 * write the loser's old value over a newer edit made on the winner since.
 */
const _watermarkUnion = (entity: EntityStructure): string[] | undefined => {
  const system = entity.system;
  const stored = system?.mergedAtHeads;
  if (system === undefined || stored === undefined) {
    return undefined;
  }
  const hashes = new Set<string>();
  const collect = (value: unknown): void => {
    if (Array.isArray(value)) {
      for (const hash of value) {
        if (typeof hash === 'string') {
          hashes.add(hash);
        }
      }
    }
  };
  collect(stored);
  for (const conflicting of Object.values(A.getConflicts(system, 'mergedAtHeads') ?? {})) {
    collect(conflicting);
  }
  return [...hashes];
};

/**
 * Rewrite the reference at one indexed property path from `loserId` to `winnerId`, preserving the
 * reference's own spelling (a space-qualified ref stays qualified). Returns whether a write
 * happened. The index row can trail the document, so a path that no longer holds a ref to the
 * loser — moved, deleted, already rewritten — is a silent no-op.
 */
const _rewriteReferenceAt = (
  data: Record<string, unknown>,
  path: readonly string[],
  loserId: EntityId,
  winnerId: EntityId,
): boolean => {
  if (path.length === 0) {
    return false;
  }
  let container: unknown = data;
  for (const segment of path.slice(0, -1)) {
    if (typeof container !== 'object' || container === null) {
      return false;
    }
    container = (container as Record<string, unknown>)[segment];
  }
  if (typeof container !== 'object' || container === null) {
    return false;
  }
  const leafKey = path[path.length - 1];
  const value = (container as Record<string, unknown>)[leafKey];
  if (!isEncodedReference(value)) {
    return false;
  }
  const uri = EID.tryParse(EncodedReference.toURI(value));
  if (uri === undefined || EID.getEntityId(uri) !== loserId) {
    return false;
  }
  (container as Record<string, unknown>)[leafKey] = EncodedReference.fromURI(
    EID.make({ spaceId: EID.getSpaceId(uri), entityId: winnerId }),
  );
  return true;
};

/**
 * Deep-copies a value read from one automerge document so it can be inserted into another —
 * materialized automerge values may be proxied, and a document must not hold another's nodes.
 */
const _clone = <T>(value: T): T => {
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Uint8Array) {
    return new Uint8Array(value) as T;
  }
  // Long strings are stored as unmergeable raw strings; the generic branch would flatten one
  // into a `{ val }` map — silent corruption of the field.
  if (value instanceof A.RawString) {
    return new A.RawString(value.val) as T;
  }
  if (Array.isArray(value)) {
    return value.map(_clone) as T;
  }
  return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, _clone(entry)])) as T;
};

/**
 * Structural equality good enough for the write-only-if-different guard: a false negative costs
 * one redundant (idempotent) write, never a wrong value.
 */
const _jsonEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) {
    return true;
  }
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
};

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Database, Obj, Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { Kanban } from '@dxos/plugin-kanban/types';
import { Expando } from '@dxos/schema';

import { TRELLO_SOURCE } from '../constants';
import { type TrelloCard, type TrelloList } from '../services/trello-api';

/** Pull reconcile result. */
export type ReconcileResult = {
  added: number;
  updated: number;
  removed: number;
  /**
   * Set of local Obj.IDs of every item pull made authoritative this pass — every match
   * against a remote card (whether or not fields actually changed) plus every newly-created
   * card plus every newly-soft-closed card. Push reads this to avoid bouncing remote-sourced
   * data back to Trello within the same run.
   */
  touchedByPull: Set<string>;
};

/**
 * Mapped fields written to each Expando from its remote Trello card. Anything outside
 * this list (user-added properties like `priority`, `tags`, etc.) is preserved across
 * syncs — we only ever read/write these five.
 */
const MAPPED_FIELDS = ['name', 'description', 'listName', 'url', 'closed'] as const;

/**
 * Pull reconciler. Given a Kanban (items-variant) and the latest Trello state for its
 * remote board, upserts Expando cards (find-or-create by foreign key, write the five
 * mapped fields only) and soft-closes ones absent remotely.
 *
 * Conflict policy: **remote wins** on the mapped fields. ECHO doesn't expose a
 * per-object `updatedAt` we can compare against the previous successful sync, so we
 * can't distinguish "user edited locally" from "we wrote during last pull". A user
 * editing `name`/`description`/`listName`/`closed`/`url` between syncs will see their
 * edit overwritten by the next pull. User-added fields outside `MAPPED_FIELDS` are
 * never touched.
 *
 * Idempotency: indexes existing items by foreign key. Re-running on identical inputs
 * produces no duplicates and no writes (field-equality skip).
 *
 * Push-back to Trello is implemented in a separate pass (`pushBoardCards`). The
 * `touchedByPull` set returned here is the bridge between the two passes.
 */
export const reconcileBoardCards: (
  kanban: Kanban.Kanban,
  remoteCards: ReadonlyArray<TrelloCard>,
  lists: ReadonlyArray<TrelloList>,
) => Effect.Effect<ReconcileResult, never, Database.Service> = Effect.fn('reconcileBoardCards')(function* (
  kanban,
  remoteCards,
  lists,
) {
  if (!Kanban.isKanbanItems(kanban)) {
    // The integration mechanism only ever creates items-variant Kanbans for Trello.
    // If something else gets through here it's a programmer error; bail without changes.
    return { added: 0, updated: 0, removed: 0, touchedByPull: new Set<string>() };
  }
  const itemsSpec = kanban.spec;

  const listName = (idList: string): string => lists.find((l) => l.id === idList)?.name ?? '';

  // Index already-linked items by their Trello foreign id.
  const localByForeignId = new Map<string, Obj.Unknown>();
  for (const ref of itemsSpec.items) {
    const target = ref.target;
    if (!target) continue;
    const fid = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
    if (fid) localByForeignId.set(fid, target);
  }

  const touchedByPull = new Set<string>();
  const newRefs: Array<Ref.Ref<Obj.Unknown>> = [];
  let added = 0;
  let updated = 0;

  for (const card of remoteCards) {
    const desired = {
      name: card.name,
      description: card.desc,
      listName: listName(card.idList),
      url: card.url,
      closed: card.closed,
    };

    const existing = localByForeignId.get(card.id);
    if (existing) {
      // Equality-skip: avoid bumping ECHO's internal `updatedAt` when nothing changed.
      const fields = existing as unknown as Record<string, unknown>;
      const allEqual = MAPPED_FIELDS.every((k) => fields[k] === (desired as Record<string, unknown>)[k]);
      if (!allEqual) {
        Obj.change(existing, (existing) => {
          const m = existing as unknown as Record<string, unknown>;
          for (const k of MAPPED_FIELDS) {
            m[k] = (desired as Record<string, unknown>)[k];
          }
        });
        updated++;
      }
      // Whether or not we wrote, the remote-known item is pull's territory for this run.
      touchedByPull.add(Obj.getDXN(existing).toString());
    } else {
      // No existing local item — create + attach.
      const obj = Obj.make(Expando.Expando, {
        [Obj.Meta]: { keys: [{ source: TRELLO_SOURCE, id: card.id }] },
        ...desired,
      });
      const persisted = yield* Database.add(obj);
      newRefs.push(Ref.make(persisted) as Ref.Ref<Obj.Unknown>);
      touchedByPull.add(Obj.getDXN(persisted).toString());
      added++;
    }
  }

  // Soft-close: cards present locally with a Trello foreign id that aren't in the
  // remote response. Tombstones stay in `kanban.spec.items` to preserve arrangement;
  // they're filtered out at render time by `useItemsProjection` / `ItemsKanbanContainer`.
  const remoteIds = new Set(remoteCards.map((c) => c.id));
  let removed = 0;
  for (const [fid, target] of localByForeignId) {
    if (remoteIds.has(fid)) continue;
    const wasClosed = (target as unknown as Record<string, unknown>).closed === true;
    if (!wasClosed) {
      Obj.change(target, (target) => {
        (target as unknown as Record<string, unknown>).closed = true;
      });
      removed++;
    }
    // Tombstoned (whether by us now or in a prior run) — pull owns it, push must skip.
    touchedByPull.add(Obj.getDXN(target).toString());
  }

  // Append newly-attached refs onto kanban.spec.items.
  if (newRefs.length > 0) {
    Obj.change(kanban, (kanban) => {
      const m = kanban as Obj.Mutable<typeof kanban>;
      if (m.spec.kind === 'items') {
        m.spec.items = [...(m.spec.items as ReadonlyArray<Ref.Ref<Obj.Unknown>>), ...newRefs];
      }
    });
  }

  return { added, updated, removed, touchedByPull };
});

/** Push reconcile result. */
export type PushResult = {
  created: number;
  updated: number;
};

/**
 * Push reconciler. Iterates `kanban.spec.items` and pushes locally-created cards
 * back to Trello.
 *
 * What actually gets pushed (given that pull runs first and populates `touchedByPull`):
 *  - Cards WITHOUT a Trello foreign key — locally created, never seen by Trello. POST.
 *  - In principle, cards in `items` whose foreign key is missing from `touchedByPull`
 *    would be PUT — but in steady state every remote-known card is in `touchedByPull`
 *    (added by pull) and every soft-closed card is too, so the PUT branch is only
 *    reached for orphaned items (foreign key set, no remote counterpart, not yet
 *    soft-closed). That's a defensive belt; in practice push is mostly creates.
 *
 * Tombstones (`closed === true`) are NEVER pushed. Pull marks a card `closed` when
 * its foreign id vanishes from Trello's response (e.g. the card was deleted upstream);
 * pushing that state back hits a 404 and bounces. So `closed` is a local-display
 * tombstone, not a sync intent.
 */
export const pushBoardCards = Effect.fn('pushBoardCards')(function* <R>(
  kanban: Kanban.Kanban,
  lists: ReadonlyArray<TrelloList>,
  touchedByPull: ReadonlySet<string>,
  push: {
    /** Wraps `trelloApi.createCard` so the reconciler stays HTTP-agnostic. */
    create: (input: { listId: string; name: string; desc: string }) => Effect.Effect<{ id: string }, Error, R>;
    /** Wraps `trelloApi.updateCard`. */
    update: (
      foreignId: string,
      input: { name: string; desc: string; listId: string | undefined },
    ) => Effect.Effect<void, Error, R>;
  },
) {
  if (kanban.spec.kind !== 'items') {
    return { created: 0, updated: 0 };
  }
  const itemsSpec = kanban.spec;

  const listIdByName = new Map(lists.map((l) => [l.name, l.id]));

  let created = 0;
  let updated = 0;

  for (const ref of itemsSpec.items) {
    const target = ref.target;
    if (!target) continue;
    const itemKey = Obj.getDXN(target).toString();
    if (touchedByPull.has(itemKey)) continue;

    const fields = target as unknown as Record<string, unknown>;
    // Tombstones don't get pushed (see function comment).
    if (fields.closed === true) continue;

    const foreignId = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
    const name = typeof fields.name === 'string' ? fields.name : '';
    const desc = typeof fields.description === 'string' ? fields.description : '';
    const listName = typeof fields.listName === 'string' ? fields.listName : undefined;
    const listId = listName ? listIdByName.get(listName) : undefined;

    // Warn — but proceed — when a `listName` is set but doesn't resolve to a
    // remote list. Trello will keep the card in its current list, which can
    // surprise users editing locally. Surfacing this as a log helps debugging
    // without breaking the rest of the sync.
    if (listName && !listId) {
      log.warn('trello push: listName has no matching remote list; card will not move', {
        cardId: Obj.getDXN(target).toString(),
        listName,
      });
    }

    if (!foreignId) {
      // Locally-created card. Need a list to put it in; if we can't resolve one, skip.
      if (!listId) continue;
      const result = yield* push.create({ listId, name, desc });
      // Re-read foreign keys before writing — if a concurrent run wrote one already,
      // skip the local FK write so we don't end up with two FK entries on this object.
      // CAVEAT: this only protects the *local* write. Two concurrent pushes that both
      // POST will create two distinct remote cards; the second writeback is dropped
      // here but the orphaned remote card persists. Concurrency control (UI button
      // disable, scheduled-sync mutex) lives a layer above and is the real defense;
      // Trello's REST API doesn't accept an idempotency key for `POST /cards`.
      const current = Obj.getMeta(target).keys.find((k) => k.source === TRELLO_SOURCE)?.id;
      if (!current) {
        Obj.change(target, (target) => {
          Obj.deleteKeys(target, TRELLO_SOURCE);
          Obj.getMeta(target).keys.push({ source: TRELLO_SOURCE, id: result.id });
        });
        created++;
      }
    } else {
      // Pre-existing card with a foreign key, not closed. Push current local state.
      yield* push.update(foreignId, { name, desc, listId });
      updated++;
    }
  }

  return { created, updated };
});

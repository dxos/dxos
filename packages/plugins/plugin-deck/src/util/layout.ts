//
// Copyright 2024 DXOS.org
//

import { produce } from 'immer';

import { DeckSchema } from '#types';

/** Where {@link addSubjectsToActiveDeck} puts the subjects it is given. */
export type AddSubjectsToActiveDeckOptions = {
  /** Insert opened subjects immediately after this plank (in-plank navigation anchors at its origin). */
  pivotId?: string;
  /** A plank the first subject takes the place of, instead of inserting. */
  replaceId?: string;
};

/**
 * Computes the next `active` list for an `'add'` disposition {@link LayoutOperation.Open}: inserts
 * subjects immediately after `pivotId` when present, else appends them at the end. Subjects already
 * open keep their position; `replaceId` is replaced in place by the first subject so the deck reuses it
 * rather than growing.
 */
export const addSubjectsToActiveDeck = (
  active: readonly string[],
  subject: readonly string[],
  options?: AddSubjectsToActiveDeckOptions,
): string[] => {
  const { pivotId, replaceId } = options ?? {};
  const next = [...active];
  const pivotIndex = pivotId ? next.indexOf(pivotId) : -1;
  let insertAt = pivotIndex !== -1 ? pivotIndex + 1 : next.length;
  const replaceIndex = replaceId ? next.indexOf(replaceId) : -1;
  subject.forEach((entryId, index) => {
    const openIndex = next.indexOf(entryId);
    if (index === 0 && replaceIndex !== -1) {
      if (openIndex !== -1) {
        // Already open, so it keeps its own place and `replaceId` stays where it is.
        insertAt = openIndex + 1;
      } else {
        next[replaceIndex] = entryId;
        insertAt = replaceIndex + 1;
      }
      return;
    }

    if (openIndex !== -1) {
      return;
    }

    next.splice(insertAt, 0, entryId);
    insertAt += 1;
  });
  return next;
};

/** The deck without `entryId`, unchanged when it holds no such plank. */
export const closeEntry = (deck: string[], entryId: string): string[] => {
  return produce(deck, (draft) => {
    const index = draft.findIndex((id) => id === entryId);
    if (index !== -1) {
      draft.splice(index, 1);
    }
  });
};

/** The deck with one plank moved a place towards the start or the end. */
export const incrementPlank = (deck: string[], adjustment: DeckSchema.DeckAction.Adjustment): string[] => {
  return produce(deck, (draft) => {
    const index = draft.findIndex((id) => id === adjustment.id);
    if (
      index === -1 ||
      (adjustment.type === 'increment-start' && index === 0) ||
      (adjustment.type === 'increment-end' && index === draft.length - 1)
    ) {
      return;
    }

    if (adjustment.type === 'increment-start') {
      // Swap the current item with the previous item.
      [draft[index - 1], draft[index]] = [draft[index], draft[index - 1]];
    } else if (adjustment.type === 'increment-end') {
      // Swap the current item with the next item.
      [draft[index], draft[index + 1]] = [draft[index + 1], draft[index]];
    }
  });
};

const DETAIL_NAME_PREFIX = 'detail:';

/** The plank name `owner`'s detail holds: opening a detail of `owner` is a named open under it. */
export const detailName = (owner: string): string => `${DETAIL_NAME_PREFIX}${owner}`;

/** The details hanging off `id`, nearest first: its detail, that detail's detail, and so on. */
export const detailChain = (names: Readonly<Record<string, string>>, id: string): string[] => {
  const chain: string[] = [];
  const seen = new Set([id]);
  for (let next = names[detailName(id)]; next && !seen.has(next); next = names[detailName(next)]) {
    chain.push(next);
    seen.add(next);
  }
  return chain;
};

/**
 * The plank names still in use: a name whose holder is open, and every detail name an open plank
 * reaches. The rest belong to planks that closed.
 */
export const prunePlankNames = (
  names: Readonly<Record<string, string>>,
  active: readonly string[],
): Record<string, string> => {
  const kept = Object.fromEntries(
    Object.entries(names).filter(([name, holder]) => !name.startsWith(DETAIL_NAME_PREFIX) && active.includes(holder)),
  );
  for (const id of active) {
    let owner = id;
    for (const detail of detailChain(names, id)) {
      kept[detailName(owner)] = detail;
      owner = detail;
    }
  }
  return kept;
};

/** `names` with `id` no longer anyone's detail, so closing its owner leaves it open. */
export const detachDetail = (names: Readonly<Record<string, string>>, id: string): Record<string, string> =>
  Object.fromEntries(
    Object.entries(names).filter(([name, holder]) => !(name.startsWith(DETAIL_NAME_PREFIX) && holder === id)),
  );

/** `names` with `detail` as `owner`'s detail; the chain hanging off its previous detail is dropped. */
export const setDetail = (
  names: Readonly<Record<string, string>>,
  owner: string,
  detail: string,
): Record<string, string> => {
  if (names[detailName(owner)] === detail) {
    return { ...names };
  }
  const next = { ...names };
  for (const id of detailChain(names, owner)) {
    delete next[detailName(id)];
  }
  next[detailName(owner)] = detail;
  return next;
};

export type DetailOpen = {
  next: string[];
  plankNames: Record<string, string>;
  /** The flattened deck shows the detail beside its main plank rather than as a plank of its own. */
  inCompanion: boolean;
  /** The plank the new detail took the place of. */
  replacedId?: string;
};

/**
 * Where a `'detail'` open of `subject` as `pivot`'s detail leaves the deck, or `undefined` when the
 * pivot is not open (the caller falls back to an ordinary add).
 *
 * - Flattened: the detail of the main plank shows in the companion. A detail opened from the detail in
 *   the companion moves that one into the main plank (the breadcrumb grows) and takes the companion.
 * - Otherwise (and on a mobile stack): the detail is a plank beside its pivot that replaces the pivot's
 *   previous detail; that one's own details close with it.
 */
export const resolveDetailOpen = ({
  active,
  plankNames,
  pivot,
  subject,
  flatten,
  stack,
}: {
  active: readonly string[];
  plankNames: Readonly<Record<string, string>>;
  pivot: string;
  subject: string;
  flatten?: boolean;
  /** A mobile navigation stack, where a new plank goes on top. */
  stack?: boolean;
}): DetailOpen | undefined => {
  if (flatten && !stack) {
    const main = active.at(-1);
    if (main && pivot === plankNames[detailName(main)]) {
      return { next: [...active, pivot], plankNames: setDetail(plankNames, pivot, subject), inCompanion: true };
    }
    const index = active.indexOf(pivot);
    return index === -1
      ? undefined
      : { next: active.slice(0, index + 1), plankNames: setDetail(plankNames, pivot, subject), inCompanion: true };
  }

  if (!active.includes(pivot)) {
    return undefined;
  }
  const previous = plankNames[detailName(pivot)];
  if (previous === subject && active.includes(subject)) {
    return { next: [...active], plankNames: { ...plankNames }, inCompanion: false };
  }
  const stale = new Set(previous ? [previous, ...detailChain(plankNames, previous)] : []);
  let next: string[];
  if (stack) {
    next = pushSubjectsToStack(
      active.filter((id) => !stale.has(id)),
      [subject],
    );
  } else {
    // The new detail takes the previous one's slot, so the planks beside it do not shift.
    const replaceId = previous && active.includes(previous) ? previous : undefined;
    next = addSubjectsToActiveDeck(
      active.filter((id) => id === replaceId || !stale.has(id)),
      [subject],
      { pivotId: pivot, replaceId },
    ).filter((id) => id === subject || !stale.has(id));
  }
  const replacedId = previous && previous !== subject && active.includes(previous) ? previous : undefined;
  return { next, plankNames: setDetail(plankNames, pivot, subject), inCompanion: false, replacedId };
};

/**
 * Computes the next `active` list for a mobile {@link LayoutOperation.Open}: the list is a
 * navigation stack (top = last), so subjects are appended, and an already-open subject moves to
 * the top rather than duplicating — a stack can hold each panel only once.
 */
export const pushSubjectsToStack = (active: readonly string[], subjects: readonly string[]): string[] => {
  const next = active.filter((id) => !subjects.includes(id));
  next.push(...subjects);
  return next;
};

/**
 * Matches each subject to the plank already showing its entity under another graph path. A re-homing
 * open moves that plank onto the subject's path (`moved` maps its old id to the new one); otherwise the
 * subject is redirected to the open plank.
 */
export const matchOpenEntities = ({
  active,
  subjects,
  entityOf,
  rehome,
}: {
  active: readonly string[];
  subjects: readonly string[];
  entityOf: (id: string) => string | undefined;
  rehome: boolean;
}): { active: string[]; subjects: string[]; moved: ReadonlyMap<string, string> } => {
  const openByEntity = new Map<string, string>();
  for (const id of active) {
    const entity = entityOf(id);
    if (entity) {
      openByEntity.set(entity, id);
    }
  }

  const moves = new Map<string, string>();
  const matched = subjects.map((subject) => {
    const entity = entityOf(subject);
    const open = entity ? openByEntity.get(entity) : undefined;
    if (!open || open === subject || active.includes(subject)) {
      return subject;
    }
    if (rehome) {
      moves.set(open, subject);
      return subject;
    }
    return open;
  });

  return { active: active.map((id) => moves.get(id) ?? id), subjects: matched, moved: moves };
};

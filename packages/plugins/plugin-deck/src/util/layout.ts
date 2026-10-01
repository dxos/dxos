//
// Copyright 2024 DXOS.org
//

import { produce } from 'immer';

import { DeckSchema } from '#types';

/** Where {@link addSubjectsToActiveDeck} puts the subjects it is given. */
export type AddSubjectsToActiveDeckOptions = {
  /** Insert opened subjects immediately after this plank (in-plank navigation anchors at its origin). */
  pivotId?: string;
  replaceId?: string;
};

/**
 * Computes the next `active` list for an `'add'` disposition {@link LayoutOperation.Open}: inserts
 * subjects immediately after `pivotId` when present, else appends them at the end. Subjects already
 * open keep their position.
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

export const detailName = (owner: string): string => `${DETAIL_NAME_PREFIX}${owner}`;

export const detailChain = (names: Readonly<Record<string, string>>, id: string): string[] => {
  const chain: string[] = [];
  const seen = new Set([id]);
  for (let next = names[detailName(id)]; next && !seen.has(next); next = names[detailName(next)]) {
    chain.push(next);
    seen.add(next);
  }
  return chain;
};

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

export const replaceDetail = (
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
  inCompanion: boolean;
  replacedId?: string;
};

type DetailOpenInput = {
  active: readonly string[];
  plankNames: Readonly<Record<string, string>>;
  pivot: string;
  subject: string;
};

export const resolveFlattenedDetail = ({
  active,
  plankNames,
  pivot,
  subject,
}: DetailOpenInput): DetailOpen | undefined => {
  const main = active.at(-1);
  if (main && pivot === plankNames[detailName(main)]) {
    return { next: [...active, pivot], plankNames: replaceDetail(plankNames, pivot, subject), inCompanion: true };
  }
  const index = active.indexOf(pivot);
  return index === -1
    ? undefined
    : { next: active.slice(0, index + 1), plankNames: replaceDetail(plankNames, pivot, subject), inCompanion: true };
};

const resolveDetailPlank = (
  { active, plankNames, pivot, subject }: DetailOpenInput,
  place: (previous: string | undefined, stale: ReadonlySet<string>) => string[],
): DetailOpen | undefined => {
  if (!active.includes(pivot)) {
    return undefined;
  }
  const previous = plankNames[detailName(pivot)];
  if (previous === subject && active.includes(subject)) {
    return { next: [...active], plankNames: { ...plankNames }, inCompanion: false };
  }
  const stale = new Set(previous ? [previous, ...detailChain(plankNames, previous)] : []);
  const replacedId = previous && previous !== subject && active.includes(previous) ? previous : undefined;
  return {
    next: place(previous, stale),
    plankNames: replaceDetail(plankNames, pivot, subject),
    inCompanion: false,
    replacedId,
  };
};

export const resolveStackDetail = (input: DetailOpenInput): DetailOpen | undefined =>
  resolveDetailPlank(input, (_previous, stale) =>
    pushSubjectsToStack(
      input.active.filter((id) => !stale.has(id)),
      [input.subject],
    ),
  );

export const resolveDeckDetail = (input: DetailOpenInput): DetailOpen | undefined =>
  resolveDetailPlank(input, (previous, stale) => {
    const replaceId = previous && input.active.includes(previous) ? previous : undefined;
    return addSubjectsToActiveDeck(
      input.active.filter((id) => id === replaceId || !stale.has(id)),
      [input.subject],
      { pivotId: input.pivot, replaceId },
    ).filter((id) => id === input.subject || !stale.has(id));
  });

export const resolveDetailOpen = ({
  flatten,
  stack,
  ...input
}: DetailOpenInput & { flatten?: boolean; stack?: boolean }): DetailOpen | undefined =>
  stack ? resolveStackDetail(input) : flatten ? resolveFlattenedDetail(input) : resolveDeckDetail(input);

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

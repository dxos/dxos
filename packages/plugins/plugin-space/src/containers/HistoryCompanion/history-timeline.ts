//
// Copyright 2026 DXOS.org
//

import { Atom } from '@effect-atom/atom-react';

import { Obj, Ref } from '@dxos/echo';
import { type VersionDiff, getEditHistoryWithDiffs } from '@dxos/echo-client';
import { type ScrubberVersion } from '@dxos/react-ui-components';
import { isNonNullable } from '@dxos/util';

/** A single object's edit history within the merged timeline. */
export type ObjectHistory = { object: Obj.Unknown; diffs: VersionDiff[] };

/** Derived state for the history scrubber: the merged timeline plus the data needed to drive it. */
export type HistoryTimeline = {
  /** One entry per scrubber step, oldest first. */
  versions: ScrubberVersion[];
  /** Per-object edit history for the primary and each gathered child. */
  histories: ObjectHistory[];
  /** Per-step version pointers into `histories` (a "tree snapshot" reconstructed positionally). */
  plan: number[][];
};

// Consecutive edits by the same author within this window collapse into one scrubber step, so a
// typing burst isn't one step per keystroke. (Automerge change times are second-granular.)
const COALESCE_WINDOW_MS = 3_000;

/**
 * The Ref values the primary directly holds (e.g. a document's content Text). Dynamic property walk
 * (mirrors `useRelatedObjects`); reading arbitrary keys off an untyped reactive object needs `any`
 * indexing.
 */
const collectChildRefs = (root: Obj.Unknown): Ref.Ref<Obj.Unknown>[] =>
  Object.getOwnPropertyNames(root)
    .map((name) => (root as any)[name])
    .flatMap((value) => (Array.isArray(value) ? value : [value]))
    .filter((value): value is Ref.Ref<Obj.Unknown> => Ref.isRef(value));

/**
 * Merge the per-object histories into one timeline. Events are sorted by time and consecutive
 * same-author events within {@link COALESCE_WINDOW_MS} collapse into one step. Reconstruction is
 * positional (Automerge change times are second-granular, so fast edits collide): every object
 * starts at its earliest version and each step advances exactly the objects it touched.
 */
const buildTimeline = (histories: ObjectHistory[]): Pick<HistoryTimeline, 'versions' | 'plan'> => {
  const events = histories
    .flatMap(({ diffs }, objectIndex) => diffs.map((diff, versionIndex) => ({ diff, objectIndex, versionIndex })))
    .sort((a, b) => a.diff.time - b.diff.time);

  const groups: (typeof events)[] = [];
  for (const event of events) {
    const group = groups.at(-1);
    const last = group?.at(-1);
    if (group && last && last.diff.actor === event.diff.actor && event.diff.time - last.diff.time <= COALESCE_WINDOW_MS) {
      group.push(event);
    } else {
      groups.push([event]);
    }
  }

  const pointers = histories.map(() => 0);
  const plan: number[][] = [];
  const versions: ScrubberVersion[] = [];
  for (const group of groups) {
    let added = 0;
    let removed = 0;
    // Groups are non-empty by construction, so the first element seeds the step's metadata.
    let last = group[0].diff;
    for (const { diff, objectIndex, versionIndex } of group) {
      pointers[objectIndex] = versionIndex;
      added += diff.added;
      removed += diff.removed;
      last = diff;
    }
    plan.push(pointers.slice());
    versions.push({ time: last.time, author: last.actor, label: last.message, added, removed });
  }

  return { versions, plan };
};

/**
 * Derives the {@link HistoryTimeline} for `object` and its child objects as a reactive atom. Reading
 * `Obj.atom` for the primary and each child ref registers them as dependencies, so the timeline
 * recomputes whenever the primary's own fields (e.g. a document's name) OR any child's content
 * change — reactivity lives here rather than in React. The live objects (`ref.target`) are read for
 * `getEditHistoryWithDiffs`, which needs the object core that snapshots don't carry.
 */
export const createHistoryTimelineAtom = (object: Obj.Unknown): Atom.Atom<HistoryTimeline> =>
  Atom.make((get) => {
    // Subscribe to the primary (fields + structure, so child refs are re-collected when they change).
    // `latestOnly` so time-travel scrubbing (which only changes the displayed value) does not churn
    // the timeline; it recomputes on real edits, where the histories below pick up new versions.
    get(Obj.atom(object, { latestOnly: true }));
    const children = collectChildRefs(object)
      .map((ref) => {
        // Subscribe to the child's resolution and content changes.
        get(Obj.atom(ref, { latestOnly: true }));
        return ref.target;
      })
      .filter(isNonNullable)
      .filter((value): value is Obj.Unknown => Obj.isObject(value));

    const histories: ObjectHistory[] = [object, ...children]
      .map((obj) => ({ object: obj, diffs: getEditHistoryWithDiffs(obj) }))
      .filter(({ diffs }) => diffs.length > 0);

    return { ...buildTimeline(histories), histories };
  });

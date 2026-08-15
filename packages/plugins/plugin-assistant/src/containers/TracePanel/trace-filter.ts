//
// Copyright 2026 DXOS.org
//

import * as Operation from '@dxos/compute/Operation';

import { UNTAGGED_OPERATION_TAG } from '#execution-graph';

/**
 * Order tags are offered in, matching `Operation.Tag`'s declaration order so the list reads
 * consistently regardless of which tags a given trace happens to contain. Tags outside the
 * well-known vocabulary (a plugin may define its own) sort after these, alphabetically, and
 * `untagged` sorts last — it is a fallback, not a category.
 */
const TAG_ORDER: readonly string[] = Object.values(Operation.Tag);

/** Icon shown beside each tag in the filter list. */
const TAG_ICONS: Record<string, string> = {
  [Operation.Tag.UI]: 'ph--layout--regular',
  [Operation.Tag.Edit]: 'ph--pencil-simple--regular',
  [Operation.Tag.Query]: 'ph--magnifying-glass--regular',
  [Operation.Tag.Space]: 'ph--planet--regular',
  [Operation.Tag.Identity]: 'ph--user--regular',
  [Operation.Tag.Sync]: 'ph--arrows-clockwise--regular',
  [Operation.Tag.Agent]: 'ph--atom--regular',
  [Operation.Tag.Automation]: 'ph--lightning--regular',
  [Operation.Tag.Tool]: 'ph--wrench--regular',
  [Operation.Tag.System]: 'ph--gear--regular',
  [UNTAGGED_OPERATION_TAG]: 'ph--question--regular',
};

export const tagIcon = (tag: string): string => TAG_ICONS[tag] ?? 'ph--tag--regular';

/**
 * The selection the panel starts from: the default-visible tags plus `untagged`.
 *
 * Untagged is included because a trace outlives the code that wrote it — events recorded before an
 * operation was tagged, or by a definition this build has never seen (an EDGE-deployed script),
 * carry no tags, and silently dropping them would make the panel look broken on existing data.
 */
export const DEFAULT_OPERATION_TAGS: readonly string[] = [...Operation.DEFAULT_TAGS, UNTAGGED_OPERATION_TAG];

/**
 * Tags the filter offers: those seen in the trace, plus the well-known vocabulary and anything
 * currently selected, so the list doesn't reshuffle as a trace grows and a selected tag is always
 * visible (and therefore clearable).
 */
export const availableOperationTags = (traceTags: readonly string[], selected: readonly string[]): string[] => {
  const tags = new Set([...traceTags, ...selected, ...DEFAULT_OPERATION_TAGS]);
  const rank = (tag: string): number => {
    if (tag === UNTAGGED_OPERATION_TAG) {
      return TAG_ORDER.length + 1;
    }
    const index = TAG_ORDER.indexOf(tag);
    return index < 0 ? TAG_ORDER.length : index;
  };
  return [...tags].sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
};

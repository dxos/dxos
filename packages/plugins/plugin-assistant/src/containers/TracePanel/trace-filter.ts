//
// Copyright 2026 DXOS.org
//

import * as OperationTag from '@dxos/app-toolkit/OperationTag';

import { UNTAGGED_OPERATION_TAG } from '#execution-graph';

/** Icon shown beside each tag in the filter list. */
const TAG_ICONS: Record<string, string> = {
  [OperationTag.Layout]: 'ph--layout--regular',
  [OperationTag.Navigation]: 'ph--compass--regular',
  [OperationTag.Assistant]: 'ph--atom--regular',
  [OperationTag.Connector]: 'ph--plugs--regular',
  [OperationTag.Database]: 'ph--database--regular',
  [OperationTag.Identity]: 'ph--user--regular',
  [OperationTag.System]: 'ph--gear--regular',
  [UNTAGGED_OPERATION_TAG]: 'ph--question--regular',
};

export const tagIcon = (tag: string): string => TAG_ICONS[tag] ?? 'ph--tag--regular';

/**
 * The selection the panel starts from: the tags worth watching, plus `untagged`.
 *
 * The excluded ones are the high-volume, low-signal tags — interface chrome, navigation, and the
 * per-keystroke database traffic behind them. What is left is the work someone watching the system
 * actually wants to see: agentic runs, external sync, and anything touching identity.
 *
 * Untagged is included because a trace outlives the code that wrote it — events recorded before an
 * operation was tagged, or by a definition this build has never seen (an EDGE-deployed script),
 * carry no tags, and silently dropping them would make the panel look broken on existing data.
 */
export const DEFAULT_OPERATION_TAGS: readonly string[] = [
  OperationTag.Assistant,
  OperationTag.Connector,
  OperationTag.Identity,
  UNTAGGED_OPERATION_TAG,
];

/**
 * Tags the filter offers: those seen in the trace, plus the common vocabulary and anything
 * currently selected, so the list doesn't reshuffle as a trace grows and a selected tag is always
 * visible (and therefore clearable).
 *
 * Ordered by `OperationTag.all` so the list reads consistently regardless of which tags a given
 * trace happens to contain. Tags outside the common vocabulary (a plugin may coin its own) sort
 * after these, alphabetically, and `untagged` sorts last — it is a fallback, not a category.
 */
export const availableOperationTags = (traceTags: readonly string[], selected: readonly string[]): string[] => {
  const tags = new Set([...traceTags, ...selected, ...OperationTag.all, UNTAGGED_OPERATION_TAG]);
  const rank = (tag: string): number => {
    if (tag === UNTAGGED_OPERATION_TAG) {
      return OperationTag.all.length + 1;
    }
    const index = OperationTag.all.findIndex((known) => known === tag);
    return index < 0 ? OperationTag.all.length : index;
  };
  return [...tags].sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
};

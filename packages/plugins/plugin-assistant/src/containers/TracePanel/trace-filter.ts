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
 * The selection the panel starts from: agentic runs and external sync — the work someone watching
 * the system is actually there to see. Everything else (interface chrome, navigation, the
 * per-keystroke database traffic behind them, and untagged legacy events) starts hidden.
 */
export const DEFAULT_OPERATION_TAGS: readonly string[] = [OperationTag.Assistant, OperationTag.Connector];

/**
 * Tags the filter offers: those the trace actually contains, plus anything currently selected so a
 * selection is always visible and therefore clearable.
 *
 * Deliberately NOT the full `OperationTag` vocabulary. Whether a tag can appear at all depends on
 * the invocation path, not the tag: an operation reaches the trace feed only when a space is in
 * scope, so the entire layout/navigation surface — invoked from app chrome with no space — never
 * records anything. Offering those tags would present a toggle that provably cannot change what is
 * on screen.
 *
 * Ordered by `OperationTag.all` so the list reads consistently as a trace grows. Tags outside the
 * common vocabulary (a plugin may coin its own) sort after these, alphabetically, and `untagged`
 * sorts last — it is a fallback, not a category.
 */
export const availableOperationTags = (traceTags: readonly string[], selected: readonly string[]): string[] => {
  const tags = new Set([...traceTags, ...selected]);
  const rank = (tag: string): number => {
    if (tag === UNTAGGED_OPERATION_TAG) {
      return OperationTag.all.length + 1;
    }
    const index = OperationTag.all.findIndex((known) => known === tag);
    return index < 0 ? OperationTag.all.length : index;
  };
  return [...tags].sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
};

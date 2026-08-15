//
// Copyright 2026 DXOS.org
//

import * as OperationTag from '@dxos/app-toolkit/OperationTag';
import type * as Operation from '@dxos/compute/Operation';
import type * as Process from '@dxos/compute/Process';
import { DXN } from '@dxos/keys';

/**
 * Pseudo-tag matching operations that declare no tags — anything predating the tag vocabulary, or
 * a definition whose author has not classified it yet.
 */
export const UNTAGGED_OPERATION_TAG = 'untagged';

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
 * per-keystroke database traffic behind them, and untagged operations) starts hidden.
 */
export const DEFAULT_OPERATION_TAGS: readonly string[] = [OperationTag.Assistant, OperationTag.Connector];

/**
 * Maps a process key to the tags of the operation it runs.
 *
 * A process spawned for an operation takes its key from the operation's, minus the DXN scheme
 * (`Process.fromOperation` stores `DXN.getName(op.meta.key)`), so the lookup has to be built on the
 * same normalization. Definitions come from the locally contributed handler sets rather than from
 * the trace, so a process is classifiable the moment it appears.
 */
export const operationTagsByProcessKey = (
  definitions: readonly Operation.Definition.Any[],
): ReadonlyMap<string, readonly string[]> => {
  const byKey = new Map<string, readonly string[]>();
  for (const definition of definitions) {
    const tags = definition.meta.tags;
    byKey.set(
      DXN.getName(definition.meta.key),
      tags !== undefined && tags.length > 0 ? tags : [UNTAGGED_OPERATION_TAG],
    );
  }
  return byKey;
};

/**
 * Keeps processes whose operation carries at least one selected tag.
 *
 * A process with no matching definition — an agent, a trigger dispatcher, anything that is not an
 * operation invocation — is never filtered: it has no tags to judge it by, and dropping the agent
 * rows would gut the panel this list belongs to.
 */
export const filterProcesses = (
  processes: readonly Process.Info[],
  tagsByKey: ReadonlyMap<string, readonly string[]>,
  selected: readonly string[],
): readonly Process.Info[] => {
  const selection = new Set(selected);
  return processes.filter((process) => {
    const tags = tagsByKey.get(process.key);
    return tags === undefined || tags.some((tag) => selection.has(tag));
  });
};

/**
 * Tags the filter offers: those carried by the processes on screen, plus anything currently
 * selected so a selection stays visible and therefore clearable.
 *
 * Deliberately NOT the full `OperationTag` vocabulary — offering a tag no listed process carries
 * presents a toggle that cannot change what is on screen.
 *
 * Ordered by `OperationTag.all` so the list reads consistently as processes come and go. Tags
 * outside the common vocabulary (a plugin may coin its own) sort after these, alphabetically, and
 * `untagged` sorts last — it is a fallback, not a category.
 */
export const availableOperationTags = (
  processes: readonly Process.Info[],
  tagsByKey: ReadonlyMap<string, readonly string[]>,
  selected: readonly string[],
): string[] => {
  const tags = new Set(selected);
  for (const process of processes) {
    for (const tag of tagsByKey.get(process.key) ?? []) {
      tags.add(tag);
    }
  }
  const rank = (tag: string): number => {
    if (tag === UNTAGGED_OPERATION_TAG) {
      return OperationTag.all.length + 1;
    }
    const index = OperationTag.all.findIndex((known) => known === tag);
    return index < 0 ? OperationTag.all.length : index;
  };
  return [...tags].sort((left, right) => rank(left) - rank(right) || left.localeCompare(right));
};

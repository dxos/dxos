//
// Copyright 2026 DXOS.org
//

import { parseBlockHeaders } from '@dxos/deus/parse';

import { type DecisionModel, type QuestionModel, holds } from '../ChangelogGraph/index.ts';

/** The spec block at the editor's cursor, and the item of it the cursor is on, such as `req F-25.2` of `feat F-25`. */
export type CursorFocus = {
  /** The block type, such as `feat` or `decision`. */
  type: string;
  id: string;
  item?: string;
};

const BLOCK_LINE = /^([a-z][\w-]*)\s+([^\s:]+)\s*(?::|$)/;
const ITEM_LINE = /^\s+[a-z][\w-]*\s+([^\s:]+):/;

/** The block nearest `offset`: the one whose fence holds it, else the closest fence's first or last block. */
export const focusAt = (text: string, offset: number): CursorFocus | undefined => {
  let nearest: { fence: ReturnType<typeof parseBlockHeaders>[number]; distance: number } | undefined;
  for (const fence of parseBlockHeaders(text)) {
    const end = fence.to + 1 + fence.body.length;
    const distance = offset < fence.from ? fence.from - offset : offset > end ? offset - end : 0;
    if (nearest === undefined || distance < nearest.distance) {
      nearest = { fence, distance };
    }
  }
  if (!nearest) {
    return undefined;
  }
  // A fence may hold several blocks; the one the cursor is in starts on the last block line at or above it.
  let focus: CursorFocus | undefined;
  let lineStart = nearest.fence.to + 1;
  for (const line of nearest.fence.body.split('\n')) {
    const block = BLOCK_LINE.exec(line);
    const item = ITEM_LINE.exec(line);
    const reached = lineStart <= offset;
    if (block && (reached || !focus)) {
      focus = { type: block[1], id: block[2] };
    } else if (item && reached && focus && item[1].startsWith(`${focus.id}.`)) {
      focus = { ...focus, item: item[1] };
    }
    lineStart += line.length + 1;
  }
  return focus;
};

/** What the changelog says about the block at the cursor. */
export type CursorDecisions = {
  /** Decisions that hold on the item at the cursor, or on the block when the cursor is on no item; newest first. */
  here: DecisionModel[];
  /** Decisions that hold on the block that encloses the item. */
  enclosing: DecisionModel[];
  /** Decisions that hold on the block's items, when the cursor is on the block itself. */
  within: DecisionModel[];
  /** Decisions on the target that something replaced. */
  replaced: DecisionModel[];
  /** Open questions on the item or its block. */
  questions: QuestionModel[];
};

export const cursorDecisions = (
  focus: CursorFocus,
  decisions: readonly DecisionModel[],
  questions: readonly QuestionModel[],
): CursorDecisions => {
  const target = focus.item ?? focus.id;
  const on = (id: string) => (decision: DecisionModel) => decision.entry.affects.includes(id);
  const newestFirst = [...decisions].reverse();
  const live = newestFirst.filter(holds);
  return {
    here: live.filter(on(target)),
    enclosing: focus.item ? live.filter(on(focus.id)) : [],
    within: focus.item
      ? []
      : live.filter(
          ({ entry }) => entry.affects.some((id) => id.startsWith(`${focus.id}.`)) && !entry.affects.includes(focus.id),
        ),
    replaced: newestFirst.filter((decision) => !holds(decision) && on(target)(decision)),
    questions: questions.filter(
      ({ answer, entry }) => !answer && (entry.affects.includes(target) || entry.affects.includes(focus.id)),
    ),
  };
};

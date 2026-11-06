//
// Copyright 2026 DXOS.org
//

import { type ContentBlock } from '@dxos/types';
import { safeParseJson } from '@dxos/util';

import { BACKGROUND_TOOL } from '../renderer.ts';

/**
 * One row of the run: a call and everything that came back for it, or a status or reasoning block
 * narrating it — a run that never reaches a call is narration alone.
 *
 * The runtime delivers a call, its result and its stats as separate blocks, but a reader thinks in
 * calls — so the result folds into the call it answers rather than becoming a sibling row. Status
 * and reasoning join the same list because they narrate the same run: emitted as their own widgets
 * they broke a run into a panel per call.
 */
export type ToolEntry = {
  id: string;
  kind: 'call' | 'status' | 'reasoning';
  /** Present tense while the call is unanswered, which is what the summary advertises. */
  active: boolean;
  title: string;
  icon: string;
  /** A background tool's result, recovered without the call it answers; named by {@link entryLabel}. */
  background?: boolean;
  /** Prose of a status or reasoning row; a call carries its payload in the fields below. */
  text?: string;
  error?: unknown;
  input?: unknown;
  result?: unknown;
};

export const TOOL_ICON = 'ph--wrench--regular';
const STATUS_ICON = 'ph--info--regular';
const REASONING_ICON = 'ph--brain--regular';

/**
 * The call's display label where its producer supplied one (a code-mode `eval`), else the operation's
 * human-readable name; the raw tool name is the fallback for inline toolkit and MCP tools, which have
 * no operation behind them.
 */
const callTitle = (block: ContentBlock.ToolCall): string =>
  block.displayName ?? block.operationName ?? block.name ?? 'Tool';

/**
 * Groups a run's blocks by row.
 *
 * Calls are keyed on `toolCallId` where the transport supplies one, since parallel calls complete out of
 * order; a result without it answers the most recent unanswered call.
 */
export const toEntries = (blocks: ContentBlock.Any[]): ToolEntry[] => {
  const entries: ToolEntry[] = [];
  const indexById = new Map<string, number>();

  const pending = (): ToolEntry | undefined => {
    for (let index = entries.length - 1; index >= 0; index--) {
      if (entries[index].kind === 'call' && entries[index].active) {
        return entries[index];
      }
    }
    return undefined;
  };

  for (const block of blocks) {
    switch (block._tag) {
      case 'toolCall': {
        const existing = block.toolCallId !== undefined ? indexById.get(block.toolCallId) : undefined;
        const entry: ToolEntry = {
          id: block.toolCallId ?? `call-${entries.length}`,
          kind: 'call',
          active: true,
          title: callTitle(block),
          icon: block.displayIcon ?? block.operationIcon ?? TOOL_ICON,
          input: safeParseJson(block.input) ?? (block.input || undefined),
        };
        if (existing !== undefined) {
          entries[existing] = { ...entries[existing], ...entry };
        } else {
          if (block.toolCallId !== undefined) {
            indexById.set(block.toolCallId, entries.length);
          }
          entries.push(entry);
        }
        break;
      }

      case 'toolResult': {
        // A background tool's result answers a call from an earlier turn, so it stands as its own row
        // rather than answering whichever call in this run is still unanswered. A pid reported again
        // replaces its earlier row: the latest report is the outcome.
        let entry: ToolEntry | undefined;
        if (block.name === BACKGROUND_TOOL) {
          const id = `background-${block.toolCallId}`;
          entry = { id, kind: 'call', active: false, background: true, title: '', icon: TOOL_ICON };
          // Replaced in place, not moved: `indexById` holds positions of the calls after it.
          const previous = entries.findIndex((existing) => existing.id === id);
          if (previous === -1) {
            entries.push(entry);
          } else {
            entries[previous] = entry;
          }
        } else {
          const index = block.toolCallId !== undefined ? indexById.get(block.toolCallId) : undefined;
          entry = index !== undefined ? entries[index] : pending();
        }
        if (!entry) {
          break;
        }
        entry.active = false;
        if (block.error) {
          entry.error = block.error;
        } else {
          entry.result =
            typeof block.result === 'string' ? (safeParseJson(block.result) ?? block.result) : block.result;
        }
        break;
      }

      case 'status': {
        const text = block.statusText?.trim();
        if (!text) {
          break;
        }
        entries.push({
          id: `status-${entries.length}`,
          kind: 'status',
          active: block.pending === true,
          title: text,
          icon: STATUS_ICON,
        });
        break;
      }

      case 'reasoning': {
        const text = (block.reasoningText ?? block.redactedText ?? '').trim();
        if (!text) {
          break;
        }
        entries.push({
          id: `reasoning-${entries.length}`,
          kind: 'reasoning',
          active: block.pending === true,
          // Named by {@link entryLabel}; the prose is what the row opens onto.
          title: '',
          icon: REASONING_ICON,
          text,
        });
        break;
      }
    }
  }

  return entries;
};

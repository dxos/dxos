//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { Icon, SystemIconButton, useTranslation } from '@dxos/react-ui';
import { TogglePanel, type TogglePanelRootProps } from '@dxos/react-ui-components';
import { Accordion } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { type ContentBlock } from '@dxos/types';
import { type XmlWidgetProps, getXmlTextChild } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { safeParseJson } from '@dxos/util';

import { translationKey } from '../translations';

export type ToolWidgetProps = XmlWidgetProps;

/**
 * A run of tool blocks as one collapsible panel with a row per call. The `<toolkit>` tag carries
 * the run as JSON — the item is rebuilt from its message alone, so there is no widget-state side
 * channel to accumulate blocks through.
 */
export const ToolWidget = ({ view, children }: ToolWidgetProps) => {
  const blocks = useMemo<ContentBlock.Any[]>(() => {
    const parsed = safeParseJson(getXmlTextChild(children ?? []) ?? '');
    return Array.isArray(parsed) ? (parsed as ContentBlock.Any[]) : [];
  }, [children]);

  const entries = useMemo(() => toEntries(blocks), [blocks]);

  // CodeMirror measures the block as the portal mounts, before the panel has settled to its
  // collapsed height — leaving the heightmap taller than the row and the editor scrolling behind it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => view?.requestMeasure());
    return () => cancelAnimationFrame(frame);
  }, [view, entries.length]);

  const handleChangeOpen = useCallback(() => {
    setTimeout(() => {
      // Measure after animation.
      view?.requestMeasure();
    }, 1_000);
  }, [view]);

  // Ignore if empty.
  if (!entries.length) {
    return null;
  }

  return <ToolPanel entries={entries} onChangeOpen={handleChangeOpen} />;
};

/**
 * One row of the run: a call and everything that came back for it, or a status or reasoning block
 * the model emitted between calls.
 *
 * The runtime delivers a call, its result and its stats as separate blocks, but a reader thinks in
 * calls — so the result folds into the call it answers rather than becoming a sibling row. Status
 * and reasoning join the same list because they narrate the same run: emitted as their own widgets
 * they broke a run into a panel per call.
 */
type ToolEntry = {
  id: string;
  kind: 'call' | 'status' | 'reasoning';
  /** Present tense while the call is unanswered, which is what the summary advertises. */
  active: boolean;
  title: string;
  icon: string;
  /** Prose of a status or reasoning row; a call carries its payload in the fields below. */
  text?: string;
  error?: unknown;
  input?: unknown;
  result?: unknown;
};

const TOOL_ICON = 'ph--wrench--regular';
const STATUS_ICON = 'ph--info--regular';
const REASONING_ICON = 'ph--brain--regular';

/** The bordered box the disclosure opens onto — the list and a lone call's detail share it. */
const PANEL_FRAME = 'border border-subdued-separator rounded-md min-w-0';

/**
 * The operation's human-readable name where the call is an operation invocation; the raw tool name
 * is the fallback for inline toolkit and MCP tools, which have no operation behind them.
 */
const callTitle = (block: ContentBlock.ToolCall): string => block.operationName ?? block.name ?? 'Tool';

/**
 * Groups a run's blocks by row.
 *
 * Calls are keyed on `toolCallId` where the transport supplies one; a result without it answers the
 * most recent unanswered call, which is the order the runtime emits them in.
 */
const toEntries = (blocks: ContentBlock.Any[]): ToolEntry[] => {
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
          icon: block.operationIcon ?? TOOL_ICON,
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
        const entry = pending();
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
          // The row names the kind and opens onto the prose: reasoning runs to paragraphs, and a
          // truncated first line reads as a broken title rather than a summary.
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

type ToolPanelProps = {
  entries: ToolEntry[];
} & Pick<TogglePanelRootProps, 'onChangeOpen'>;

/** Whether the row carries anything an expansion could show. */
const hasDetail = (entry: ToolEntry): boolean =>
  entry.text !== undefined || entry.input !== undefined || entry.error !== undefined || entry.result !== undefined;

const ToolPanel = ({ entries, onChangeOpen }: ToolPanelProps) => {
  const { t } = useTranslation(translationKey);
  const [open, setOpen] = useState(false);

  const calls = entries.filter((entry) => entry.kind === 'call');
  const status = entries.filter((entry) => entry.kind === 'status').at(-1);
  const failed = calls.filter((call) => call.error !== undefined).length;

  // A lone call owns the panel itself: a summary above one row says the same thing twice, and the
  // outer disclosure is the one that opens onto its payload.
  const single = entries.length === 1 && calls.length === 1 ? calls[0] : undefined;

  // Three shapes, in the order a reader needs them: the run's own narration while the model is
  // still saying what it is doing, a lone call's name, and otherwise the count.
  const count = t('tool-run.label', { count: calls.length });
  const header = status
    ? `${status.title} (${t('tool-run-suffix.label', { count: calls.length })})`
    : (single?.title ?? count);
  const icon = status?.icon ?? single?.icon ?? TOOL_ICON;

  return (
    // The summary is a bare text row rather than a bordered panel header: the border belongs to
    // the list it opens onto, so a collapsed run reads as one line of prose in the feed.
    //
    // The body animates: the Collapsible measures its own `--height`, so the reveal ramps instead
    // of the content appearing and vanishing in one frame. Content stays mounted and the machine
    // hides it, which is what lets the ramp have a height to animate to.
    <TogglePanel.Root
      open={open}
      onChangeOpen={setOpen}
      // `w-0 min-w-full`: the editor sizes its content line to its widest child, so a wide payload
      // would stretch the whole line — carrying the summary row out of view and scrolling the
      // editor instead of the payload. Zero width removes this widget from that calculation, and
      // the min-width then takes the line's own width, which is what bounds the payload's scroller.
      classNames='w-0 min-w-full'
    >
      <TogglePanel.Header
        caret='end'
        data-testid={single ? 'assistant.tool-call' : 'assistant.tool-run'}
        classNames='gap-1'
      >
        <span className='flex min-w-0 items-center gap-2 text-description tabular-nums'>
          {/* The same glyph column as the rows the panel opens onto, so the run reads as one list
              whether it is collapsed or not. */}
          <Icon icon={icon} size={4} classNames='shrink-0' />
          <span className={mx('truncate', single?.error !== undefined && 'text-error')}>{header}</span>
          {failed > 0 && <span className='shrink-0 text-error'>· {t('tool-failed.label', { count: failed })}</span>}
        </span>
      </TogglePanel.Header>
      {/* No `Viewport`: its `overflow-y-auto` puts a scrollbar on the body for the length of the
          ramp, while the box is still shorter than the content it is growing to hold. */}
      <TogglePanel.Body>
        {single ? (
          // Pads itself only here: inside the accordion the body already insets by `trim-sm`, and
          // padding twice pushed the copy button off the caret's column.
          <ToolCallDetail entry={single} classNames={mx(PANEL_FRAME, 'p-trim-sm')} />
        ) : (
          <ToolCallList entries={entries} onOpen={onChangeOpen} />
        )}
      </TogglePanel.Body>
    </TogglePanel.Root>
  );
};

type ToolCallListProps = {
  entries: ToolEntry[];
  onOpen?: (open: boolean) => void;
};

/**
 * The run's rows as an accordion, so each opens onto its own payload and the machine supplies the
 * APG keymap the hand-rolled rows never had.
 *
 * Rows are collapsed by default: one that opened itself would change this item's height, and the
 * feed measures that height as the row mounts.
 */
const ToolCallList = ({ entries, onOpen }: ToolCallListProps) => {
  const { t } = useTranslation(translationKey);
  const label = (entry: ToolEntry) => (entry.kind === 'reasoning' ? t('tool-thinking.label') : entry.title);
  return (
    <Accordion.Root<ToolEntry>
      items={entries}
      // No `overflow-hidden`: it clips the top and bottom edges off the inset focus ring of the
      // first and last triggers, whose bounds coincide with the frame's own.
      classNames={mx(PANEL_FRAME, 'divide-y divide-subdued-separator')}
      onValueChange={(value) => onOpen?.(value.length > 0)}
    >
      {({ items }) =>
        items.map((entry) =>
          // Nothing to open onto: a caret that reveals emptiness reads as a failure, so a row with
          // no payload is a plain row rather than an accordion item.
          hasDetail(entry) ? (
            <Accordion.Item key={entry.id} item={entry}>
              <Accordion.ItemHeader
                hover
                icon={entry.icon}
                data-testid={`assistant.tool-${entry.kind}`}
                classNames={mx('text-sm', entry.error !== undefined && 'text-error')}
              >
                <span className='truncate'>{label(entry)}</span>
              </Accordion.ItemHeader>
              <Accordion.ItemBody>
                <ToolCallDetail entry={entry} />
              </Accordion.ItemBody>
            </Accordion.Item>
          ) : (
            <div
              key={entry.id}
              className='flex items-center gap-2 px-2 text-sm min-h-(--dx-control)'
              data-testid={`assistant.tool-${entry.kind}`}
            >
              <Icon icon={entry.icon} size={4} classNames='shrink-0' />
              <span className={mx('truncate', entry.error !== undefined && 'text-error')}>{label(entry)}</span>
            </div>
          ),
        )
      }
    </Accordion.Root>
  );
};

/** What a row carries, in the order it happened. */
const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames?: string }) => {
  const { t } = useTranslation(translationKey);
  return (
    // `min-w-0` so a wide payload scrolls inside its own section rather than widening this column
    // and taking the summary row with it.
    <div className={mx('flex flex-col gap-1 min-w-0', classNames)}>
      {entry.text !== undefined && (
        <p className='text-sm text-description whitespace-pre-wrap px-1 py-trim-sm'>{entry.text}</p>
      )}
      {entry.input !== undefined && <ToolSection label={t('tool-input.label')} data={entry.input} />}
      {entry.error !== undefined && <ToolSection label={t('tool-error.label')} data={entry.error} />}
      {entry.result !== undefined && <ToolSection label={t('tool-result.label')} data={entry.result} />}
    </div>
  );
};

const ToolSection = ({ label, data }: { label: string; data: unknown }) => (
  <div className='flex flex-col'>
    {/* No horizontal padding of its own: the containing body already insets by `trim-sm`, and a
        second inset here pushed the copy button off the column the disclosure carets sit in. */}
    <div className='flex items-center justify-between'>
      <span className='text-sm text-description'>{label}</span>
      {/* `-me-1` cancels the button's own trailing inset so its glyph centres on the same column as
        the disclosure caret rather than sitting a few pixels inside it. */}
      <SystemIconButton.Clipboard
        variant='ghost'
        density='sm'
        iconOnly
        size={4}
        classNames='-me-1'
        onCopy={() => JSON.stringify(data)}
      />
    </div>
    <JsonHighlighter
      data={data}
      // Scrolls on the inline axis only. The payload is the scroll container for a long line — it
      // must not scroll the whole widget and carry the summary row out of view — but the block axis
      // has to stay unscrollable: `JsonHighlighter` defaults to `overflow-auto`, so while the
      // disclosure's height ramps the squeezed payload drew its own vertical scrollbar.
      classNames='text-xs bg-transparent overflow-x-auto overflow-y-hidden'
      replacer={{ maxDepth: 3, maxArrayLen: 10, maxStringLen: 128 }}
    />
  </div>
);

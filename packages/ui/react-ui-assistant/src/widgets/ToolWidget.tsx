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

  const calls = useMemo(() => toCalls(blocks), [blocks]);

  // CodeMirror measures the block as the portal mounts, before the panel has settled to its
  // collapsed height — leaving the heightmap taller than the row and the editor scrolling behind it.
  useEffect(() => {
    const frame = requestAnimationFrame(() => view?.requestMeasure());
    return () => cancelAnimationFrame(frame);
  }, [view, calls.length]);

  const handleChangeOpen = useCallback(() => {
    setTimeout(() => {
      // Measure after animation.
      view?.requestMeasure();
    }, 1_000);
  }, [view]);

  // Ignore if empty.
  if (!calls.length) {
    return null;
  }

  return <ToolPanel calls={calls} onChangeOpen={handleChangeOpen} />;
};

/**
 * One call and everything that came back for it.
 *
 * The runtime delivers a call, its result and its stats as separate blocks, but a reader thinks in
 * calls — so the result folds into the call it answers rather than becoming a sibling row.
 */
type ToolCallEntry = {
  id: string;
  /** Present tense while the call is unanswered, which is what the summary advertises. */
  active: boolean;
  title: string;
  icon?: string;
  error?: unknown;
  input?: unknown;
  result?: unknown;
};

const DEFAULT_TOOL_ICON = 'ph--wrench--regular';

/** The bordered box the disclosure opens onto — the list and a lone call's detail share it. */
const PANEL_FRAME = 'border border-subdued-separator rounded-md min-w-0';

/** The tool's name is all the block carries; a description would need the toolkit definition. */
const callTitle = (block: ContentBlock.ToolCall): string => block.name ?? 'Tool';

/**
 * Groups a run's blocks by call.
 *
 * Keyed on `toolCallId` where the transport supplies one; a result without it answers the most
 * recent unanswered call, which is the order the runtime emits them in.
 */
const toCalls = (blocks: ContentBlock.Any[]): ToolCallEntry[] => {
  const calls: ToolCallEntry[] = [];
  const indexById = new Map<string, number>();

  const pending = (): ToolCallEntry | undefined => {
    for (let index = calls.length - 1; index >= 0; index--) {
      if (calls[index].active) {
        return calls[index];
      }
    }
    return undefined;
  };

  for (const block of blocks) {
    switch (block._tag) {
      case 'toolCall': {
        const existing = block.toolCallId !== undefined ? indexById.get(block.toolCallId) : undefined;
        const entry: ToolCallEntry = {
          id: block.toolCallId ?? `call-${calls.length}`,
          active: true,
          title: callTitle(block),
          icon: block.operationIcon,
          input: safeParseJson(block.input) ?? (block.input || undefined),
        };
        if (existing !== undefined) {
          calls[existing] = { ...calls[existing], ...entry };
        } else {
          if (block.toolCallId !== undefined) {
            indexById.set(block.toolCallId, calls.length);
          }
          calls.push(entry);
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
    }
  }

  return calls;
};

type ToolPanelProps = {
  calls: ToolCallEntry[];
} & Pick<TogglePanelRootProps, 'onChangeOpen'>;

/** Whether the call carries anything an expansion could show. */
const hasDetail = (call: ToolCallEntry): boolean =>
  call.input !== undefined || call.error !== undefined || call.result !== undefined;

const ToolPanel = ({ calls, onChangeOpen }: ToolPanelProps) => {
  const { t } = useTranslation(translationKey);
  const [open, setOpen] = useState(false);

  const active = calls.find((call) => call.active);
  // Named while a call is in flight so the reader sees what is happening, counted once the run is
  // done, when the individual titles are available a click away.
  const summary = active ? active.title : t('tool-run.label', { count: calls.length });
  const count = active && calls.length > 1 ? calls.length : undefined;
  const failed = calls.filter((call) => call.error !== undefined).length;

  // A lone call owns the panel itself: a summary above one row says the same thing twice, and the
  // outer disclosure is the one that opens onto its payload.
  const single = calls.length === 1 ? calls[0] : undefined;
  const header = single?.title ?? summary;

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
        <span className='flex min-w-0 items-center gap-1 text-description tabular-nums'>
          <span className={mx('truncate', single?.error !== undefined && 'text-error')}>{header}</span>
          {count !== undefined && <span className='shrink-0'>({count})</span>}
          {failed > 0 && <span className='shrink-0 text-error'>· {t('tool-failed.label', { count: failed })}</span>}
        </span>
      </TogglePanel.Header>
      {/* No `Viewport`: its `overflow-y-auto` puts a scrollbar on the body for the length of the
          ramp, while the box is still shorter than the content it is growing to hold. */}
      <TogglePanel.Body>
        {single ? (
          // Pads itself only here: inside the accordion the body already insets by `trim-sm`, and
          // padding twice pushed the copy button off the caret's column.
          <ToolCallDetail call={single} classNames={mx(PANEL_FRAME, 'p-trim-sm')} />
        ) : (
          <ToolCallList calls={calls} onOpen={onChangeOpen} />
        )}
      </TogglePanel.Body>
    </TogglePanel.Root>
  );
};

type ToolCallListProps = {
  calls: ToolCallEntry[];
  onOpen?: (open: boolean) => void;
};

/**
 * The run's calls as an accordion, so each row opens onto its own payload and the machine supplies
 * the APG keymap the hand-rolled rows never had.
 *
 * Rows are collapsed by default: one that opened itself would change this item's height, and the
 * feed measures that height as the row mounts.
 */
const ToolCallList = ({ calls, onOpen }: ToolCallListProps) => (
  <Accordion.Root<ToolCallEntry>
    items={calls}
    // No `overflow-hidden`: it clips the top and bottom edges off the inset focus ring of the
    // first and last triggers, whose bounds coincide with the frame's own.
    classNames={mx(PANEL_FRAME, 'divide-y divide-subdued-separator')}
    onValueChange={(value) => onOpen?.(value.length > 0)}
  >
    {({ items }) =>
      items.map((call) =>
        // Nothing to open onto: a caret that reveals emptiness reads as a failure, so a call with
        // no payload is a plain row rather than an accordion item.
        hasDetail(call) ? (
          <Accordion.Item key={call.id} item={call}>
            <Accordion.ItemHeader
              hover
              icon={call.icon ?? DEFAULT_TOOL_ICON}
              data-testid='assistant.tool-call'
              classNames={mx('text-sm', call.error !== undefined && 'text-error')}
            >
              <span className='truncate'>{call.title}</span>
            </Accordion.ItemHeader>
            <Accordion.ItemBody>
              <ToolCallDetail call={call} />
            </Accordion.ItemBody>
          </Accordion.Item>
        ) : (
          <div
            key={call.id}
            className='flex items-center gap-2 px-2 text-sm min-h-(--dx-control)'
            data-testid='assistant.tool-call'
          >
            <Icon icon={call.icon ?? DEFAULT_TOOL_ICON} size={4} />
            <span className={mx('truncate', call.error !== undefined && 'text-error')}>{call.title}</span>
          </div>
        ),
      )
    }
  </Accordion.Root>
);

/** What a call carries, in the order it happened. */
const ToolCallDetail = ({ call, classNames }: { call: ToolCallEntry; classNames?: string }) => {
  const { t } = useTranslation(translationKey);
  return (
    // `min-w-0` so a wide payload scrolls inside its own section rather than widening this column
    // and taking the summary row with it.
    <div className={mx('flex flex-col gap-1 min-w-0', classNames)}>
      {call.input !== undefined && <ToolSection label={t('tool-input.label')} data={call.input} />}
      {call.error !== undefined && <ToolSection label={t('tool-error.label')} data={call.error} />}
      {call.result !== undefined && <ToolSection label={t('tool-result.label')} data={call.result} />}
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

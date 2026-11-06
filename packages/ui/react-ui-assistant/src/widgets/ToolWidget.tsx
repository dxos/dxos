//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useEffect, useMemo } from 'react';

import { type TogglePanelRootProps } from '@dxos/react-ui-components';
import { JsonHighlighter, SyntaxHighlighter } from '@dxos/react-ui-syntax-highlighter';
import * as Accordion from '@dxos/react-ui/Accordion';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as SystemButton from '@dxos/react-ui/SystemButton';
import { type ContentBlock } from '@dxos/types';
import { type WidgetProps, getXmlTextChild } from '@dxos/ui-editor';
import { mx } from '@dxos/ui-theme';
import { safeParseJson } from '@dxos/util';

import { translationKey } from '../translations.ts';
import { TOOL_ICON, type ToolEntry, toEntries } from './tool-entries.ts';
import { PANEL_FRAME, WidgetPanel, WidgetPanelRow } from './WidgetPanel.tsx';

export type ToolWidgetProps = WidgetProps;

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

type ToolPanelProps = {
  entries: ToolEntry[];
} & Pick<TogglePanelRootProps, 'onChangeOpen'>;

/**
 * The row's own words. Reasoning names the kind instead of its prose: it runs to paragraphs, and a
 * truncated first line reads as a broken title rather than a summary.
 */
const entryLabel = (entry: ToolEntry, t: ReturnType<typeof Hooks.useTranslation>['t']): string =>
  entry.kind === 'reasoning' ? t('tool-thinking.label') : entry.background ? t('tool-background.label') : entry.title;

/** Whether the row carries anything an expansion could show. */
const hasDetail = (entry: ToolEntry): boolean =>
  entry.text !== undefined || entry.input !== undefined || entry.error !== undefined || entry.result !== undefined;

const ToolPanel = ({ entries, onChangeOpen }: ToolPanelProps) => {
  const { t } = Hooks.useTranslation(translationKey);

  const calls = entries.filter((entry) => entry.kind === 'call');
  const status = entries.filter((entry) => entry.kind === 'status').at(-1);
  const failed = calls.filter((call) => call.error !== undefined).length;

  // A lone row owns the panel itself: a summary above one row says the same thing twice, and the
  // outer disclosure is the one that opens onto its payload.
  const single = entries.length === 1 ? entries[0] : undefined;
  const singleCall = single?.kind === 'call' ? single : undefined;

  // Four shapes, in the order a reader needs them: a run that never reached a call, named by the
  // narration that is all it holds; the narration with the run's count behind it while a call is
  // still unanswered; a lone call's name; and otherwise the count.
  //
  // Narration leads only while the run is in flight. It says what the model is ABOUT to do, so on a
  // settled run it reads as a sentence stalled mid-step — and the count is what the reader wants
  // from a run that is over.
  const count = t('tool-run.label', { count: calls.length });
  const narrating = calls.length === 0 ? (status ?? entries[entries.length - 1]) : undefined;
  // Reasoning stands in for a missing status: a run whose only narration is thought still has
  // something to say about what it is doing, and the bare count says nothing.
  const reasoning = entries.filter((entry) => entry.kind === 'reasoning').at(-1);
  const running = calls.some((call) => call.active) ? (status ?? reasoning) : undefined;
  const header = narrating
    ? entryLabel(narrating, t)
    : running
      ? `${entryLabel(running, t)} · ${t('tool-run-suffix.label', { count: calls.length })}`
      : singleCall
        ? entryLabel(singleCall, t)
        : count;
  const icon = narrating?.icon ?? running?.icon ?? singleCall?.icon ?? TOOL_ICON;

  // Nothing an expansion could show — a lone status, which is what a run looks like while the model
  // is still saying what it is about to do. A caret that reveals emptiness reads as a failure, so
  // the row stays plain prose until a call or a second line of narration joins it.
  if (single && !hasDetail(single)) {
    return <WidgetPanelRow icon={icon} label={header} testId={`assistant.tool-${single.kind}`} />;
  }

  return (
    <WidgetPanel
      icon={icon}
      label={header}
      error={single?.error !== undefined}
      suffix={
        failed > 0 && <span className='shrink-0 text-error-text'>· {t('tool-failed.label', { count: failed })}</span>
      }
      testId={singleCall ? 'assistant.tool-call' : 'assistant.tool-run'}
      onChangeOpen={onChangeOpen}
      // A thread is a column of these, nearly all left closed; building each payload at mount was
      // most of the cost of scrolling one into view.
      lazyMount
    >
      {single ? (
        // Pads itself only here: inside the accordion the body already insets by `trim-sm`, and
        // padding twice pushed the copy button off the caret's column.
        <ToolCallDetail entry={single} classNames={mx(PANEL_FRAME, 'p-trim-sm')} />
      ) : (
        <ToolCallList entries={entries} onOpen={onChangeOpen} />
      )}
    </WidgetPanel>
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
  const { t } = Hooks.useTranslation(translationKey);
  const label = (entry: ToolEntry) => entryLabel(entry, t);

  return (
    <Accordion.Root onValueChange={(value) => onOpen?.(value.length > 0)}>
      {entries.map((entry) => {
        // Nothing to open onto: a caret that reveals emptiness reads as a failure, so a row with
        // no payload is a disabled item — same frame and rhythm, no caret, no toggle.
        const detail = hasDetail(entry);
        return (
          <Accordion.Item key={entry.id} value={entry.id} disabled={!detail}>
            <Accordion.ItemTrigger
              icon={entry.icon}
              data-testid={`assistant.tool-${entry.kind}`}
              classNames={mx('text-sm', entry.error !== undefined && 'text-error-text')}
            >
              {/* The icon wrappers are a control tall; the label centres on that line rather than its top. */}
              <span className='flex items-center h-(--dx-control-sm) min-w-0'>
                <span className='truncate'>{label(entry)}</span>
              </span>
            </Accordion.ItemTrigger>
            {detail && (
              <Accordion.ItemContent classNames='px-2'>
                <ToolCallDetail entry={entry} />
              </Accordion.ItemContent>
            )}
          </Accordion.Item>
        );
      })}
    </Accordion.Root>
  );
};

/** What a row carries, in the order it happened. */
const ToolCallDetail = ({ entry, classNames }: { entry: ToolEntry; classNames?: string }) => {
  const { t } = Hooks.useTranslation(translationKey);
  return (
    // `min-w-0` so a wide payload scrolls inside its own section rather than widening this column
    // and taking the summary row with it.
    <div className={mx('flex flex-col gap-1 min-w-0', classNames)}>
      {entry.text !== undefined && (
        <p className='text-sm text-fg-muted whitespace-pre-wrap px-1 py-trim-sm'>{entry.text}</p>
      )}
      {entry.input !== undefined && <ToolSection label={t('tool-input.label')} data={entry.input} />}
      {entry.error !== undefined && <ToolSection label={t('tool-error.label')} data={entry.error} />}
      {entry.result !== undefined && <ToolSection label={t('tool-result.label')} data={entry.result} />}
    </div>
  );
};

/** Longer than this, JSON rendering truncates a string, so a text field is shown as text instead. */
const MAX_JSON_STRING_LENGTH = 128;

const ToolSection = ({ label, data }: { label: string; data: unknown }) => (
  <div className='flex flex-col'>
    {/* No horizontal padding of its own: the containing body already insets by `trim-sm`, and a
        second inset here pushed the copy button off the column the disclosure carets sit in. */}
    <div className='flex items-center justify-between'>
      <span className='text-sm text-fg-muted'>{label}</span>
      {/* `-me-1` cancels the button's own trailing inset so its glyph centres on the same column as
        the disclosure caret rather than sitting a few pixels inside it. */}
      <SystemButton.Clipboard
        variant='ghost'
        size='sm'
        iconOnly
        classNames='-me-1'
        onCopy={() => JSON.stringify(data)}
      />
    </div>
    {multilineFields(data)?.map(([key, value], _, fields) => (
      <div key={key} className='flex flex-col'>
        {fields.length > 1 && <span className='text-xs text-fg-muted'>{key}</span>}
        <SyntaxHighlighter
          language={key === 'code' ? 'js' : 'text'}
          scroll='horizontal'
          classNames='text-xs bg-transparent'
        >
          {value}
        </SyntaxHighlighter>
      </div>
    )) ?? (
      <JsonHighlighter
        data={data}
        // Inline axis only: a long line scrolls here rather than carrying the summary row out of view,
        // while the block axis stays put so the disclosure's height ramp draws no vertical scrollbar.
        scroll='horizontal'
        classNames='text-xs bg-transparent'
        replacer={{ maxDepth: 3, maxArrayLen: 10, maxStringLen: MAX_JSON_STRING_LENGTH }}
      />
    )}
  </div>
);

/**
 * A string, or the entries of a record whose fields are all strings, when one spans lines or runs
 * long — a code-mode `eval`'s `code` and its printed output. JSON would escape every newline onto
 * one line and cut the string short, so these render as the text they are.
 */
const multilineFields = (data: unknown): [string, string][] | undefined => {
  if (typeof data === 'string') {
    return isMultiline(data) ? [['', data]] : undefined;
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return undefined;
  }
  const entries = Object.entries(data);
  const strings = entries.flatMap(([key, value]): [string, string][] =>
    typeof value === 'string' ? [[key, value]] : [],
  );
  return strings.length > 0 && strings.length === entries.length && strings.some(([, value]) => isMultiline(value))
    ? strings
    : undefined;
};

const isMultiline = (value: string): boolean => value.includes('\n') || value.length > MAX_JSON_STRING_LENGTH;

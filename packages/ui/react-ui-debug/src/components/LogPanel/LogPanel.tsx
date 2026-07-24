//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, type LogOptions, log, shouldLog } from '@dxos/log';
import {
  IconButton,
  Input,
  Panel,
  ScrollArea,
  Select,
  type ThemedClassName,
  ToggleIconButton,
  Toolbar,
  useTranslation,
} from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { translationKey } from '../../translations';
import { formatLogEntry } from './format';

const LEVELS = ['trace', 'debug', 'verbose', 'info', 'warn', 'error'] as const;

const DEFAULT_MAX_LINES = 1000;

const levelColor = (level: LogLevel) =>
  level > LogLevel.WARN
    ? 'text-error-text'
    : level > LogLevel.INFO
      ? 'text-warning-text'
      : level > LogLevel.VERBOSE
        ? 'text-info-text'
        : 'text-success-text';

// Ref-counted global-config ownership so concurrent panels restore the original config only after the last stops.
let activeRecorders = 0;
let sharedSavedOptions: LogOptions | undefined;

const acquireLogConfig = (): void => {
  if (activeRecorders === 0) {
    sharedSavedOptions = log.runtimeConfig.options;
  }
  activeRecorders += 1;
};

const releaseLogConfig = (): void => {
  activeRecorders = Math.max(0, activeRecorders - 1);
  if (activeRecorders === 0 && sharedSavedOptions) {
    log.config(sharedSavedOptions);
    sharedSavedOptions = undefined;
  }
};

// Guard clipboard writes so rejected or unavailable writes surface rather than dangling as unhandled rejections.
const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text)?.catch((err) => console.warn('clipboard write failed', err));
};

export type LogPanelProps = ThemedClassName<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
}>;

type LogRow = { id: number; entry: LogEntry };

/**
 * In-app viewer for the live `@dxos/log` stream — filter, set level, record/pause,
 * clear, and copy without opening DevTools.
 */
export const LogPanel = ({
  classNames,
  maxLines = DEFAULT_MAX_LINES,
  initialFilter = 'info',
  defaultRecording = true,
}: LogPanelProps) => {
  const { t } = useTranslation(translationKey);
  const [filter, setFilter] = useState(initialFilter);
  const [recording, setRecording] = useState(defaultRecording);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  // Normalize the public prop: a non-positive or non-finite bound would defeat `slice(-capacity)`.
  const capacity = useMemo(
    () => (Number.isFinite(maxLines) && maxLines >= 1 ? Math.floor(maxLines) : DEFAULT_MAX_LINES),
    [maxLines],
  );

  // Monotonic id so list keys stay stable once `slice(-capacity)` drops older rows.
  const nextRowId = useRef(0);

  // Acquire/release the shared global-config ownership across the recording lifetime (ref-counted across panels).
  useEffect(() => {
    if (!recording) {
      return;
    }

    acquireLogConfig();
    return () => releaseLogConfig();
  }, [recording]);

  // Apply the filter and capture entries while recording; the filter also drives the global logging level.
  useEffect(() => {
    if (!recording) {
      return;
    }

    log.config({ filter });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      if (shouldLog(entry, config.filters)) {
        setRows((prev) => [...prev, { id: nextRowId.current++, entry }].slice(-capacity));
      }
    });

    return () => dispose();
  }, [recording, filter, capacity]);

  // Keep the viewport pinned to the newest entry.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [rows]);

  const handleClear = useCallback(() => {
    setRows([]);
    setExpanded(new Set());
  }, []);
  const handleCopyAll = useCallback(() => {
    copyToClipboard(
      JSON.stringify(
        rows.map(({ entry }) => formatLogEntry(entry)),
        null,
        2,
      ),
    );
  }, [rows]);
  const handleToggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  // A bare level matching the filter selects it; a scoped filter shows no selection.
  const selectedLevel = (LEVELS as readonly string[]).includes(filter) ? filter : '';

  return (
    <Panel.Root classNames={mx(classNames)}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Input.Root>
            <Input.TextInput
              placeholder={t('filter.placeholder')}
              value={filter}
              autoComplete='off'
              spellCheck={false}
              onChange={(ev) => setFilter(ev.target.value)}
            />
          </Input.Root>
          <Select.Root value={selectedLevel} onValueChange={setFilter}>
            <Select.TriggerButton classNames='w-[6rem] text-sm' placeholder={t('level.label')} />
            <Select.Portal>
              <Select.Content>
                <Select.ScrollUpButton />
                <Select.Viewport>
                  {LEVELS.map((level) => (
                    <Select.Option key={level} value={level} classNames='text-sm'>
                      {t(`level.${level}`)}
                    </Select.Option>
                  ))}
                </Select.Viewport>
                <Select.ScrollDownButton />
                <Select.Arrow />
              </Select.Content>
            </Select.Portal>
          </Select.Root>
          <ToggleIconButton
            active={recording}
            icon='ph--record--regular'
            activeIcon='ph--pause--regular'
            iconOnly
            label={t('record.label')}
            onClick={() => setRecording((value) => !value)}
          />
          <Toolbar.IconButton icon='ph--eraser--regular' iconOnly label={t('clear.label')} onClick={handleClear} />
          <Toolbar.IconButton icon='ph--clipboard--regular' iconOnly label={t('copy.label')} onClick={handleCopyAll} />
        </Toolbar.Root>
      </Panel.Toolbar>

      <Panel.Content asChild>
        <ScrollArea.Root orientation='vertical' thin>
          <ScrollArea.Viewport ref={viewportRef} classNames='text-xs'>
            {rows.length === 0 && <div className='p-2 text-subdued'>{t('empty.message')}</div>}
            {rows.map(({ id, entry }) => {
              const record = formatLogEntry(entry);
              const expandable = Boolean(record.context || record.error);
              return (
                <div key={id} className='group px-1'>
                  <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
                    <div className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</div>
                    <div className='truncate text-subdued'>{record.file}</div>
                    <button
                      type='button'
                      aria-expanded={expandable ? expanded.has(id) : undefined}
                      className='truncate text-start cursor-pointer'
                      title={record.message}
                      onClick={() => handleToggleExpand(id)}
                    >
                      {record.message}
                    </button>
                    <IconButton
                      icon='ph--clipboard--regular'
                      iconOnly
                      density='xs'
                      label={t('copy-entry.label')}
                      variant='ghost'
                      classNames='p-0 opacity-50 group-hover:opacity-100'
                      onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                    />
                  </div>
                  {expanded.has(id) && expandable && (
                    <pre className='px-4 py-1 whitespace-pre-wrap text-subdued'>
                      {JSON.stringify({ context: record.context, error: record.error }, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })}
          </ScrollArea.Viewport>
        </ScrollArea.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

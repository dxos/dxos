//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, type LogOptions, log, logFileRegistry, shouldLog } from '@dxos/log';
import {
  IconButton,
  Input,
  Popover,
  ScrollArea,
  Select,
  type ThemedClassName,
  ToggleIconButton,
  Toolbar,
  composable,
  composableProps,
  useTranslation,
} from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '../../translations';
import { formatLogEntry } from './format';

//
// Shared
//

export const LEVELS = ['trace', 'debug', 'verbose', 'info', 'warn', 'error'] as const;
export type LevelName = (typeof LEVELS)[number];

const DEFAULT_MAX_LINES = 1_000;

export const levelColor = (level: LogLevel) =>
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
export const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text)?.catch((err) => console.warn('clipboard write failed', err));
};

type LogRow = { id: number; entry: LogEntry };

// Compose the base filter with per-file overrides into a single @dxos/log filter string.
// Order-independent: an override below the base level raises that file's verbosity; above, it quiets it.
export const composeFilter = (base: string, fileLevels: Map<string, LevelName>): string =>
  [base, ...[...fileLevels].map(([file, level]) => `${file}:${level}`)].filter(Boolean).join(', ');

//
// Context
//

type LoggerContextValue = {
  rows: LogRow[];
  filter: string;
  setFilter: (filter: string) => void;
  recording: boolean;
  setRecording: (fn: (value: boolean) => boolean) => void;
  files: string[];
  fileLevels: Map<string, LevelName>;
  setFileLevel: (file: string, level: LevelName | undefined) => void;
  clearFileLevels: () => void;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  clear: () => void;
  copyAll: () => void;
};

const [LoggerProvider, useLoggerContext] = createContext<LoggerContextValue>('Logger');

//
// Root
//

export type LoggerRootProps = PropsWithChildren<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
}>;

const LoggerRoot = ({
  children,
  maxLines = DEFAULT_MAX_LINES,
  initialFilter = 'info',
  defaultRecording = true,
}: LoggerRootProps) => {
  const [filter, setFilter] = useState(initialFilter);
  const [recording, setRecording] = useState(defaultRecording);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fileLevels, setFileLevels] = useState<Map<string, LevelName>>(new Map());
  const [files, setFiles] = useState<string[]>(() => logFileRegistry.getFiles());

  // Union any newly seen file into the sorted set (registry load-time entries and stream entries alike).
  const addFile = useCallback((file: string) => {
    setFiles((prev) => (prev.includes(file) ? prev : [...prev, file].sort()));
  }, []);

  // Track files registered at module load (dev registry), unioned with the initial snapshot.
  useEffect(() => {
    const sync = () => {
      for (const file of logFileRegistry.getFiles()) {
        addFile(file);
      }
    };
    sync();
    return logFileRegistry.subscribe(sync);
  }, [addFile]);

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

  // Apply the composed filter and capture entries while recording; discover every file regardless of the display filter.
  const effectiveFilter = useMemo(() => composeFilter(filter, fileLevels), [filter, fileLevels]);
  useEffect(() => {
    if (!recording) {
      return;
    }

    log.config({ filter: effectiveFilter });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      const file = entry.meta?.F;
      if (file) {
        addFile(file);
      }
      if (shouldLog(entry, config.filters)) {
        setRows((prev) => [...prev, { id: nextRowId.current++, entry }].slice(-capacity));
      }
    });

    return () => dispose();
  }, [recording, effectiveFilter, capacity, addFile]);

  // Drop expansion state for evicted rows so the set stays bounded (no-op while nothing is expanded).
  useEffect(() => {
    setExpanded((prev) => {
      if (prev.size === 0) {
        return prev;
      }
      const ids = new Set(rows.map((row) => row.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [rows]);

  const setFileLevel = useCallback((file: string, level: LevelName | undefined) => {
    setFileLevels((prev) => {
      const next = new Map(prev);
      if (level) {
        next.set(file, level);
      } else {
        next.delete(file);
      }
      return next;
    });
  }, []);
  const clearFileLevels = useCallback(() => setFileLevels(new Map()), []);
  const clear = useCallback(() => {
    setRows([]);
    setExpanded(new Set());
  }, []);
  const copyAll = useCallback(() => {
    copyToClipboard(
      JSON.stringify(
        rows.map(({ entry }) => formatLogEntry(entry)),
        null,
        2,
      ),
    );
  }, [rows]);
  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  return (
    <LoggerProvider
      rows={rows}
      filter={filter}
      setFilter={setFilter}
      recording={recording}
      setRecording={setRecording}
      files={files}
      fileLevels={fileLevels}
      setFileLevel={setFileLevel}
      clearFileLevels={clearFileLevels}
      expanded={expanded}
      toggleExpand={toggleExpand}
      clear={clear}
      copyAll={copyAll}
    >
      {children}
    </LoggerProvider>
  );
};

LoggerRoot.displayName = 'Logger.Root';

//
// Toolbar
//

export type LoggerToolbarProps = ComposableProps;

const LoggerToolbar = composable<HTMLDivElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { filter, setFilter, recording, setRecording, clear, copyAll } = useLoggerContext('Logger.Toolbar');

  // A bare level matching the filter selects it; a scoped filter shows no selection.
  const selectedLevel = (LEVELS as readonly string[]).includes(filter) ? filter : '';

  return (
    <Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
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
      <LoggerLevels />
      <ToggleIconButton
        active={recording}
        icon='ph--record--regular'
        activeIcon='ph--pause--regular'
        iconOnly
        label={t('record.label')}
        onClick={() => setRecording((value) => !value)}
      />
      <Toolbar.IconButton icon='ph--eraser--regular' iconOnly label={t('clear.label')} onClick={clear} />
      <Toolbar.IconButton icon='ph--clipboard--regular' iconOnly label={t('copy.label')} onClick={copyAll} />
    </Toolbar.Root>
  );
});

LoggerToolbar.displayName = 'Logger.Toolbar';

//
// Levels
//

export type LoggerLevelsProps = ThemedClassName<{}>;

const LoggerLevels = ({ classNames }: LoggerLevelsProps) => {
  const { t } = useTranslation(translationKey);
  const { files, fileLevels, setFileLevel, clearFileLevels } = useLoggerContext('Logger.Levels');

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Toolbar.IconButton
          icon='ph--sliders--regular'
          iconOnly
          label={t('levels.label')}
          classNames={mx(fileLevels.size > 0 && 'text-primary-text', classNames)}
        />
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content>
          <Popover.Viewport classNames='is-[22rem] max-bs-[20rem] overflow-y-auto p-2'>
            <div className='flex items-center justify-between pb-1'>
              <span className='text-sm text-subdued'>{t('levels.title')}</span>
              <IconButton
                icon='ph--x--regular'
                iconOnly
                density='xs'
                variant='ghost'
                label={t('levels.clear')}
                disabled={fileLevels.size === 0}
                onClick={clearFileLevels}
              />
            </div>
            {files.length === 0 && <div className='p-1 text-xs text-subdued'>{t('levels.empty')}</div>}
            {files.length > 0 && (
              <Listbox.Root>
                <Listbox.Content>
                  {files.map((file) => {
                    const basename = file.split('/').pop() ?? file;
                    const value = fileLevels.get(file) ?? 'inherit';
                    return (
                      <Listbox.Item key={file} id={file} classNames='grid grid-cols-[1fr_7rem] items-center gap-1'>
                        <Listbox.ItemLabel classNames='text-xs' title={file}>
                          {basename}
                        </Listbox.ItemLabel>
                        <Select.Root
                          value={value}
                          onValueChange={(next) =>
                            setFileLevel(file, next === 'inherit' ? undefined : (next as LevelName))
                          }
                        >
                          <Select.TriggerButton classNames='is-full text-sm' placeholder={t('levels.inherit')} />
                          <Select.Portal>
                            <Select.Content>
                              <Select.ScrollUpButton />
                              <Select.Viewport>
                                <Select.Option value='inherit' classNames='text-sm'>
                                  {t('levels.inherit')}
                                </Select.Option>
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
                      </Listbox.Item>
                    );
                  })}
                </Listbox.Content>
              </Listbox.Root>
            )}
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
};

LoggerLevels.displayName = 'Logger.Levels';

//
// Content
//

export type LoggerContentProps = ComposableProps;

const LoggerContent = composable<HTMLDivElement>(({ children, ...props }, forwardedRef) => {
  const { rows } = useLoggerContext('Logger.Content');

  // Keep the viewport pinned to the newest entry.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [rows]);

  return (
    <ScrollArea.Root {...composableProps(props)} orientation='vertical' thin ref={forwardedRef}>
      <ScrollArea.Viewport ref={viewportRef} classNames='text-xs'>
        {children}
      </ScrollArea.Viewport>
    </ScrollArea.Root>
  );
});

LoggerContent.displayName = 'Logger.Content';

//
// List
//

export type LoggerListProps = ThemedClassName<{}>;

const LoggerList = ({ classNames }: LoggerListProps) => {
  const { t } = useTranslation(translationKey);
  const { rows, expanded, toggleExpand } = useLoggerContext('Logger.List');

  if (rows.length === 0) {
    return <div className={mx('p-2 text-subdued', classNames)}>{t('empty.message')}</div>;
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames={mx(classNames)}>
        {rows.map(({ id, entry }) => {
          const record = formatLogEntry(entry);
          const expandable = Boolean(record.context || record.error);
          return (
            <Listbox.Item key={id} id={String(id)} classNames='group px-1'>
              <div className='flex flex-col is-full'>
                <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
                  <div className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</div>
                  <div className='truncate text-subdued'>{record.file}</div>
                  <button
                    type='button'
                    aria-expanded={expandable ? expanded.has(id) : undefined}
                    className='truncate text-start cursor-pointer'
                    title={record.message}
                    onClick={() => toggleExpand(id)}
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
            </Listbox.Item>
          );
        })}
      </Listbox.Content>
    </Listbox.Root>
  );
};

LoggerList.displayName = 'Logger.List';

export { useLoggerContext };

//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, type LogOptions, log, logFileRegistry, shouldLog } from '@dxos/log';
import {
  Icon,
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
  textFilter: string;
  setTextFilter: (value: string) => void;
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

type LoggerRootProps = PropsWithChildren<{
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
  const [textFilter, setTextFilter] = useState('');
  const [recording, setRecording] = useState(defaultRecording);
  const [rows, setRows] = useState<LogRow[]>([]);
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [fileLevels, setFileLevels] = useState<Map<string, LevelName>>(new Map());
  // Set membership is O(1); the sorted view is memoized so a high-volume stream never re-sorts per entry.
  const filesRef = useRef<Set<string>>(new Set(logFileRegistry.getFiles()));
  const [filesEpoch, setFilesEpoch] = useState(0);
  const addFile = useCallback((file: string) => {
    if (file && !filesRef.current.has(file)) {
      filesRef.current.add(file);
      setFilesEpoch((epoch) => epoch + 1);
    }
  }, []);

  // Absorb files registered at module load (dev registry) plus any registered after mount.
  useEffect(() => {
    const sync = () => {
      let changed = false;
      for (const file of logFileRegistry.getFiles()) {
        if (!filesRef.current.has(file)) {
          filesRef.current.add(file);
          changed = true;
        }
      }
      if (changed) {
        setFilesEpoch((epoch) => epoch + 1);
      }
    };
    sync();
    return logFileRegistry.subscribe(sync);
  }, []);

  // Cache the sorted list; recomputed only when the file set actually grows.
  const files = useMemo(() => [...filesRef.current].sort(), [filesEpoch]);

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
      textFilter={textFilter}
      setTextFilter={setTextFilter}
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

type LoggerToolbarProps = ComposableProps;

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

type LoggerLevelsProps = ThemedClassName<{}>;

const LoggerLevels = ({ classNames }: LoggerLevelsProps) => {
  const { t } = useTranslation(translationKey);
  const { files, fileLevels, setFileLevel, clearFileLevels } = useLoggerContext('Logger.Levels');
  const [fileFilter, setFileFilter] = useState('');

  // `files` arrives already sorted from the provider; narrow it by a case-insensitive path match.
  const needle = fileFilter.trim().toLowerCase();
  const visibleFiles = needle ? files.filter((file) => file.toLowerCase().includes(needle)) : files;

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
          <Popover.Viewport classNames='w-[22rem] max-h-[20rem]'>
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
            {files.length > 0 && (
              <Input.Root>
                <Input.TextInput
                  placeholder={t('levels.filter.placeholder')}
                  value={fileFilter}
                  autoComplete='off'
                  spellCheck={false}
                  onChange={(ev) => setFileFilter(ev.target.value)}
                />
              </Input.Root>
            )}
            {visibleFiles.length === 0 && (
              <div className='p-1 text-xs text-subdued'>
                {t(files.length === 0 ? 'levels.empty' : 'search.no-matches')}
              </div>
            )}
            {visibleFiles.length > 0 && (
              <Listbox.Root>
                <Listbox.Content>
                  {visibleFiles.map((file) => {
                    const basename = file.split('/').pop() ?? file;
                    const value = fileLevels.get(file) ?? 'inherit';
                    return (
                      <Listbox.Item key={file} id={file} classNames='grid grid-cols-[1fr_7rem] items-center gap-1 py-0'>
                        <Listbox.ItemLabel classNames='text-xs' title={file}>
                          {basename}
                        </Listbox.ItemLabel>
                        <Select.Root
                          value={value}
                          onValueChange={(next) =>
                            setFileLevel(file, next === 'inherit' ? undefined : (next as LevelName))
                          }
                        >
                          <Select.TriggerButton classNames='w-full text-sm' placeholder={t('levels.inherit')} />
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

type LoggerContentProps = ComposableProps;

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

type LoggerListProps = ThemedClassName<{}>;

const LoggerList = ({ classNames }: LoggerListProps) => {
  const { t } = useTranslation(translationKey);
  const { rows, expanded, toggleExpand, textFilter } = useLoggerContext('Logger.List');

  // Compute the display record once; filter the buffer by a case-insensitive match on file + message.
  const needle = textFilter.trim().toLowerCase();
  const visible = rows
    .map((row) => ({ ...row, record: formatLogEntry(row.entry) }))
    .filter(({ record }) =>
      needle ? `${record.file ?? ''} ${record.message ?? ''}`.toLowerCase().includes(needle) : true,
    );

  if (visible.length === 0) {
    return (
      <div className={mx('p-2 text-subdued', classNames)}>
        {t(rows.length === 0 ? 'empty.message' : 'search.no-matches')}
      </div>
    );
  }

  return (
    <Listbox.Root>
      <Listbox.Content classNames={mx(classNames)}>
        {visible.map(({ id, entry, record }) => (
          <Listbox.Item
            key={id}
            id={String(id)}
            classNames='group grid grid-cols-[1rem_8rem_1fr_max-content] items-center gap-2 px-2 py-0.5'
          >
            <span className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</span>
            <span className='truncate text-subdued'>{record.file}</span>
            <button
              type='button'
              aria-expanded={expanded.has(id)}
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
            {expanded.has(id) && (
              <pre className='col-span-full px-4 py-1 whitespace-pre-wrap text-subdued'>
                {JSON.stringify({ message: record.message, context: record.context, error: record.error }, null, 2)}
              </pre>
            )}
          </Listbox.Item>
        ))}
      </Listbox.Content>
    </Listbox.Root>
  );
};

LoggerList.displayName = 'Logger.List';

//
// Filter
//

type LoggerFilterProps = ComposableProps;

const LoggerFilter = composable<HTMLDivElement>((props, forwardedRef) => {
  const { t } = useTranslation(translationKey);
  const { textFilter, setTextFilter } = useLoggerContext('Logger.Filter');

  return (
    <Toolbar.Root {...composableProps(props)} ref={forwardedRef}>
      <Input.Root>
        <Input.TextInput
          placeholder={t('search.placeholder')}
          value={textFilter}
          autoComplete='off'
          spellCheck={false}
          onChange={(ev) => setTextFilter(ev.target.value)}
          start={<Icon icon='ph--magnifying-glass--regular' />}
        />
      </Input.Root>
      {textFilter.length > 0 && (
        <Toolbar.IconButton
          icon='ph--x--regular'
          iconOnly
          label={t('search.clear')}
          onClick={() => setTextFilter('')}
        />
      )}
    </Toolbar.Root>
  );
});

LoggerFilter.displayName = 'Logger.Filter';

//
// Logger
//

export const Logger = {
  Root: LoggerRoot,
  Toolbar: LoggerToolbar,
  Content: LoggerContent,
  List: LoggerList,
  Levels: LoggerLevels,
  Filter: LoggerFilter,
};

export { useLoggerContext };

export type {
  LoggerContentProps,
  LoggerFilterProps,
  LoggerLevelsProps,
  LoggerListProps,
  LoggerRootProps,
  LoggerToolbarProps,
};

//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type PropsWithChildren, useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  type LogConfig,
  type LogEntry,
  LogLevel,
  type LogOptions,
  log,
  logFileRegistry,
  parseFilter,
  shouldLog,
} from '@dxos/log';
import {
  ErrorStack,
  Icon,
  IconButton,
  Input,
  Panel,
  Popover,
  ScrollArea,
  Select,
  type ThemedClassName,
  ToggleIconButton,
  Toolbar,
  composable,
  composableProps,
  parseCaptureOwnerStack,
  useTranslation,
} from '@dxos/react-ui';
import { Listbox } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
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

// Registry of active recording sessions; each contributes its own filter so concurrent panels
// compose the shared @dxos/log config instead of the last writer clobbering it.
type ActiveRecorder = { filter: string };
const activeRecorders = new Set<ActiveRecorder>();
let sharedSavedOptions: LogOptions | undefined;

// Union of every active recorder's filter so the shared config (and other processors, e.g. the
// console) capture at least what every panel wants; each recorder still self-filters its own view.
const composeGlobalFilter = (): string =>
  [...activeRecorders]
    .map((recorder) => recorder.filter)
    .filter(Boolean)
    .join(', ');

const applyGlobalFilter = (): void => {
  log.config({ filter: composeGlobalFilter() });
};

export interface LogRecorder {
  /** Update this recorder's filter and recompose the shared global config. */
  setFilter(filter: string): void;
  /** Unregister; restores the saved global config once the last recorder stops. */
  dispose(): void;
}

/**
 * Register a recording session that self-filters its own entries (via its own parsed filter)
 * while contributing that filter to the shared @dxos/log config. Because every entry is
 * delivered to every processor, self-filtering — not the shared config — is what keeps
 * concurrent recorders with divergent filters from clobbering each other's view.
 */
export const startLogRecording = (
  filter: string,
  onEntry: (entry: LogEntry, matched: boolean) => void,
): LogRecorder => {
  const recorder: ActiveRecorder = { filter };
  if (activeRecorders.size === 0) {
    sharedSavedOptions = log.runtimeConfig.options;
  }
  activeRecorders.add(recorder);
  applyGlobalFilter();

  let filters = parseFilter(filter);
  const dispose = log.addProcessor((_config: LogConfig, entry: LogEntry) => onEntry(entry, shouldLog(entry, filters)));

  return {
    setFilter: (next) => {
      recorder.filter = next;
      filters = parseFilter(next);
      applyGlobalFilter();
    },
    dispose: () => {
      dispose();
      activeRecorders.delete(recorder);
      if (activeRecorders.size === 0) {
        if (sharedSavedOptions) {
          log.config(sharedSavedOptions);
          sharedSavedOptions = undefined;
        }
      } else {
        applyGlobalFilter();
      }
    },
  };
};

// Guard clipboard writes so rejected or unavailable writes surface rather than dangling as unhandled rejections.
export const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text)?.catch((err) => console.warn('clipboard write failed', err));
};

type LogRow = { id: number; entry: LogEntry };

// Derive the workspace package directory from a source path (…/packages/<group>/<pkg>/…) for display/grouping.
const packageName = (file: string): string | undefined => file.match(/packages\/[^/]+\/([^/]+)\//)?.[1];

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
  current: number | undefined;
  setCurrent: (id: number) => void;
  checked: Set<number>;
  toggleChecked: (id: number) => void;
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
  const [current, setCurrent] = useState<number>();
  const [checked, setChecked] = useState<Set<number>>(new Set());
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

  const effectiveFilter = useMemo(() => composeFilter(filter, fileLevels), [filter, fileLevels]);

  // Latest capacity/filter read from refs so the recording session (keyed on `recording`) never
  // resubscribes its processor on every keystroke; filter changes are pushed via setFilter below.
  const capacityRef = useRef(capacity);
  capacityRef.current = capacity;
  const effectiveFilterRef = useRef(effectiveFilter);
  effectiveFilterRef.current = effectiveFilter;

  // Register a self-filtering recording session for the recording lifetime; discover every file
  // regardless of the display filter (every entry is delivered, only matches become rows).
  const recorderRef = useRef<LogRecorder | undefined>(undefined);
  useEffect(() => {
    if (!recording) {
      return;
    }

    const recorder = startLogRecording(effectiveFilterRef.current, (entry, matched) => {
      const file = entry.meta?.F;
      if (file) {
        addFile(file);
      }
      if (matched) {
        setRows((prev) => [...prev, { id: nextRowId.current++, entry }].slice(-capacityRef.current));
      }
    });
    recorderRef.current = recorder;
    return () => {
      recorder.dispose();
      recorderRef.current = undefined;
    };
  }, [recording, addFile]);

  // Push filter changes into the active recorder without tearing down the processor.
  useEffect(() => {
    recorderRef.current?.setFilter(effectiveFilter);
  }, [effectiveFilter]);

  // Drop per-row state (expansion, selection) for evicted rows so the sets stay bounded.
  useEffect(() => {
    const ids = new Set(rows.map((row) => row.id));
    const prune = (prev: Set<number>) => {
      if (prev.size === 0) {
        return prev;
      }
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    };
    setExpanded(prune);
    setChecked(prune);
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
    setChecked(new Set());
    setCurrent(undefined);
  }, []);
  // Copy the checked rows when any are checked, else the whole buffer.
  const copyAll = useCallback(() => {
    const selected = checked.size > 0 ? rows.filter((row) => checked.has(row.id)) : rows;
    copyToClipboard(
      JSON.stringify(
        selected.map(({ entry }) => formatLogEntry(entry)),
        null,
        2,
      ),
    );
  }, [rows, checked]);
  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);
  const toggleChecked = useCallback((id: number) => {
    setChecked((prev) => {
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
      current={current}
      setCurrent={setCurrent}
      checked={checked}
      toggleChecked={toggleChecked}
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

  // `files` arrives already sorted from the provider; narrow by a case-insensitive match on the full
  // path (so typing a package name filters, since the path carries `packages/<group>/<pkg>/…`).
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
          <Popover.Viewport classNames='w-[24rem] max-h-[22rem]'>
            <Panel.Root>
              <Panel.Toolbar asChild>
                <Toolbar.Root>
                  <Input.Root>
                    <Input.TextInput
                      placeholder={t('levels.filter.placeholder')}
                      value={fileFilter}
                      autoComplete='off'
                      spellCheck={false}
                      onChange={(ev) => setFileFilter(ev.target.value)}
                    />
                  </Input.Root>
                  <Toolbar.IconButton
                    icon='ph--trash--regular'
                    iconOnly
                    label={t('levels.reset.label')}
                    disabled={fileLevels.size === 0}
                    onClick={clearFileLevels}
                  />
                </Toolbar.Root>
              </Panel.Toolbar>
              <Panel.Content asChild>
                <ScrollArea.Root orientation='vertical' thin>
                  <ScrollArea.Viewport>
                    {visibleFiles.length === 0 && (
                      <div className='p-2 text-xs text-subdued'>
                        {t(files.length === 0 ? 'levels.empty.message' : 'search.no-matches.message')}
                      </div>
                    )}
                    {visibleFiles.length > 0 && (
                      <Listbox.Root>
                        <Listbox.Content>
                          {visibleFiles.map((file) => {
                            const basename = file.split('/').pop() ?? file;
                            const pkg = packageName(file);
                            const value = fileLevels.get(file) ?? 'inherit';
                            return (
                              <Listbox.Item
                                key={file}
                                id={file}
                                classNames='grid grid-cols-[1fr_7rem] items-center gap-1 py-0.5'
                              >
                                <Listbox.ItemLabel classNames='flex flex-col text-xs' title={file}>
                                  {pkg && <div className='text-subdued'>{pkg}</div>}
                                  {basename}
                                </Listbox.ItemLabel>
                                <Select.Root
                                  value={value}
                                  onValueChange={(next) =>
                                    setFileLevel(file, next === 'inherit' ? undefined : (next as LevelName))
                                  }
                                >
                                  <Select.TriggerButton
                                    classNames='w-full text-sm'
                                    placeholder={t('levels.inherit.label')}
                                  />
                                  <Select.Portal>
                                    <Select.Content>
                                      <Select.ScrollUpButton />
                                      <Select.Viewport>
                                        <Select.Option value='inherit' classNames='text-sm'>
                                          {t('levels.inherit.label')}
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
                  </ScrollArea.Viewport>
                </ScrollArea.Root>
              </Panel.Content>
            </Panel.Root>
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
  const { rows, expanded, toggleExpand, current, setCurrent, checked, toggleChecked, textFilter } =
    useLoggerContext('Logger.List');

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
        {t(rows.length === 0 ? 'empty.message' : 'search.no-matches.message')}
      </div>
    );
  }

  // Rows carry inner controls (checkbox, copy), so this is a plain `role=list` — nesting buttons in a
  // `role=option` is invalid WAI-ARIA. The row is the sole arrow-nav stop (`onClick` makes the item
  // interactive → tabIndex 0); inner controls opt out with `tabIndex={-1}`. The current line follows focus
  // (click + arrows), styled via `aria-current`/`dx-current`. Space toggles expansion and Enter toggles the
  // checkbox: handled on the wrapper (Listbox collapses both keys into one synthetic row click, losing which
  // was pressed); arrow keys fall through to Tabster.
  return (
    <Listbox.Root>
      <div
        onKeyDown={(event) => {
          if (current === undefined) {
            return;
          }
          if (event.key === ' ') {
            event.preventDefault();
            toggleExpand(current);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            toggleChecked(current);
          }
        }}
      >
        <Listbox.Content classNames={mx(classNames)}>
          {visible.map(({ id, entry, record }) => {
            const isExpanded = expanded.has(id);
            // Parse the serialized stack into frames only while expanded (deterministic via error-stack-parser).
            const frames = isExpanded && record.error ? parseCaptureOwnerStack(record.error) : null;
            return (
              <Listbox.Item
                key={id}
                id={String(id)}
                aria-current={current === id || undefined}
                onFocus={() => setCurrent(id)}
                onClick={() => setCurrent(id)}
                classNames='group grid grid-cols-[auto_1rem_8rem_1fr_max-content] gap-2 items-center p-0 dx-current'
              >
                <div className='pl-2'>
                  <Input.Root>
                    <Input.Checkbox
                      tabIndex={-1}
                      size={3}
                      checked={checked.has(id)}
                      onCheckedChange={() => toggleChecked(id)}
                    />
                  </Input.Root>
                </div>
                <span className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</span>
                <span className={mx('truncate', !expanded.has(id) && 'text-description')}>{record.file}</span>
                <span className='truncate' title={record.message}>
                  {record.message}
                </span>
                <IconButton
                  icon='ph--clipboard--regular'
                  iconOnly
                  density='xs'
                  tabIndex={-1}
                  label={t('copy-entry.label')}
                  variant='ghost'
                  classNames='p-0 opacity-50 group-hover:opacity-100'
                  onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                />
                {isExpanded && (
                  <div className='col-span-full'>
                    <JsonHighlighter classNames='p-2' data={{ message: record.message, context: record.context }} />
                    {frames && <ErrorStack classNames='p-1 bg-input-surface' frames={frames} />}
                  </div>
                )}
              </Listbox.Item>
            );
          })}
        </Listbox.Content>
      </div>
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
          label={t('search.clear.label')}
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

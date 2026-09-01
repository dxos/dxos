//
// Copyright 2026 DXOS.org
//

import React, {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';

import { logFileRegistry } from '@dxos/log';
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
import { useViewState, useViewStateActions } from '@dxos/react-ui-attention';
import { Listbox } from '@dxos/react-ui-list';
import { JsonHighlighter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/ui-theme';
import { type ComposableProps } from '@dxos/ui-types';

import { translationKey } from '#translations';

import { formatLogEntry, packageName } from './format.ts';
import { DEFAULT_MAX_LINES, type LogRow, logBuffer } from './log-buffer.ts';
import { LoggerProvider, copyToClipboard, levelColor, logLevelsAspect, useLoggerContext } from './LoggerContext.ts';
import { type LevelName, LEVELS, composeFilter } from './recorder.ts';

//
// Shared
//

/** Per-file level overrides are global to the logger, not scoped to an attention context. */
const LOG_LEVELS_CONTEXT = 'logger';

//
// Root
//

type LoggerRootProps = PropsWithChildren<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
  /**
   * Narrows which captured rows this instance displays, for a panel scoped to one subsystem.
   *
   * Distinct from `initialFilter`, which sets what the process-wide buffer *captures*: a scoped
   * panel must not narrow capture, or it starves every other panel reading the same buffer.
   * Must be stable across renders — hoist it or memoize it.
   */
  rowFilter?: (row: LogRow) => boolean;
}>;

const LoggerRoot = ({
  children,
  maxLines = DEFAULT_MAX_LINES,
  initialFilter = 'info',
  defaultRecording = true,
  rowFilter,
}: LoggerRootProps) => {
  const [filter, setFilter] = useState(initialFilter);
  const [textFilter, setTextFilter] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [current, setCurrent] = useState<number>();
  const [checked, setChecked] = useState<Set<number>>(new Set());
  // Per-file level overrides live in persisted view state; expose them as a Map for `composeFilter`
  // and the Levels list.
  const fileLevelsRecord = useViewState(logLevelsAspect, LOG_LEVELS_CONTEXT);
  const { update: updateFileLevels, clear: clearFileLevelsAction } = useViewStateActions(
    logLevelsAspect,
    LOG_LEVELS_CONTEXT,
  );
  const fileLevels = useMemo(() => new Map(Object.entries(fileLevelsRecord)), [fileLevelsRecord]);

  // Rows, files and the recorder live in the process-wide buffer, not here: this panel is a deck
  // companion, so mounting is not the lifetime we want recording to follow.
  const allRows = useSyncExternalStore(logBuffer.subscribe, logBuffer.getRows);
  // Applied here rather than in `Logger.List` so row pruning, selection and copy all agree on the
  // same set — a scoped panel should never copy out rows it never showed.
  const rows = useMemo(() => (rowFilter ? allRows.filter(rowFilter) : allRows), [allRows, rowFilter]);
  const files = useSyncExternalStore(logBuffer.subscribe, logBuffer.getFiles);
  const recording = useSyncExternalStore(logBuffer.subscribe, logBuffer.getRecording);

  // Absorb files registered at module load (dev registry) plus any registered after mount.
  useEffect(() => {
    const sync = () => logBuffer.addFiles(logFileRegistry.getFiles());
    sync();
    return logFileRegistry.subscribe(sync);
  }, []);

  useEffect(() => logBuffer.setCapacity(maxLines), [maxLines]);

  const effectiveFilter = useMemo(() => composeFilter(filter, fileLevels), [filter, fileLevels]);
  useEffect(() => logBuffer.setFilter(filter, fileLevels), [filter, fileLevels, effectiveFilter]);

  // `defaultRecording` seeds the buffer the first time a panel mounts; thereafter the buffer's own
  // state wins, so reopening the panel does not silently resume a stream the user paused.
  const seeded = useRef(false);
  useEffect(() => {
    if (!seeded.current) {
      seeded.current = true;
      if (defaultRecording) {
        logBuffer.start();
      }
    }
  }, [defaultRecording]);

  const setRecording = useCallback((fn: (value: boolean) => boolean) => {
    const next = fn(logBuffer.recording);
    logBuffer.start();
    logBuffer.setPaused(!next);
  }, []);

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

  const setFileLevel = useCallback(
    (file: string, level: LevelName | undefined) => {
      updateFileLevels((prev) => {
        const next = { ...prev };
        if (level) {
          next[file] = level;
        } else {
          delete next[file];
        }
        return next;
      });
    },
    [updateFileLevels],
  );
  const clearFileLevels = useCallback(() => clearFileLevelsAction(), [clearFileLevelsAction]);
  const clear = useCallback(() => {
    logBuffer.clear();
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
                        <Listbox.Content classNames='dx-density-sm'>
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
                                {/* One line so the row can honour the compact density; the package
                                    and full path are carried in the tooltip instead of a second line. */}
                                <Listbox.ItemLabel
                                  classNames='truncate text-xs'
                                  title={pkg ? `${pkg} · ${file}` : file}
                                >
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
        <Listbox.Content classNames={mx('dx-density-sm', classNames)}>
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
                <div className='flex items-center pl-2'>
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
                <div
                  className={mx('flex flex-col min-w-0 leading-tight', !expanded.has(id) && 'text-description')}
                  title={record.file}
                >
                  <span className='truncate'>{record.file?.split('/').pop() ?? record.file}</span>
                </div>
                <span className='truncate' title={record.message}>
                  {record.message}
                </span>
                <IconButton
                  icon='ph--clipboard--regular'
                  iconOnly
                  density='sm'
                  tabIndex={-1}
                  label={t('copy-entry.label')}
                  variant='ghost'
                  classNames='p-0 opacity-50 group-hover:opacity-100'
                  onClick={() => copyToClipboard(JSON.stringify(record, null, 2))}
                />
                {isExpanded && (
                  <div className='col-span-full'>
                    <JsonHighlighter
                      classNames='p-2'
                      data={{
                        file: record.line ? `${record.file}:${record.line}` : record.file,
                        message: record.message,
                        context: record.context,
                      }}
                    />
                    {frames && <ErrorStack classNames='p-1 dx-input-surface' frames={frames} />}
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
    <Toolbar.Root {...composableProps(props, { classNames: 'bg-transparent p-1.5' })} ref={forwardedRef}>
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

export type {
  LoggerContentProps,
  LoggerFilterProps,
  LoggerLevelsProps,
  LoggerListProps,
  LoggerRootProps,
  LoggerToolbarProps,
};

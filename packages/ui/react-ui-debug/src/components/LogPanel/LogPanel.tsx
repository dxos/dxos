//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import { type LogConfig, type LogEntry, LogLevel, log, shouldLog } from '@dxos/log';
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

const levelColor = (level: LogLevel) =>
  level > LogLevel.WARN
    ? 'text-error-text'
    : level > LogLevel.INFO
      ? 'text-warning-text'
      : level > LogLevel.VERBOSE
        ? 'text-info-text'
        : 'text-success-text';

export type LogPanelProps = ThemedClassName<{
  maxLines?: number;
  initialFilter?: string;
  defaultRecording?: boolean;
}>;

/**
 * In-app viewer for the live `@dxos/log` stream — filter, set level, record/pause,
 * clear, and copy without opening DevTools.
 */
export const LogPanel = ({
  classNames,
  maxLines = 1000,
  initialFilter = 'info',
  defaultRecording = true,
}: LogPanelProps) => {
  const { t } = useTranslation(translationKey);
  const [filter, setFilter] = useState(initialFilter);
  const [recording, setRecording] = useState(defaultRecording);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [expanded, setExpanded] = useState<Set<LogEntry>>(new Set());

  // Register a processor while recording; the filter drives the global config so it also sets the logging level.
  useEffect(() => {
    if (!recording) {
      return;
    }

    log.config({ filter });
    const dispose = log.addProcessor((config: LogConfig, entry: LogEntry) => {
      if (shouldLog(entry, config.filters)) {
        setEntries((prev) => [...prev, entry].slice(-maxLines));
      }
    });

    return () => dispose();
  }, [recording, filter, maxLines]);

  // Keep the viewport pinned to the newest entry.
  const viewportRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const viewport = viewportRef.current;
    if (viewport) {
      viewport.scrollTop = viewport.scrollHeight;
    }
  }, [entries]);

  const handleClear = useCallback(() => setEntries([]), []);
  const handleCopyAll = useCallback(() => {
    void navigator.clipboard?.writeText(JSON.stringify(entries.map(formatLogEntry), null, 2));
  }, [entries]);
  const handleToggleExpand = useCallback((entry: LogEntry) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(entry) ? next.delete(entry) : next.add(entry);
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
              onChange={(ev) => setFilter(ev.target.value)}
            />
          </Input.Root>
          <Select.Root value={selectedLevel} onValueChange={setFilter}>
            <Select.TriggerButton classNames='text-sm' placeholder={t('level.label')} />
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
            {entries.length === 0 && <div className='p-2 text-subdued'>{t('empty.message')}</div>}
            {entries.map((entry, index) => {
              const record = formatLogEntry(entry);
              return (
                <div key={index} className='group px-1'>
                  <div className='grid grid-cols-[1rem_8rem_1fr_min-content] items-center gap-1'>
                    <div className={mx('justify-self-center', levelColor(entry.level))}>{record.level}</div>
                    <div className='truncate text-subdued'>{record.file}</div>
                    <div
                      className='truncate cursor-pointer'
                      title={record.message}
                      onClick={() => handleToggleExpand(entry)}
                    >
                      {record.message}
                    </div>
                    <IconButton
                      icon='ph--clipboard--regular'
                      iconOnly
                      density='xs'
                      label={t('copy-entry.label')}
                      variant='ghost'
                      classNames='p-0 opacity-50 group-hover:opacity-100'
                      onClick={() => void navigator.clipboard?.writeText(JSON.stringify(record, null, 2))}
                    />
                  </div>
                  {expanded.has(entry) && (record.context || record.error) && (
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

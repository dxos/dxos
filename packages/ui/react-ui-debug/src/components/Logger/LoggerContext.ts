//
// Copyright 2026 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import * as Schema from 'effect/Schema';

import { LogLevel } from '@dxos/log';
import { ViewState } from '@dxos/react-ui-attention';

import { type LogRow } from './log-buffer.ts';
import { type LevelName, LEVELS } from './recorder.ts';

// Kept out of `Logger.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so the context and helpers exported beside them forced a full page reload of the app
// on every edit to the logger.

/**
 * Per-file log level overrides, keyed by source path. Persisted (localStorage) via react-ui-attention
 * view state so the levels a developer dials in survive reloads; requires a `ViewStateProvider` ancestor
 * to persist (degrades to session defaults without one).
 */
export const logLevelsAspect = ViewState.define<Record<string, LevelName>>({
  key: 'debug-logger-levels',
  backend: 'local',
  schema: Schema.mutableKey(Schema.Record(Schema.String, Schema.Literals(LEVELS))),
  defaultValue: () => ({}),
});

export const levelColor = (level: LogLevel) =>
  level > LogLevel.WARN
    ? 'text-error-text'
    : level > LogLevel.INFO
      ? 'text-warning-text'
      : level > LogLevel.VERBOSE
        ? 'text-info-text'
        : 'text-success-text';

/** Guard clipboard writes so rejected or unavailable writes surface rather than dangling as unhandled rejections. */
export const copyToClipboard = (text: string): void => {
  void navigator.clipboard?.writeText(text)?.catch((err) => console.warn('clipboard write failed', err));
};

export type LoggerContextValue = {
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

export const [LoggerProvider, useLoggerContext] = createContext<LoggerContextValue>('Logger');

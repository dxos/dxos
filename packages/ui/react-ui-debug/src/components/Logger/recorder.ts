//
// Copyright 2026 DXOS.org
//

import { type LogConfig, type LogEntry, type LogOptions, log, parseFilter, shouldLog } from '@dxos/log';

export const LEVELS = ['trace', 'debug', 'verbose', 'info', 'warn', 'error'] as const;
export type LevelName = (typeof LEVELS)[number];

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

// Compose the base filter with per-file overrides into a single @dxos/log filter string.
// Order-independent: an override below the base level raises that file's verbosity; above, it quiets it.
export const composeFilter = (base: string, fileLevels: Map<string, LevelName>): string =>
  [base, ...[...fileLevels].map(([file, level]) => `${file}:${level}`)].filter(Boolean).join(', ');

//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LogEntry, LogLevel, type LogProcessor, log } from '@dxos/log';

import { type ObservabilityWorkerMessage, WorkerLogProcessor } from './worker-log-processor.ts';

const setup = (logFilter?: string) => {
  const posted: ObservabilityWorkerMessage[] = [];
  const logProcessor = new WorkerLogProcessor({
    worker: { postMessage: (message: ObservabilityWorkerMessage) => posted.push(message) },
    tabId: 'test',
    logFilter,
  });
  const lines = () => posted.filter((message): message is string => typeof message === 'string');
  return { logProcessor, lines };
};

const emit = (processor: LogProcessor, level: LogLevel, message: string, file = 'src/test.ts') =>
  processor(log.runtimeConfig, new LogEntry({ level, message, meta: { F: file, L: 1, S: undefined } }));

describe('WorkerLogProcessor', () => {
  test('drops entries below the filter level before posting', () => {
    const { logProcessor, lines } = setup('info');
    emit(logProcessor.processor, LogLevel.DEBUG, 'debug');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'verbose');
    emit(logProcessor.processor, LogLevel.INFO, 'info');
    emit(logProcessor.processor, LogLevel.ERROR, 'error');

    expect(lines().map((line) => JSON.parse(line).m)).toEqual(['info', 'error']);
  });

  test('defaults to debug', () => {
    const { logProcessor, lines } = setup();
    emit(logProcessor.processor, LogLevel.TRACE, 'trace');
    emit(logProcessor.processor, LogLevel.DEBUG, 'debug');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'verbose');

    expect(lines().map((line) => JSON.parse(line).m)).toEqual(['debug', 'verbose']);
  });

  test('pattern filters admit lower levels for matching files only', () => {
    const { logProcessor, lines } = setup('info,automerge-host:verbose');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'host', 'src/automerge-host.ts');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'other', 'src/other.ts');
    emit(logProcessor.processor, LogLevel.DEBUG, 'host-debug', 'src/automerge-host.ts');

    expect(lines().map((line) => JSON.parse(line).m)).toEqual(['host']);
  });

  test('exclusion patterns still reject', () => {
    const { logProcessor, lines } = setup('debug,-noisy:info');
    emit(logProcessor.processor, LogLevel.INFO, 'noisy', 'src/noisy.ts');
    emit(logProcessor.processor, LogLevel.INFO, 'quiet', 'src/quiet.ts');

    expect(lines().map((line) => JSON.parse(line).m)).toEqual(['quiet']);
  });

  test('setFilter replaces the filter', () => {
    const { logProcessor, lines } = setup('info');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'before');
    logProcessor.setFilter('verbose');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'after');

    expect(lines().map((line) => JSON.parse(line).m)).toEqual(['after']);
  });
});

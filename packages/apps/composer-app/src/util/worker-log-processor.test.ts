//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { LogEntry, LogLevel, type LogProcessor, log } from '@dxos/log';

import {
  type LogBatch,
  MAX_LINES_PER_BATCH,
  type ObservabilityWorkerMessage,
  WorkerLogProcessor,
} from './worker-log-processor.ts';

const setup = (logFilter?: string) => {
  const posted: ObservabilityWorkerMessage[] = [];
  const logProcessor = new WorkerLogProcessor({
    worker: { postMessage: (message: ObservabilityWorkerMessage) => posted.push(message) },
    tabId: 'test',
    logFilter,
  });
  const batches = () => posted.filter((message): message is LogBatch => message.type === 'log-batch');
  /** Lines posted once the task that logged them has ended. */
  const lines = async () => {
    await Promise.resolve();
    return batches().flatMap((batch) => batch.lines);
  };
  return { logProcessor, posted, batches, lines };
};

const emit = (processor: LogProcessor, level: LogLevel, message: string, file = 'src/test.ts') =>
  processor(log.runtimeConfig, new LogEntry({ level, message, meta: { F: file, L: 1, S: undefined } }));

describe('WorkerLogProcessor', () => {
  test('drops entries below the filter level before posting', async () => {
    const { logProcessor, lines } = setup('info');
    emit(logProcessor.processor, LogLevel.DEBUG, 'debug');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'verbose');
    emit(logProcessor.processor, LogLevel.INFO, 'info');
    emit(logProcessor.processor, LogLevel.ERROR, 'error');

    expect((await lines()).map((line) => JSON.parse(line).m)).toEqual(['info', 'error']);
  });

  test('defaults to debug', async () => {
    const { logProcessor, lines } = setup();
    emit(logProcessor.processor, LogLevel.TRACE, 'trace');
    emit(logProcessor.processor, LogLevel.DEBUG, 'debug');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'verbose');

    expect((await lines()).map((line) => JSON.parse(line).m)).toEqual(['debug', 'verbose']);
  });

  test('pattern filters admit lower levels for matching files only', async () => {
    const { logProcessor, lines } = setup('info,automerge-host:verbose');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'host', 'src/automerge-host.ts');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'other', 'src/other.ts');
    emit(logProcessor.processor, LogLevel.DEBUG, 'host-debug', 'src/automerge-host.ts');

    expect((await lines()).map((line) => JSON.parse(line).m)).toEqual(['host']);
  });

  test('exclusion patterns still reject', async () => {
    const { logProcessor, lines } = setup('debug,-noisy:info');
    emit(logProcessor.processor, LogLevel.INFO, 'noisy', 'src/noisy.ts');
    emit(logProcessor.processor, LogLevel.INFO, 'quiet', 'src/quiet.ts');

    expect((await lines()).map((line) => JSON.parse(line).m)).toEqual(['quiet']);
  });

  test('setFilter replaces the filter', async () => {
    const { logProcessor, lines } = setup('info');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'before');
    logProcessor.setFilter('verbose');
    emit(logProcessor.processor, LogLevel.VERBOSE, 'after');

    expect((await lines()).map((line) => JSON.parse(line).m)).toEqual(['after']);
  });

  test('lines logged in one task go out as one message', async () => {
    const { logProcessor, batches, lines } = setup('info');
    emit(logProcessor.processor, LogLevel.INFO, 'one');
    emit(logProcessor.processor, LogLevel.INFO, 'two');
    expect(batches()).toHaveLength(0);

    expect((await lines()).map((line) => JSON.parse(line).m)).toEqual(['one', 'two']);
    expect(batches()).toHaveLength(1);
  });

  test('a full batch is posted at once, before the task ends', () => {
    const { logProcessor, batches } = setup('info');
    for (let index = 0; index < MAX_LINES_PER_BATCH; index++) {
      emit(logProcessor.processor, LogLevel.INFO, `line-${index}`);
    }

    expect(batches().map((batch) => batch.lines.length)).toEqual([MAX_LINES_PER_BATCH]);
  });

  test('flush posts pending lines ahead of the flush request', () => {
    const { logProcessor, posted } = setup('info');
    emit(logProcessor.processor, LogLevel.INFO, 'pending');
    logProcessor.flush();

    expect(posted.map((message) => message.type)).toEqual(['log-batch', 'flush']);
  });
});

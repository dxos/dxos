//
// Copyright 2022 DXOS.org
//

import path from 'node:path';

import { beforeEach, describe, test } from 'vitest';

import { LogLevel } from './config';
import { shouldLog } from './context';
import { type Log, createLog } from './log';

class LogError extends Error {
  constructor(
    message: string,
    private readonly context?: any,
  ) {
    super(message);
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override toString(): string {
    return `LogError: ${this.message}`;
  }
}

/* eslint-disable prefer-arrow-functions/prefer-arrow-functions */

describe('log', () => {
  let log!: Log;

  beforeEach(() => {
    log = createLog();
    log.config({
      filter: LogLevel.DEBUG,
    });
  });

  test('filters', ({ expect }) => {
    const tests = [
      { expected: 0, filter: 'ERROR' },
      { expected: 2, filter: 'INFO' },
      { expected: 4, filter: 'DEBUG' },
      { expected: 3, filter: 'foo:DEBUG,bar:INFO' },
      { expected: 1, filter: 'INFO,-foo:*' },
      { expected: 3, filter: 'DEBUG,-foo:INFO' },
    ];

    for (const test of tests) {
      let count = 0;
      log
        .addProcessor((config, entry) => {
          if (shouldLog(entry, config.filters)) {
            count++;
          }
        })
        .config({
          filter: test.filter,
        });

      console.log(test.filter);
      log.info('line 1', {}, { F: 'foo.ts', L: 1, S: undefined });
      log.debug('line 2', {}, { F: 'foo.ts', L: 2, S: undefined });
      log.info('line 3', {}, { F: 'bar.ts', L: 3, S: undefined });
      log.debug('line 4', {}, { F: 'bar.ts', L: 4, S: undefined });

      expect(count, test.filter).toBe(test.expected);
    }
  });

  test('throws an error', () => {
    try {
      throw new LogError('Test failed', { value: 1 });
    } catch (err: any) {
      log.warn('failed', err);
    }
  });

  test('throws an error showing stacktrace', () => {
    try {
      throw new LogError('Test failed', { value: 2 });
    } catch (err: any) {
      log.error(err);
    }
  });

  test('catches an error', () => {
    try {
      throw new LogError('ERROR ON LINE 21', { value: 3 });
    } catch (err: any) {
      log.catch(err);
    }
  });

  test('config file', () => {
    log.config({
      file: path.join('packages/common/log/test-config.yml'),
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  test('levels', () => {
    log('Default level log message');
    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
    log.error('Error level log message');
  });

  test('context', () => {
    log.info('Message with context', {
      title: 'test',
      context: 123,
    });
  });

  test('error', function () {
    const myError = new Error('Test error', { cause: new Error('Cause') });
    log.catch(myError);
  });
});

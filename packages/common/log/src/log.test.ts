//
// Copyright 2022 DXOS.org
//

import path from 'node:path';
import { describe, test } from 'vitest';

import { LogLevel } from './config';
import { log } from './log';
import { BROWSER_PROCESSOR } from './processors';

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

log.config({
  filter: LogLevel.DEBUG,
});

/* eslint-disable @stayradiated/prefer-arrow-functions/prefer-arrow-functions */

describe('log', function () {
  test('throws an error', function () {
    try {
      throw new LogError('Test failed', { value: 1 });
    } catch (err: any) {
      log.warn('failed', err);
    }
  });

  test('throws an error showing stacktrace', function () {
    try {
      throw new LogError('Test failed', { value: 2 });
    } catch (err: any) {
      log.error(err);
    }
  });

  test('catches an error', function () {
    try {
      throw new LogError('ERROR ON LINE 21', { value: 3 });
    } catch (err: any) {
      log.catch(err);
    }
  });

  test('config', function () {
    log.config({
      filter: LogLevel.INFO,
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  test('config file', function () {
    log.config({
      file: path.join('packages/common/log/test-config.yml'),
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  test('levels', function () {
    log('Default level log message');
    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
    log.error('Error level log message');
  });

  test('context', function () {
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

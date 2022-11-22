//
// Copyright 2022 DXOS.org
//

import path from 'path';

import { LogLevel } from './config';
import { log } from './log';

class LogError extends Error {
  constructor(message: string, private readonly context?: any) {
    super(message);
    // Restore prototype chain.
    // https://stackoverflow.com/a/48342359
    Object.setPrototypeOf(this, new.target.prototype);
  }

  override toString() {
    return `LogError: ${this.message}`;
  }
}

log.config({
  filter: LogLevel.DEBUG
});

describe('log', function () {
  it('throws an error', function () {
    try {
      throw new LogError('Test failed', { value: 1 });
    } catch (err: any) {
      log.warn('failed', err);
    }
  });

  it('throws an error showing stacktrace', function () {
    try {
      throw new LogError('Test failed', { value: 2 });
    } catch (err: any) {
      log.error('failed', err);
    }
  });

  it('catches an error', function () {
    try {
      throw new LogError('ERROR ON LINE 21', { value: 3 });
    } catch (err: any) {
      log.catch(err);
    }
  });

  it('config', function () {
    log.config({
      filter: LogLevel.INFO
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  it('config file', function () {
    log.config({
      file: path.join('packages/common/log/test-config.yml')
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  it('levels', function () {
    log('Default level log message');
    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
    log.error('Error level log message');
  });

  it('context', function () {
    log.info('Message with context', {
      title: 'test',
      context: 123
    });
  });
});

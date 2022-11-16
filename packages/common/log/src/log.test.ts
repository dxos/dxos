//
// Copyright 2022 DXOS.org
//

import path from 'path';

import { LogLevel } from './config';
import { log } from './log';

describe('log', function () {
  it('throws an error', function () {
    try {
      throw new Error('Test failed');
    } catch (err: any) {
      log.warn('failed', err);
    }
  });

  it('catches an error', function () {
    try {
      throw new Error('ERROR ON LINE 21');
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

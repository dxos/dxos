//
// Copyright 2022 DXOS.org
//

import path from 'path';

import { LogLevel } from './config';
import { log } from './log';

describe('log', function () {
  it('config', function () {
    log.config({
      filter: LogLevel.INFO
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  it.only('config file', function () {
    log.config({
      file: path.join(__dirname, '../test-config.yml')
    });

    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
  });

  it('line numbers', function () {
    log.warn('LOG LINE 13');

    try {
      throw new Error('ERROR ON LINE 16');
    } catch (err: any) {
      log.catch(err);
    }
  });

  it('levels', function () {
    log('Default level log message');
    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
    log.error('Error level log message');
  });

  it('formatting', function () {
    log.info(`${2} + ${2} = ${2 + 2}`);
  });

  it('context', function () {
    log.info('Message with context', {
      foo: 'bar',
      baz: 123
    });
  });
});

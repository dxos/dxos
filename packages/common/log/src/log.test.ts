//
// Copyright 2022 DXOS.org
//

// import { LogLevel } from './config';
import { log } from './log';

// TODO(burdon): Override with LOG_FILTER
// log.config.filter = LogLevel.INFO;

describe('log', () => {
  it('line numbers', () => {
    log.warn('LOG LINE 11');

    try {
      throw new Error('ERROR ON LINE 14');
    } catch (err: any) {
      log.catch(err);
    }
  });

  it('levels', () => {
    log('Default level log message');
    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');
    log.error('Error level log message');
  });

  it('formatting', () => {
    log.info(`${2} + ${2} = ${2 + 2}`);
  });

  it('context', () => {
    log.info('Message with context', {
      foo: 'bar',
      baz: 123
    });
  });
});

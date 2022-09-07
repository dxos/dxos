//
// Copyright 2022 DXOS.org
//

import { log } from './log';

describe('log', () => {
  it('line numbers', () => {
    log.warn('LOG LINE 9');
    try {
      throw new Error('ERROR ON LINE 10');
    } catch (err) {
      console.error(err);
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
    log(`${2} + ${2} = ${2 + 2}`);
  });

  it('context', () => {
    log('my message with context', {
      foo: 'bar',
      baz: 123
    });
  });
});

// const key = 100;
// log.warn`Invalid key: ${key}`({ foo: 100 });

// log.warn(`This is better but doesn't work.`, { foo: 100 });

//
// Copyright 2022 DXOS.org
//

import { log } from './log';

describe('log', () => {
  it('levels', () => {
    log('Default level log message');
    log.debug('Debug level log message');
    log.info('Info level log message');
    log.warn('Warn level log message');

    // throw new Error('xxxxxx');

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

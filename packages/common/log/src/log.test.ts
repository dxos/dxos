import { log } from './log'

describe('log', () => {
  it('levels', () => {
    log(`Default`)
    log.debug(`Debug`)
    log.info(`Info`)
    log.warn(`Warn`)
    log.error(`Error`)
  })

  it('formatting', () => {
    log(`${2} + ${2} = ${2 + 2}`)
  })

  it('context', () => {
    log('my message with context', {
      foo: 'bar',
      baz: 123,
    })
  })
})

// const key = 100;
// log.warn`Invalid key: ${key}`({ foo: 100 });

// log.warn(`This is better but doesn't work.`, { foo: 100 });

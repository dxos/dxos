import { log } from './log'

describe('log', () => {
  it('levels', () => {
    log`Default`()
    log.debug`Debug`()
    log.info`Info`()
    log.warn`Warn`()
    log.error`Error`()
  })

  it('formatting', () => {
    log`${2} + ${2} = ${2 + 2}`()
  })

  it('format objects', () => {
    log`obj = ${{ foo: 'bar' }}`()
  })
})
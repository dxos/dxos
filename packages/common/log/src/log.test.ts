import { log } from './log'

describe('log', () => {
  it('levels', () => {
    log`Default`()
    log.info`Info`()
    log.warn`Warn`()
    log.error`Error`()
  })
})
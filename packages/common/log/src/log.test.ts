import { log } from '.'

describe('log', () => {
  it('levels', () => {
    log`Default`()
    log.info`Info`()
    log.warn`Warn`()
    log.error`Error`()
  })
})
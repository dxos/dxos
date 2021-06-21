import { log } from "./common";
import { expect } from 'earljs'
import { it } from 'mocha'

log()

it('2 + 2 = 4', () => {
  expect(2 + 2).toEqual(4)
})

import { log } from "./common";
import expect from 'expect'
import { Mocha } from 'mocha'

log()

Mocha.it('2 + 2 = 4', () => {
  expect(2 + 2).toEqual(4)
})

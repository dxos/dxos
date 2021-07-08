import { it as test } from "mocha";
import expect from 'expect'
import { AGENT_PATH } from "./tests/agent";
import { buildBot } from "./distributor";

describe('build bot', () => {
  test('node', async () => {
    const path = await buildBot(AGENT_PATH, false);

    expect(typeof path).toEqual('string')
  })

  test('browser', async () => {
    const path = await buildBot(AGENT_PATH, true);

    expect(typeof path).toEqual('string')
  })
})


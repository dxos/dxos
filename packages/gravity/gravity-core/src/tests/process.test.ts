//
// Copyright 2020 DXOS.org
//

import expect from 'expect';
import { it as test } from 'mocha';
import processExists from 'process-exists';
import psTree from 'pstree.remy';
import { promisify } from 'util';

import { Orchestrator } from '..';
import { AGENT_PATH } from './agent';
import '../testing/setup';

const BOT_NUMBER = 5;

// TODO(egorgripasov): Run multiple test files simultaneously.
test.skip('bot resource test', async () => {
  const orchestrator = await Orchestrator.create({ local: true });
  await orchestrator.start();

  const agents = [];
  for (let i = 0; i < BOT_NUMBER; i++) {
    agents.push(
      await orchestrator.startAgent({ botPath: AGENT_PATH })
    );
  }

  const children = await promisify(psTree)(orchestrator.botFactoryPid);

  for await (const agent of agents) {
    await agent.stop();
  }

  const exists = await processExists.all(children);
  expect(Array.from(exists.values()).includes(true)).toBeFalsy();

  await orchestrator.destroy();
});

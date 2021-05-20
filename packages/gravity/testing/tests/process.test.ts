//
// Copyright 2020 DXOS.org
//

import processExists from 'process-exists';
import psTree from 'pstree.remy';
import { promisify } from 'util';

import { Orchestrator } from '../src';

const BOT_NUMBER = 5;

jest.setTimeout(100_000);

// TODO(egorgripasov): Run multiple test files simultaneously.
test.skip('bot resource test', async () => {
  const orchestrator = await Orchestrator.create({ local: true });
  await orchestrator.start();

  const agents = [];
  for (let i = 0; i < BOT_NUMBER; i++) {
    agents.push(
      await orchestrator.startAgent({ botPath: './src/test-agent.ts' })
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

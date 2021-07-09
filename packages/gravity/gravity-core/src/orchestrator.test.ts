import { Orchestrator } from "./orchestrator";
import { it as test } from 'mocha'

describe('Orchestrator', () => {
  test('start & stop', async () => {
    const orchestrator = await Orchestrator.create({ local: true });
  
    await orchestrator.start();
  
    await orchestrator.destroy();
  });
})

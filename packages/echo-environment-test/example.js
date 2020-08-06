import { ObjectModel } from '@dxos/echo-db';
import { Suite } from '@dxos/benchmark-suite';

import { EnvironmentFactory, providers, networkTypes } from './src';

if (typeof window !== 'undefined' && typeof process !== 'undefined') {
  process.nextTick = function (fn) {
    var args = new Array(arguments.length - 1);
    if (arguments.length > 1) {
      for (var i = 1; i < arguments.length; i++) {
        args[i - 1] = arguments[i];
      }
    }

    queueMicrotask(() => fn(...args));
  };
}

(async () => {
  const factory = new EnvironmentFactory();
  factory.on('error', err => console.log('error', err));

  try {
    const env = await factory.create(new providers.BasicProvider({
      network: {
        type: networkTypes.BALANCED_BIN_TREE,
        parameters: [3] // n levels of the binary tree
      }
    }));

    const suite = new Suite();

    const agent = env.addAgent({
      spec: {
        ModelClass: ObjectModel,
        options: {
          type: 'example.com/Test'
        }
      }
    });

    console.log('> nodes:', env.peers.length, '\n');

    const models = [];
    env.peers.forEach((peer) => {
      models.push(agent.createModel(peer));
    });

    const rootModel = models[0];

    await Promise.all([...Array(1000).keys()].map(() => rootModel.createItem('example.com/Test', { prop1: 'prop1value' })));

    suite.test('reading first time', async () => {
      console.log('> prev state', JSON.stringify(env.state), '\n');
      await agent.waitForSync();
      console.log('> next state', JSON.stringify(env.state), '\n');
    });

    suite.test('reading again', async () => {
      const newModel = agent.createModel(env.getRandomPeer());
      return agent.waitForModelSync(newModel);
    });

    suite.print(await suite.run());

    await env.destroy();
  } catch (err) {
    console.log(err);
  }
})();

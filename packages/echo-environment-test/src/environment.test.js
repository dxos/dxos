import { ObjectModel } from '@dxos/echo-db';
import { EnvironmentFactory, providers, networkTypes } from './';

test('simple', async () => {
  const factory = new EnvironmentFactory();
  factory.on('error', err => console.log('error', err));

  const env = await factory.create(new providers.BasicProvider({
    network: {
      type: networkTypes.COMPLETE,
      parameters: [2]
    }
  }));

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

  await Promise.all([...Array(10).keys()].map(() => rootModel.createItem('example.com/Test', { prop1: 'prop1value' })));
  console.log('> prev state', JSON.stringify(env.state), '\n');

  await agent.waitForSync();
  console.log('> next state', JSON.stringify(env.state), '\n');
  await env.destroy();

  expect(env.state.processed).toBe(20);
});

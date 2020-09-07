//
// Copyright 2020 DXOS.org
//

import Chance from 'chance';

// import { EnvironmentFactory, providers, networkTypes } from '@dxos/echo-environment-test';

// import { TextModel, TYPE_TEXT_MODEL_UPDATE } from './text-model';

const chance = new Chance();

let env;
let agent;
let models;

jest.setTimeout(100000);

// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function buildEnv (peers = 2) {
  /*
  const factory = new EnvironmentFactory();
  factory.on('error', err => console.log('error', err));

  env = await factory.create(new providers.BasicProvider({
    network: {
      type: networkTypes.COMPLETE,
      parameters: [peers]
    }
  }));

  agent = env.addAgent({
    spec: {
      ModelClass: TextModel,
      options: {
        type: TYPE_TEXT_MODEL_UPDATE
      }
    }
  });

  models = [];
  env.peers.forEach((peer) => {
    models.push(agent.createModel(peer));
  });
  */
}

function randomInsert (model) {
  const index = Math.floor(Math.random() * model.textContent.length);
  const text = chance.paragraph();
  model.insert(index, text);
}

function randomModel () {
  const modelIndex = Math.floor(Math.random() * models.length);
  return models[modelIndex];
}

function makeTextInserts (operations = 1) {
  Array
    .from({ length: operations })
    .map(() => randomInsert(randomModel()));
}

function allModelsSameText () {
  const text = models[0].textContent;

  return models.every(model => model.textContent === text);
}

beforeEach(async () => {
  // await buildEnv();
});

afterEach(async () => {
  await env.destroy();
});

test.skip('1000 insertions between 10 peers', async () => {
  await buildEnv(10);

  makeTextInserts(1000);

  await agent.waitForSync();

  expect(allModelsSameText()).toBeTruthy();
});

test.skip('10 insertions between 20 peers', async () => {
  await buildEnv(20);

  makeTextInserts(10);

  await agent.waitForSync();

  expect(allModelsSameText()).toBeTruthy();
});

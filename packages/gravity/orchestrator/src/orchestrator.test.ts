//
// Copyright 2022 DXOS.org
//

import expect from 'expect';

import { Bot, InProcessBotContainer } from '@dxos/botkit';

import { Orchestrator } from './orchestrator';

class TestBot extends Bot {
  private readonly _onStart: () => {};

  constructor (onStart: () => {}) {
    super();
    this._onStart = onStart;
  }

  override async onStart () {
    this._onStart();
  }
}

describe('Orchestrator', () => {
  let counter = 0;

  const orchestrator = new Orchestrator(new InProcessBotContainer(() => new TestBot(() => counter++)));
  it('should start', async () => {
    await orchestrator.initialize();
  });
  it('should spawn a functional bot', async () => {
    await orchestrator.spawnBot({});
    expect(counter).toBe(1);
  });
  it('should stop', async () => {
    await orchestrator.stop();
  });
});

//
// Copyright 2022 DXOS.org
//

export class TestBuilder {
  private readonly _agents: TestAgent[];

  constructor () {
    this._agents = [];
  }

  createAgent () {
    const agent = new TestAgent();
    this._agents.push(agent);
    return agent;
  }

  async destroy () {
    await Promise.all(this._agents.map(agent => agent.destroy()));
  }
}
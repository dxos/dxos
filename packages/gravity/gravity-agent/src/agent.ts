//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Event } from '@dxos/async';
import { Client, ClientServicesProvider, fromHost, PublicKey } from '@dxos/client';
import { Config, ConfigProto } from '@dxos/config';
import { log } from '@dxos/log';
<<<<<<< Updated upstream
import { AgentSpec, CommandSequence } from '@dxos/protocols/proto/dxos/gravity';

import { AgentStateMachine, AgentContext, DummyStateMachine } from './statemachine';
=======
import { AgentSpec, Command, CommandSequence } from '@dxos/protocols/proto/dxos/gravity';

export type StateMachineFactory = (id: string) => AgentStateMachine;

/**
 * Base class for custom state machines.
 */
export abstract class AgentStateMachine {
  public _agent?: AgentContext;

  get agent(): AgentContext {
    assert(this._agent);
    return this._agent;
  }

  setContext(agent: AgentContext) {
    assert(agent);
    this._agent = agent;
    return this;
  }

  abstract processCommand(command: Command): Promise<void>;
}

/**
 * Dummy state machine.
 */
export class DummyStateMachine extends AgentStateMachine {
  public count = 0;
  override async processCommand(command: Command) {
    this.count++;
  }
}

/**
 * Interface for state machine to acess agent state.
 * E.g., client, stats, etc.
 */
export interface AgentContext {
  client: Client;
}
>>>>>>> Stashed changes

export type AgentParams = {
  config: ConfigProto;
  services?: ClientServicesProvider;
  spec?: AgentSpec;
  stateMachine?: AgentStateMachine;
};

/**
 * Test agent.
 */
export class Agent implements AgentContext {
  private readonly _config: Config;
  private readonly _client: Client;
  private readonly _spec: AgentSpec;
  private readonly _stateMachine: AgentStateMachine;
  private _running?: boolean = false;

  public readonly id = PublicKey.random();
  public readonly sequenceComplete = new Event<CommandSequence>();

  // prettier-ignore
  constructor ({
    config,
    services,
    spec,
    stateMachine
  }: AgentParams) {
    this._config = new Config(config);
    this._client = new Client({ config: this._config, services: services ?? fromHost(this._config) });
    this._spec = spec ?? {};
    this._stateMachine = stateMachine ?? new DummyStateMachine();
    this._stateMachine.setContext(this);
  }

  get started() {
    return this._running;
  }

  get client(): Client {
    assert(this._client);
    return this._client!;
  }

  get spec() {
    return this._spec;
  }

  get stateMachine() {
    return this._stateMachine;
  }

  async initialize() {
    await this._client.initialize();
  }

  async destroy() {
    await this.stop();
    await this._client.destroy();
  }

  async start() {
<<<<<<< Updated upstream
=======
    log('starting...', { id: this.id });
>>>>>>> Stashed changes
    if (this._running) {
      return;
    }

    if (this._spec.startSequence) {
      await this.runSequence(this._spec.startSequence);
    }

<<<<<<< Updated upstream
    log.info('Starting test sequences...');
    for (const sequence of this._spec.testSequences ?? []) {
      await this.runSequence(sequence);
      this.sequenceComplete.emit(sequence);
    }
    log.info('Test sequences complete.');

=======
    // TODO(burdon): Config sequentially or randomly run test sequences.
    //  - Config interval.
    setTimeout(async () => {
      for (const sequence of this._spec.testSequences ?? []) {
        await this.runSequence(sequence);
        this.sequenceComplete.emit(sequence);
      }
    });

    log('started', { id: this.id });
>>>>>>> Stashed changes
    this._running = true;
  }

  async stop() {
    if (!this._running) {
      return;
    }

    log('stopping...', { id: this.id });
    if (this._spec.stopSequence) {
      await this.runSequence(this._spec.stopSequence);
    }

    log('stopped', { id: this.id });
    this._running = false;
  }

  async runSequence(sequence: CommandSequence) {
    for (const command of sequence.commands ?? []) {
<<<<<<< Updated upstream
      log.info('processing: ', { command });
=======
      log('processing', { command });
>>>>>>> Stashed changes
      await this._stateMachine.processCommand(command);
    }
  }
}

//
// Copyright 2022 DXOS.org
//
import assert from 'assert';

import { Trigger } from '@dxos/async';
import { Invitation, Space, Client, PublicKey } from '@dxos/client';
import { log } from '@dxos/log';
import { Command } from '@dxos/protocols/proto/dxos/gravity';

export type StateMachineFactory = (id: string) => AgentStateMachine;

/**
 * Interface for state machine to acess agent state.
 * E.g., client, stats, etc.
 */
export interface AgentContext {
  client: Client;
}

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

export class GenericStateMachine extends AgentStateMachine {
  public readonly spaces = new Map<string, Space>();

  async processCommand(command: Command) {
    //
    if (command.createProfile) {
      await this.agent.client.halo.createProfile();
    }
    //
    else if (command.createSpace) {
      const id = command.createSpace.id;
      const space = await this.agent.client.echo.createSpace();
      if (id) {
        this.spaces.set(id, space);
      }
    }
    //
    else if (command.createSpaceInvitation) {
      const id = command.createSpaceInvitation.id;
      const space = this.spaces.get(id)!;
      const observable = await space.createInvitation({
        type: Invitation.Type.INTERACTIVE_TESTING,
        swarmKey: PublicKey.from(command.createSpaceInvitation.swarmKey)
      });

      const trigger = new Trigger();
      observable.subscribe({
        onSuccess(invitation: Invitation) {
          trigger.wake();
        },
        onError(err: Error) {
          throw err;
        }
      });

      await trigger.wait();
    }
    //
    else if (command.acceptSpaceInvitation) {
      const observable = await this.agent.client.echo.acceptInvitation({
        type: Invitation.Type.INTERACTIVE_TESTING,
        swarmKey: PublicKey.from(command.acceptSpaceInvitation.swarmKey)
      });

      const trigger = new Trigger();
      observable.subscribe({
        onSuccess(invitation: Invitation) {
          trigger.wake();
        },
        onError(err: Error) {
          throw err;
        }
      });

      await trigger.wait();
    } else {
      log('Error: invalid command ', { command });
      throw new Error('Invalid command');
    }
  }
}

/**
 * Required by test set-up.
 */
// TODO(burdon): Configurable by map/annotations?
export const TestStateMachineFactory: StateMachineFactory = (id: string): AgentStateMachine => {
  switch (id) {
    case 'test-host':
    case 'test-guest':
    case 'generic': {
      return new GenericStateMachine();
    }
    case 'dummy': {
      return new DummyStateMachine();
    }
    default: {
      throw new Error(`Invalid state machine: ${id}`);
    }
  }
};

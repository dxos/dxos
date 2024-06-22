//
// Copyright 2023 DXOS.org
//

export abstract class FriendlyError extends Error {
  get hint(): string | undefined {
    return undefined;
  }
}

export class SpaceTimeoutError extends FriendlyError {
  constructor(timeout: number) {
    super(`Timeout waiting for space to load (${timeout.toLocaleString()}ms)`);
  }

  override get hint() {
    return 'Increase timeout.';
  }
}

export class IdentityWaitTimeoutError extends FriendlyError {
  constructor() {
    super('Timeout waiting for identity.');
  }
}

export class ClientInitializationError extends FriendlyError {
  constructor(message: string, error: Error) {
    super(`Error while initializing client: ${message}: ${error.message}`);
  }
}

export class AgentAlreadyRunningError extends FriendlyError {
  constructor() {
    super('Agent is already running.');
  }

  override get hint() {
    return 'Check running agents (dx agent list) or daemon process.';
  }
}

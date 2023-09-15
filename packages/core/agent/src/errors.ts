//
// Copyright 2023 DXOS.org
//

export class AgentWaitTimeoutError extends Error {
  constructor() {
    super('Timeout waiting for agent.');
  }
}

export class AgentIsNotStartedByCLIError extends Error {
  constructor() {
    super('Agent is not started by CLI.');
  }
}

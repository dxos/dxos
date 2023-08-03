//
// Copyright 2023 DXOS.org
//

export class AgentWaitTimeoutError extends Error {
  constructor() {
    super('Timeout waiting for agent.');
  }
}

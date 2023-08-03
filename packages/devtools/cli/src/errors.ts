//
// Copyright 2023 DXOS.org
//

export class SpaceWaitTimeoutError extends Error {
  constructor() {
    super('Timeout waiting for space to be ready.');
  }
}

//
// Copyright 2023 DXOS.org
//

export class SpaceWaitTimeoutError extends Error {
  constructor(timeout: number) {
    super(`Timeout waiting for space to be ready: ${timeout.toLocaleString()}ms`);
  }
}

export class PublisherConnectionError extends Error {
  constructor() {
    super('Error while connecting to kube publisher.');
  }
}

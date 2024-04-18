//
// Copyright 2023 DXOS.org
//

export abstract class FriendlyError extends Error {
  abstract friendlyMessage: string;
  get suggestion(): string | undefined {
    return undefined;
  }
}

export class SpaceWaitTimeoutError extends FriendlyError {
  constructor(timeout: number) {
    super(`Timeout waiting for space to be ready: ${timeout.toLocaleString()}ms`);
  }

  get friendlyMessage() {
    return 'Space takes too long to load.';
  }

  override get suggestion() {
    return 'Increase timeout.';
  }
}

export class PublisherConnectionError extends FriendlyError {
  constructor() {
    super('Error while connecting to kube publisher.');
  }

  get friendlyMessage() {
    return 'Error while connecting to kube publisher.';
  }
}

export class IdentityWaitTimeoutError extends FriendlyError {
  constructor() {
    super('Timeout waiting for identity.');
  }

  get friendlyMessage() {
    return 'Error while connecting to kube publisher.';
  }
}

export class ClientInitializationError extends FriendlyError {
  private readonly _message: string;
  constructor(message: string, error: Error) {
    super(`Error while initializing client: ${message}: ${error.message}`);
    this._message = message;
  }

  get friendlyMessage() {
    return 'Error while initializing client: ' + this._message;
  }
}

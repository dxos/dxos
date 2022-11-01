//
// Copyright 2020 DXOS.org
//

// TODO(burdon): Separate declaration file for errors.
export class TimeoutError extends Error {
  constructor(timeout: number, label?: string) {
    super(`Timeout [${timeout}ms]${label === undefined ? '' : ` :${label}`}`);
  }
}

export interface AsyncEvents<T = any> {
  onSuccess?(result: T): T;
  onTimeout(err: TimeoutError): void;
  onError(err: any): void; // TODO(burdon): Util to convert to error.
}

// TODO(burdon): Move to debug.
export const toError = (err: any) => (err === undefined || typeof err === 'string' ? new Error(err) : err);

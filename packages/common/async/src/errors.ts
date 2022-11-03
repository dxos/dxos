//
// Copyright 2020 DXOS.org
//

export class TimeoutError extends Error {
  constructor(timeout?: number, label?: string) {
    super(timeout ? `Timeout [${timeout}ms]${label === undefined ? '' : ` :${label}`}` : 'Timeout');
  }
}

export interface AsyncEvents<T = any> {
  onSuccess?(result: T): T;
  onTimeout(err: TimeoutError): void;
  onError(err: any): void;
}

// TODO(burdon): Move to debug.
export const toError = (err: any) => (err === undefined || typeof err === 'string' ? new Error(err) : err);

//
// Copyright 2020 DXOS.org
//

import { type ObservableProvider } from './observable-value';

// TODO(burdon): Move to debug.
//  Use: https://nodejs.org/api/errors.html
export const toError = (err: any) => (err === undefined || typeof err === 'string' ? new Error(err) : err);

export class TimeoutError extends Error {
  constructor(timeout?: number, label?: string) {
    super(timeout ? `Timeout [${timeout.toLocaleString()}ms]${label === undefined ? '' : `: ${label}`}` : 'Timeout');
  }
}

export interface AsyncEvents<T = any> {
  onSuccess?(result: T): void;
  onTimeout?(err: TimeoutError): void;
  onError(err: any): void;
}

export const observableError = (observable: ObservableProvider<AsyncEvents>, err: any) => {
  if (err instanceof TimeoutError) {
    observable.callback.onTimeout?.(err);
  } else {
    observable.callback.onError(toError(err));
  }
};

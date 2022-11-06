//
// Copyright 2020 DXOS.org
//

import { ObservableProvider } from './observable';

// TODO(burdon): Move to debug.
export const toError = (err: any) => (err === undefined || typeof err === 'string' ? new Error(err) : err);

export class TimeoutError extends Error {
  constructor(timeout?: number, label?: string) {
    super(timeout ? `Timeout [${timeout}ms]${label === undefined ? '' : ` :${label}`}` : 'Timeout');
  }
}

export interface AsyncEvents<T = any> {
  onSuccess?(result: T): T;
  onTimeout?(err: TimeoutError): void;
  onError(err: any): void;
}

export const observableError = (observable: ObservableProvider<AsyncEvents>, err: any) => {
  if (err instanceof TimeoutError && observable.callbacks?.onTimeout) {
    observable.callbacks?.onTimeout(err);
  } else {
    observable.callbacks?.onError(toError(err));
  }
};

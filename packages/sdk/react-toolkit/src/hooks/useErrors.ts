//
// Copyright 2021 DXOS.org
//

import { Context, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

export interface ErrorContextState {
  errors: Error[] // TODO(burdon): Timestamp?
  addError: (error: Error) => void
  resetErrors: () => void
}

export const ErrorContext: Context<ErrorContextState | undefined> =
  createContext<ErrorContextState | undefined>(undefined);

export const useErrors = (): [Error[], () => void] => {
  const { errors, resetErrors } = useContext(ErrorContext) ?? raise(new Error('Missing ErrorContext.'));
  return [errors, () => resetErrors()];
};

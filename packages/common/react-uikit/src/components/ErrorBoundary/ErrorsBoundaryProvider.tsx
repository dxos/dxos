//
// Copyright 2022 DXOS.org
//

import React, {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useState
} from 'react';

import { FatalErrorBoundary } from './FatalErrorBoundary';

export interface ErrorsContextState {
  errors: Error[]
  addError: (error: Error) => void
  resetErrors: () => void
}

export const ErrorsContext = createContext<ErrorsContextState>({
  errors: [],
  addError: () => {},
  resetErrors: () => {}
});

export const ErrorsBoundaryProvider = ({ children }: PropsWithChildren<{}>) => {
  const [errors, setErrors] = useState<Error[]>([]);
  const addError = useCallback(
    (error: Error) => setErrors([error, ...errors]),
    []
  );
  const resetErrors = useCallback(
    () => setErrors([]),
    []
  );
  return (
    <ErrorsContext.Provider value={{ errors, addError, resetErrors }}>
      <FatalErrorBoundary>
        {children}
      </FatalErrorBoundary>
    </ErrorsContext.Provider>
  );
};

export const useErrors = () => useContext(ErrorsContext);

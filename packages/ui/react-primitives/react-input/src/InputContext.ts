//
// Copyright 2023 DXOS.org
//

import { type PropsWithChildren } from 'react';

import { createContext } from '@dxos/react-hooks';

// Kept out of `Root.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const INPUT_NAME = 'Input';

export type Valence = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export type InputRootProps = PropsWithChildren<{
  id?: string;
  validationValence?: Valence;
  descriptionId?: string;
  errorMessageId?: string;
}>;

export type InputContextValue = {
  id: string;
  descriptionId: string;
  errorMessageId: string;
  validationValence: Valence;
};

export const [InputProvider, useInputContext] = createContext<InputContextValue>(INPUT_NAME);

//
// Copyright 2023 DXOS.org
//

import { type Scope, createContextScope } from '@radix-ui/react-context';
import { type PropsWithChildren } from 'react';

// Kept out of `Root.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const INPUT_NAME = 'Input';

export type Valence = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export type InputScopedProps<P> = P & { __inputScope?: Scope };

export type InputRootProps = PropsWithChildren<{
  id?: string;
  validationValence?: Valence;
  descriptionId?: string;
  errorMessageId?: string;
}>;

export const [createInputContext, createInputScope] = createContextScope(INPUT_NAME, []);

export type InputContextValue = {
  id: string;
  descriptionId: string;
  errorMessageId: string;
  validationValence: Valence;
};

export const [InputProvider, useInputContext] = createInputContext<InputContextValue>(INPUT_NAME);

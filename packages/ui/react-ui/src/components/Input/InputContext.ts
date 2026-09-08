//
// Copyright 2026 DXOS.org
//

import { createContext } from '@dxos/react-hooks';

// Kept out of `Input.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const INPUT_NAME = 'Input';

/**
 * The tone of a field's validation message. Ark's field knows only `invalid`; the theme colours
 * the message and the control's ring by the finer grade, so the root keeps it beside the machine.
 */
export type InputValence = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export type InputValenceContextValue = {
  validationValence: InputValence;
};

export const [InputValenceProvider, useInputValence] = createContext<InputValenceContextValue>(INPUT_NAME, {
  validationValence: 'neutral',
});

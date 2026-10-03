//
// Copyright 2026 DXOS.org
//

import { createContext } from '@dxos/react-hooks';

// Kept out of `Input.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export const FIELD_NAME = 'Field';

/**
 * The tone of a field's validation message. Ark's field knows only `invalid`; the theme colours
 * the message and the control's ring by the finer grade, so the root keeps it beside the machine.
 */
export type FieldValence = 'success' | 'info' | 'warning' | 'error' | 'neutral';

export type FieldValenceContextValue = {
  validationValence: FieldValence;
};

export const [FieldValenceProvider, useFieldValence] = createContext<FieldValenceContextValue>(FIELD_NAME, {
  validationValence: 'neutral',
});

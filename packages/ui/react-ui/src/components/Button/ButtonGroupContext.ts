import { createContext } from '@dxos/react-hooks';
//
// Copyright 2022 DXOS.org
//

// Kept out of `Button.tsx`: react-refresh only fast-refreshes a module whose exports are all
// components, so a context and its hook exported beside them force a full page reload on every edit.

export type ButtonGroupContextValue = { inGroup?: boolean };

export const BUTTON_GROUP_NAME = 'ButtonGroup';
export const BUTTON_NAME = 'Button';

export const [ButtonGroupProvider, useButtonGroupContext] = createContext<ButtonGroupContextValue>(BUTTON_GROUP_NAME, {
  inGroup: false,
});

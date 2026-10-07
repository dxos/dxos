//
// Copyright 2024 DXOS.org
//

import React, { type PropsWithChildren } from 'react';

import { useHotkeyScope } from '@dxos/react-focus';
import { useAttention } from '@dxos/react-ui-attention';

export const GLOBAL_SCOPE = 'global';

/**
 * Activates the editor's hotkey scope while it has attention, so `useShortcuts`' commands are
 * live for the editor the user is in and silent for every other one on screen.
 */
export const KeyboardContainer = ({ id, children }: PropsWithChildren<{ id: string }>) => {
  const { hasAttention } = useAttention(id);
  useHotkeyScope(id, hasAttention);
  return <>{children}</>;
};

//
// Copyright 2026 DXOS.org
//

import { type ThemeMode } from '@dxos/ui-types';

import { useThemeContext } from '../hooks/useThemeContext.ts';

// Next styles through `.nx-*` CSS, so these read the existing ThemeProvider's values and never expose its `tx`.

/** The ThemeProvider's light or dark mode. */
export const useThemeMode = (): ThemeMode => useThemeContext().themeMode;

/** The ThemeProvider's platform, if the app set one. */
export const usePlatform = (): 'mobile' | 'desktop' | undefined => useThemeContext().platform;

/** Whether the device shows an iOS on-screen keyboard (measured once by the ThemeProvider). */
export const useIosKeyboard = (): boolean => useThemeContext().hasIosKeyboard;

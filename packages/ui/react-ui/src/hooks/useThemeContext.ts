//
// Copyright 2023 DXOS.org
//

import { useContext } from 'react';

import { log } from '@dxos/log';

import { ThemeContext, type ThemeContextValue } from '../primitives';
import { defaultTx } from '../theme';
import { initialSafeArea } from './useSafeArea';

// Failing soft (rather than throwing) keeps error-reporting surfaces renderable:
// the fatal dialog itself consumes this hook, and a missing provider — including
// the vite dev dual-module split, where the mounted ThemeProvider holds a
// different ThemeContext identity than this consumer — would otherwise crash the
// dialog meant to report the original error.
const fallbackContextValue: ThemeContextValue = {
  tx: defaultTx,
  themeMode: 'dark',
  hasIosKeyboard: false,
  // Every field a real context carries: a consumer that reads one the fallback omits crashes on the
  // path meant to keep it renderable. The unmeasured insets are what a mounted provider starts with.
  safeAreaPadding: initialSafeArea,
};

let warned = false;

export const useThemeContext = (): ThemeContextValue => {
  const contextValue = useContext(ThemeContext);
  if (!contextValue) {
    if (!warned) {
      warned = true;
      log.warn('Missing ThemeContext; falling back to the default theme.');
    }
    return fallbackContextValue;
  }

  return contextValue;
};

//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';

import { useCapability } from '@dxos/app-framework/ui';

import * as DeckCapabilities from '../types/DeckCapabilities';
import type * as Settings from '../types/Settings';

/** Reactive access to the deck plugin settings. */
export const useDeckSettings = (): Settings.Settings => {
  const settingsAtom = useCapability(DeckCapabilities.Settings);
  return useAtomValue(settingsAtom);
};

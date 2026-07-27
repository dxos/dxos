//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';

import { useCapability } from '@dxos/app-framework/ui';

import { DeckCapabilities, type Settings } from '#types';

/** Reactive access to the deck plugin settings. */
export const useDeckSettings = (): Settings.Settings => {
  const settingsAtom = useCapability(DeckCapabilities.Settings);
  return useAtomValue(settingsAtom);
};

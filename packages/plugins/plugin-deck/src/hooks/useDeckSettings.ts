//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';

import * as Hooks from '@dxos/app-framework/Hooks';

import { DeckCapabilities, Settings } from '#types';

/** Reactive access to the deck plugin settings. */
export const useDeckSettings = (): Settings.Settings => {
  const settingsAtom = Hooks.useCapability(DeckCapabilities.Settings);
  return useAtomValue(settingsAtom);
};

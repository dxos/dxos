//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { type ChromaticPalette } from '@dxos/ui-types';

/** The hue the deck's plank headings take right now, from the first `LayoutAccent` contribution holding one. */
export const useLayoutAccent = (): ChromaticPalette | undefined => {
  const accents = Hooks.useCapabilities(AppCapabilities.LayoutAccent);
  const accentAtom = useMemo(
    () => Atom.make((get) => accents.map((accent) => get(accent)).find((hue) => hue !== undefined)),
    [accents],
  );
  return useAtomValue(accentAtom);
};

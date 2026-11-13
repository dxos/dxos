//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

/** The palette hue every plank heading takes right now, from the first `HeadingAccent` contribution holding one. */
export const useHeadingAccent = (): string | undefined => {
  const accents = Hooks.useCapabilities(AppCapabilities.HeadingAccent);
  const accentAtom = useMemo(
    () => Atom.make((get) => accents.map((accent) => get(accent)).find((hue) => hue !== undefined)),
    [accents],
  );
  return useAtomValue(accentAtom);
};

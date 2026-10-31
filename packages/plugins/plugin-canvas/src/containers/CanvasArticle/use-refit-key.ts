//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';

import * as Hooks from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';

const NO_REFITS = Atom.make<Record<string, number>>({});

/** An agent's drawing edit asks for a refit, so the view frames what changed rather than where the viewer left it. */
export const useRefitKey = (canvas: Obj.Unknown): number | undefined => {
  const [refitAtom] = Hooks.useCapabilities(IllustratorCapabilities.Refit);
  return useAtomValue(refitAtom ?? NO_REFITS)[Obj.getURI(canvas)];
};

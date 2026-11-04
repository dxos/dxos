//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Atom from 'effect/reactivity/Atom';
import { useMemo } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import { type Obj } from '@dxos/echo';
import { type Activity } from '@dxos/react-ui-attention/types';

import { AppCapabilities } from '../../app-framework/index.ts';

const noActivity = Atom.make<readonly Activity.Entry[]>([]);

/** Every {@link AppCapabilities.ActivitySource}'s entries for the object at `uri`, live. */
export const useActivity = (uri: string | undefined, object?: Obj.Unknown): readonly Activity.Entry[] => {
  const sources = Hooks.useCapabilities(AppCapabilities.ActivitySource);
  const atom = useMemo(() => {
    if (!uri || sources.length === 0) {
      return noActivity;
    }

    const atoms = sources.map((source) => source.activity({ uri, object }));
    return Atom.make((get) => atoms.flatMap((atom) => get(atom)));
  }, [sources, uri, object]);

  return useAtomValue(atom);
};

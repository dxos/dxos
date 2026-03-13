//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import { useCapability, useOperationInvoker } from '@dxos/app-framework/ui';
import { LayoutOperation, getObjectPathFromObject, getSpacePath } from '@dxos/app-toolkit';
import { Obj } from '@dxos/echo';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckOperation } from '@dxos/plugin-deck/types';

export const useExitPresenter = (object: any) => {
  const { invokePromise } = useOperationInvoker();
  const stateAtom = useCapability(DeckCapabilities.State);
  const state = useAtomValue(stateAtom);

  // Compute deck from decks[activeDeck] since the getter doesn't survive spread operations.
  const deck = useMemo(() => state.decks[state.activeDeck], [state.decks, state.activeDeck]);

  return useCallback(() => {
    const objectPath = getObjectPathFromObject(object);
    const db = Obj.getDatabase(object);
    if (deck?.fullscreen) {
      void invokePromise(DeckOperation.Adjust, {
        type: 'solo--fullscreen' as const,
        id: objectPath,
      });
    }

    return invokePromise(LayoutOperation.Open, {
      subject: [objectPath],
      workspace: db ? getSpacePath(db.spaceId) : undefined,
    });
  }, [invokePromise, object, deck]);
};

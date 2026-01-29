//
// Copyright 2025 DXOS.org
//

import { useAtomValue } from '@effect-atom/atom-react';
import { useCallback, useMemo } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/react';
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
    const objectId = Obj.getDXN(object).toString();
    if (deck?.fullscreen) {
      void invokePromise(DeckOperation.Adjust, {
        type: 'solo--fullscreen',
        id: objectId,
      });
    }
    return invokePromise(Common.LayoutOperation.Open, {
      subject: [objectId],
      workspace: Obj.getDatabase(object)?.spaceId,
    });
  }, [invokePromise, object, deck]);
};

//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { Common } from '@dxos/app-framework';
import { useCapability, useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckOperation } from '@dxos/plugin-deck/types';

export const useExitPresenter = (object: Live<any>) => {
  const { invokePromise } = useOperationInvoker();
  const layout = useCapability(DeckCapabilities.MutableDeckState);

  return useCallback(() => {
    const objectId = Obj.getDXN(object).toString();
    if (layout.deck.fullscreen) {
      void invokePromise(DeckOperation.Adjust, {
        type: 'solo--fullscreen',
        id: objectId,
      });
    }
    return invokePromise(Common.LayoutOperation.Open, {
      subject: [objectId],
      workspace: Obj.getDatabase(object)?.spaceId,
    });
  }, [invokePromise, object, layout]);
};

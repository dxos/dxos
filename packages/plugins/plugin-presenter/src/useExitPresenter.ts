//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { Common, createIntent } from '@dxos/app-framework';
import { useCapability, useIntentDispatcher } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckAction } from '@dxos/plugin-deck/types';

export const useExitPresenter = (object: Live<any>) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const layout = useCapability(DeckCapabilities.MutableDeckState);

  return useCallback(() => {
    const objectId = Obj.getDXN(object).toString();
    if (layout.deck.fullscreen) {
      void dispatch(
        createIntent(DeckAction.Adjust, {
          type: 'solo--fullscreen',
          id: objectId,
        }),
      );
    }
    return dispatch(
      createIntent(Common.LayoutAction.Open, {
        part: 'main',
        subject: [objectId],
        options: { workspace: Obj.getDatabase(object)?.spaceId },
      }),
    );
  }, [dispatch, object]);
};

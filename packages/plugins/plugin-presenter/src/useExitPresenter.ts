//
// Copyright 2025 DXOS.org
//

import { useCallback } from 'react';

import { LayoutAction, createIntent, useCapability, useIntentDispatcher } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { DeckCapabilities } from '@dxos/plugin-deck';
import { DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

export const useExitPresenter = (object: Live<any>) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();
  const layout = useCapability(DeckCapabilities.MutableDeckState);

  return useCallback(() => {
    const objectId = fullyQualifiedId(object);
    if (layout.deck.fullscreen) {
      void dispatch(
        createIntent(DeckAction.Adjust, {
          type: 'solo--fullscreen',
          id: objectId,
        }),
      );
    }
    return dispatch(
      createIntent(LayoutAction.Open, {
        part: 'main',
        subject: [objectId],
        options: { workspace: getSpace(document)?.id },
      }),
    );
  }, [dispatch, object]);
};

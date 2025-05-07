//
// Copyright 2025 DXOS.org
//

import { pipe } from 'effect';
import { useCallback } from 'react';

import { chain, createIntent, LayoutAction, useIntentDispatcher } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { DeckAction } from '@dxos/plugin-deck/types';
import { fullyQualifiedId, getSpace } from '@dxos/react-client/echo';

export const useExitPresenter = (object: Live<any>) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return useCallback(() => {
    const objectId = fullyQualifiedId(object);
    return dispatch(
      pipe(
        createIntent(LayoutAction.Open, {
          part: 'main',
          subject: [objectId],
          options: { workspace: getSpace(document)?.id },
        }),
        chain(DeckAction.Adjust, {
          type: 'solo--fullscreen',
          id: objectId,
        }),
      ),
    );
  }, [dispatch, object]);
};

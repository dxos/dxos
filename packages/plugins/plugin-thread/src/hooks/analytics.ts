//
// Copyright 2024 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type Live } from '@dxos/live-object';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { getSpace } from '@dxos/react-client/echo';
import { useOnTransition } from '@dxos/react-ui';
import { type TextContentBlock } from '@dxos/schema';

export const useOnEditAnalytics = (message: Live<any>, textBlock: TextContentBlock | undefined, editing: boolean) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  const onEdit = useCallback(() => {
    const space = getSpace(message);
    if (!space || !textBlock) {
      return;
    }

    void dispatch(
      createIntent(ObservabilityAction.SendEvent, {
        name: 'threads.message.update',
        properties: {
          spaceId: space.id,
          messageId: message.id,
          messageLength: textBlock?.text.length,
        },
      }),
    );
  }, [dispatch, message, textBlock]);

  useOnTransition(editing, true, false, onEdit);
};

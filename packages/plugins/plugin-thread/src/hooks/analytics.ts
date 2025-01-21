//
// Copyright 2024 DXOS.org
//

import { useCallback } from 'react';

import { createIntent, useIntentDispatcher } from '@dxos/app-framework';
import { type ReactiveObject } from '@dxos/live-object';
import { ObservabilityAction } from '@dxos/plugin-observability/types';
import { getSpace } from '@dxos/react-client/echo';
import { useOnTransition } from '@dxos/react-ui';

export const useAnalyticsCallback = (spaceId: string | undefined, name: string, meta?: any) => {
  const { dispatchPromise: dispatch } = useIntentDispatcher();

  return useCallback(
    (dynamicMeta?: any) => {
      void dispatch(
        createIntent(ObservabilityAction.SendEvent, { name, properties: { ...meta, ...dynamicMeta, spaceId } }),
      );
    },
    [dispatch, name, meta, spaceId],
  );
};

export const useOnEditAnalytics = (message: ReactiveObject<any>, editing: boolean) => {
  const space = getSpace(message);

  const onEditAnalytics = useAnalyticsCallback(space?.id, 'threads.comment-edited', {
    messageId: message.id,
    messageLength: message.text.length,
  });

  useOnTransition(editing, true, false, onEditAnalytics);
};

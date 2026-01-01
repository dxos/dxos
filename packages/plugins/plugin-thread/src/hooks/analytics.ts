//
// Copyright 2024 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/react';
import { Obj } from '@dxos/echo';
import { type Live } from '@dxos/live-object';
import { ObservabilityOperation } from '@dxos/plugin-observability/types';
import { useOnTransition } from '@dxos/react-ui';
import { type ContentBlock } from '@dxos/types';

export const useOnEditAnalytics = (message: Live<any>, textBlock: ContentBlock.Text | undefined, editing: boolean) => {
  const { invokePromise } = useOperationInvoker();

  const onEdit = useCallback(() => {
    const db = Obj.getDatabase(message);
    if (!db || !textBlock) {
      return;
    }

    void invokePromise(ObservabilityOperation.SendEvent, {
      name: 'threads.message.update',
      properties: {
        spaceId: db.spaceId,
        messageId: message.id,
        messageLength: textBlock?.text.length,
      },
    });
  }, [invokePromise, message, textBlock]);

  useOnTransition(editing, true, false, onEdit);
};

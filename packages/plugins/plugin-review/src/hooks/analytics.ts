//
// Copyright 2024 DXOS.org
//

import { useCallback } from 'react';

import { useOperationInvoker } from '@dxos/app-framework/Hooks';
import { Obj } from '@dxos/echo';
import * as ObservabilityOperation from '@dxos/plugin-observability/ObservabilityOperation';
import * as Hooks from '@dxos/react-ui/Hooks';
import { type ContentBlock, type Message } from '@dxos/types';

export const useOnEditAnalytics = (
  message: Message.Message | undefined,
  textBlock: ContentBlock.Text | undefined,
  editing: boolean,
) => {
  const { invokePromise } = useOperationInvoker();

  const onEdit = useCallback(() => {
    if (!message || !textBlock) {
      return;
    }

    const db = Obj.getDatabase(message);
    if (!db) {
      return;
    }

    void invokePromise(ObservabilityOperation.SendEvent, {
      name: 'comments.message.update',
      properties: {
        spaceId: db.spaceId,
        messageId: message.id,
        messageLength: textBlock?.text.length,
      },
    });
  }, [invokePromise, message, textBlock]);

  Hooks.useOnTransition(editing, true, false, onEdit);
};

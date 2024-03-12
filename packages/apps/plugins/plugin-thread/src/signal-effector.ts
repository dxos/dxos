//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { Effector } from '@dxos/functions-signal';
import { type LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { TextObject, type Space } from '@dxos/react-client/echo';

import { type ThreadSettingsProps } from './types';

export const SIGNAL_CONFIRMATION = 'signal-confirmation';

export const createEffector = (space: Space, settings: LocalStorageStore<ThreadSettingsProps>) => {
  const StandaloneSuggestionSignal = S.struct({
    kind: S.literal('suggestion'),
    data: S.struct({
      type: S.literal(`threads.${SIGNAL_CONFIRMATION}`),
      value: S.struct({
        senderKey: S.string,
        message: S.string,
        confirmationSignalData: S.string,
        activeObjectId: S.string,
      }),
    }),
  });
  return Effector.forSignalSchema(space, StandaloneSuggestionSignal, (effectorCtx, signal) => {
    if (!settings.values.standalone) {
      return;
    }
    log.info('thread confirmation signal received', { signal });
    const [thread] = space?.db.query(ThreadType.filter((thread) => !thread.context)).objects ?? [];
    if (!thread) {
      return;
    }
    const data = signal.data.value;
    thread.messages.push(
      new MessageType({
        type: SIGNAL_CONFIRMATION,
        subject: data.activeObjectId,
        from: { identityKey: data.senderKey },
        blocks: [{ content: new TextObject(data.message) }],
        context: { object: data.confirmationSignalData },
      }),
    );
  });
};

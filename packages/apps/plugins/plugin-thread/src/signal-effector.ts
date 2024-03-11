//
// Copyright 2024 DXOS.org
//

import * as S from '@effect/schema/Schema';
import * as Either from 'effect/Either';

import { Thread as ThreadType, Message as MessageType } from '@braneframe/types';
import { type Signal, SignalBusInterconnect } from '@dxos/functions-signal';
import { type LocalStorageStore } from '@dxos/local-storage';
import { log } from '@dxos/log';
import { TextObject, type Space } from '@dxos/react-client/echo';

import { type ThreadSettingsProps } from './types';

export const SIGNAL_CONFIRMATION = 'signal-confirmation';

export const StandaloneSuggestionSignal = S.struct({
  kind: S.literal('suggestion'),
  data: S.struct({
    type: S.literal('threads.signal-confirmation'),
    value: S.struct({
      senderKey: S.string,
      message: S.string,
      confirmationSignalData: S.string,
      activeObjectId: S.string,
    }),
  }),
});

export const createEffector = (space: Space, settings: LocalStorageStore<ThreadSettingsProps>) => {
  const bus = SignalBusInterconnect.global.createConnected(space);
  const validator = S.validateEither(StandaloneSuggestionSignal);
  return bus.subscribe((signal: Signal) => {
    if (!settings.values.standalone) {
      return;
    }
    const validation = validator(signal);
    if (Either.isLeft(validation)) {
      return;
    }
    const validatedSignal = validation.right;
    log.info('thread confirmation signal received', { validatedSignal });
    const [thread] = space?.db.query(ThreadType.filter((thread) => !thread.context)).objects ?? [];
    if (!thread) {
      return;
    }
    const data = validatedSignal.data.value;
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

import { Message } from '@dxos/types';

import { Schema } from 'effect';

const parseConversation = (json: unknown): readonly Message.Message[] => {
  return Schema.Array(Message.Message).pipe(Schema.decodeUnknownSync)(json);
};

export const internetOrderConversation: () => Promise<readonly Message.Message[]> = () =>
  import('./internet-order.json').then((module) => {
    const data = (module as { default?: unknown }).default ?? module;
    return parseConversation(data);
  });

//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { Message } from '@dxos/types';

const parseConversation = (json: unknown): readonly Message.Message[] => {
  return Schema.Array(Message.Message).pipe(Schema.decodeUnknownSync)(json);
};

export const internetOrderConversation: () => Promise<readonly Message.Message[]> = () =>
  import('./internet-order.json').then((module) => {
    const data = (module as { default?: unknown }).default ?? module;
    return parseConversation(data);
  });

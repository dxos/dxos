//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities } from '@dxos/app-framework';
import type { Capability } from '@dxos/app-framework';
import { Obj } from '@dxos/echo';
import { Operation } from '@dxos/operation';

import { AssistantCapabilities } from '../types';
import { SetCurrentChat } from './definitions';

export default SetCurrentChat.pipe(
  Operation.withHandler(
    Effect.fnUntraced(function* ({ companionTo, chat }) {
      const companionToId = Obj.getDXN(companionTo).toString();
      const chatId = chat && Obj.getDXN(chat).toString();
      yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
        ...current,
        currentChat: { ...current.currentChat, [companionToId]: chatId },
      }));
    }),
  ),
);

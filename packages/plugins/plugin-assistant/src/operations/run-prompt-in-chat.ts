//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AssistantCapabilities, AssistantOperation } from '#types';

import { getChatPath } from '../paths';

const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInChat> =
  AssistantOperation.RunPromptInChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat, prompt }) {
        const db = Obj.getDatabase(chat);
        invariant(db, 'Chat must belong to a space.');

        // Keyed by the path the layout opens with, which is what reaches `ChatArticle` as its
        // `attendableId` — the two must agree or the prompt is never picked up.
        const chatPath = getChatPath(db.spaceId, chat.id);
        yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
          ...current,
          pendingPrompts: { ...current.pendingPrompts, [chatPath]: prompt },
        }));
        yield* Operation.invoke(LayoutOperation.Open, { subject: [chatPath] });
      }),
    ),
  );

export default handler;

//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as NavigationOperation from '@dxos/app-toolkit/NavigationOperation';
import * as Operation from '@dxos/compute/Operation';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';

import { AssistantCapabilities, AssistantOperation } from '#types';

const handler: Operation.WithHandler<typeof AssistantOperation.RunPromptInChat> =
  AssistantOperation.RunPromptInChat.pipe(
    Operation.withHandler(
      Effect.fnUntraced(function* ({ chat, prompt }) {
        const db = Obj.getDatabase(chat);
        invariant(db, 'Chat must belong to a space.');
        const spaceId = db.spaceId;

        // Resolved rather than composed from `getChatPath`: a chat filed under a project sits on a
        // branch of its own, and only the resolver knows where an object is addressable.
        const { targets } = yield* Operation.invoke(
          NavigationOperation.ResolveNavigationTargets,
          { query: { uri: Obj.getURI(chat) } },
          { spaceId },
        );
        const target = targets[0];
        invariant(target, 'Chat has no navigation target.');

        // Keyed by the path the layout opens, which is what reaches `ChatArticle` as its
        // `attendableId` — the two must agree or the prompt is never picked up.
        yield* Capabilities.updateAtomValue(AssistantCapabilities.State, (current) => ({
          ...current,
          pendingPrompts: { ...current.pendingPrompts, [target.path]: prompt },
        }));
        yield* Operation.invoke(LayoutOperation.Open, { subject: [target.path] }, { spaceId });
      }),
    ),
  );

export default handler;

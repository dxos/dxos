//
// Copyright 2026 DXOS.org
//

import { RegistryContext } from '@effect/atom-react/RegistryContext';
import * as Effect from 'effect/Effect';
import { useContext, useState } from 'react';

import { AiSession } from '@dxos/assistant';
import type * as Chat from '@dxos/assistant/Chat';
import { Database, type Feed } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';
import * as UiHooks from '@dxos/react-ui/Hooks';

export type UseAiSessionProps = {
  db?: Database.Database;
  chat?: Chat.Chat;
  /** The chat's resolved feed. */
  feed?: Feed.Feed;
};

type OpenedSession = {
  db: Database.Database;
  feed: Feed.Feed;
  session: AiSession.Session;
};

/**
 * Opens the chat's session, and returns it only while it is the session of `feed` in `db`.
 *
 * A session is held with what it was opened for: when the chat changes, the previous chat's session
 * stays in state until its effect cleans up, a commit later, and handing it out for the new feed
 * would build a chat model (and render a thread) for the wrong conversation in between.
 */
export const useAiSession = ({ db, chat, feed }: UseAiSessionProps): AiSession.Session | undefined => {
  const observableRegistry = useContext(RegistryContext);
  const [opened, setOpened] = useState<OpenedSession>();

  UiHooks.useAsyncEffect(async () => {
    if (!db || !chat || !feed) {
      return;
    }

    const runtime = await EffectEx.runAndForwardErrors(
      Effect.context<Database.Service>().pipe(Effect.provide(Database.layer(db))),
    );
    const session = new AiSession.Session({
      feed,
      runtime,
      registry: observableRegistry,
    });
    const openedAt = performance.now();
    await session.open();
    log('session opened', { chat: chat.id, duration: Math.round(performance.now() - openedAt) });
    setOpened({ db, feed, session });
    return () => {
      void session.close();
      setOpened((current) => (current?.session === session ? undefined : current));
    };
  }, [db, chat, feed]);

  return opened && opened.db === db && opened.feed === feed ? opened.session : undefined;
};

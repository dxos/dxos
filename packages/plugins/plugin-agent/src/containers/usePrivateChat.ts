//
// Copyright 2026 DXOS.org
//

import { useCallback, useEffect, useState } from 'react';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Hooks from '@dxos/app-framework/Hooks';
import * as PluginManagerProvider from '@dxos/app-framework/PluginManagerProvider';
import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { useIdentity } from '@dxos/halo-react';

import { AgentOperation } from '#types';

export type PrivateChatState = {
  /** The viewer's chat with the agent, once opened. */
  chat?: Chat.Chat;
  /** Opening failed; {@link retry} tries again. */
  failed: boolean;
  retry: () => void;
};

/**
 * Opens (or creates) the viewing member's private chat with the agent, hosted on EDGE.
 */
export const usePrivateChat = (agent: Agent.Agent): PrivateChatState => {
  const manager = PluginManagerProvider.usePluginManager();
  const { invokePromise } = Hooks.useOperationInvoker();
  const identity = useIdentity();
  const db = Obj.getDatabase(agent);
  const [chat, setChat] = useState<Chat.Chat>();
  const [failed, setFailed] = useState(false);
  // Bumped by the retry button to re-run the effect.
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!identity || !db) {
      return;
    }

    let cancelled = false;
    setChat(undefined);
    setFailed(false);
    void (async () => {
      // Operation handlers register on Idle, which a page opened straight onto the agent reaches only after this mounts.
      await EffectEx.runPromise(manager.activate(ActivationEvents.Idle)).catch(() => undefined);
      if (cancelled) {
        return;
      }
      const { data, error } = await invokePromise(
        AgentOperation.OpenPrivateChat,
        {
          agent: Ref.make(agent),
          identityDid: identity.did,
          name: identity.displayName ?? 'Me',
          remote: true,
        },
        { spaceId: db.spaceId },
      );
      if (cancelled) {
        return;
      }
      if (error || !data) {
        setFailed(true);
        return;
      }

      // The returned ref crossed the operation boundary without a resolver, so it is re-made on the database.
      const loaded = await db
        .makeRef<Chat.Chat>(data.chat.uri)
        .tryLoad()
        .catch(() => undefined);
      if (!cancelled) {
        if (loaded) {
          setChat(loaded);
        } else {
          setFailed(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [manager, invokePromise, agent, db, identity?.did, identity?.displayName, attempt]);

  const retry = useCallback(() => setAttempt((count) => count + 1), []);
  return { chat, failed, retry };
};

//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj, Ref } from '@dxos/echo';
import { useIdentity } from '@dxos/halo-react';
import * as Panel from '@dxos/react-ui/Panel';

import { AgentOperation } from '#types';

export type AgentPrivateChatProps = {
  role?: string;
  agent: Agent.Agent;
  attendableId?: string;
};

/**
 * The Agent's article: the viewing member's own chat with the agent, private to their identity and hosted
 * on EDGE, so a relay from another member's chat can wake it while the app is closed. Each member opening
 * the same agent sees only their own conversation.
 */
export const AgentPrivateChat = ({ role, agent, attendableId }: AgentPrivateChatProps) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const identity = useIdentity();
  const db = Obj.getDatabase(agent);
  const [chat, setChat] = useState<Chat.Chat>();

  useEffect(() => {
    if (!identity || !db) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const { data } = await invokePromise(
        AgentOperation.OpenPrivateChat,
        {
          agent: Ref.make(agent),
          identityDid: identity.did,
          name: identity.displayName ?? 'Me',
          remote: true,
        },
        { spaceId: db.spaceId },
      );
      if (!data || cancelled) {
        return;
      }

      // The returned ref crossed the operation boundary without a resolver, so it is re-made on the database.
      const loaded = await db.makeRef<Chat.Chat>(data.chat.uri).load();
      if (!cancelled) {
        setChat(loaded);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [invokePromise, agent, db, identity?.did, identity?.displayName]);

  const data = useMemo(() => (chat ? { subject: chat, attendableId } : undefined), [chat, attendableId]);
  return data ? (
    <Surface.Surface type={AppSurface.Article} role={role} data={data} limit={1} />
  ) : (
    <Panel.Root role={role} />
  );
};

AgentPrivateChat.displayName = 'AgentPrivateChat';

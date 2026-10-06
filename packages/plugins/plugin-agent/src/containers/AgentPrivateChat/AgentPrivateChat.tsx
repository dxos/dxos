//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Agent from '@dxos/assistant/Agent';
import type * as Chat from '@dxos/assistant/Chat';
import { Obj, Ref } from '@dxos/echo';
import { useIdentity } from '@dxos/halo-react';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';
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
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { invokePromise } = AppHooks.useOperationInvoker();
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
    setFailed(false);
    void (async () => {
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
      const loaded = await db.makeRef<Chat.Chat>(data.chat.uri).tryLoad();
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
  }, [invokePromise, agent, db, identity?.did, identity?.displayName, attempt]);

  const data = useMemo(() => (chat ? { subject: chat, attendableId } : undefined), [chat, attendableId]);
  if (data) {
    return <Surface.Surface type={AppSurface.Article} role={role} data={data} limit={1} />;
  }

  return (
    <Panel.Root role={role}>
      {failed && (
        <Layout.Flex column center classNames='gap-2 p-4 text-fg-muted' role='alert'>
          {t('private-chat-failed.message')}
          <Button.Root
            icon='ph--arrow-clockwise--regular'
            label={t('private-chat-retry.label')}
            onClick={() => setAttempt((count) => count + 1)}
          />
        </Layout.Flex>
      )}
    </Panel.Root>
  );
};

AgentPrivateChat.displayName = 'AgentPrivateChat';

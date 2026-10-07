//
// Copyright 2026 DXOS.org
//

import React, { useMemo } from 'react';

import * as Surface from '@dxos/app-framework/Surface';
import * as AppSurface from '@dxos/app-toolkit/AppSurface';
import type * as Agent from '@dxos/assistant/Agent';
import * as Button from '@dxos/react-ui/Button';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Layout from '@dxos/react-ui/Layout';
import * as Panel from '@dxos/react-ui/Panel';

import { meta } from '#meta';

import { usePrivateChat } from '../usePrivateChat.ts';

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
  const { chat, failed, retry } = usePrivateChat(agent);

  const data = useMemo(() => (chat ? { subject: chat, attendableId } : undefined), [chat, attendableId]);
  if (data) {
    return <Surface.Surface type={AppSurface.Article} role={role} data={data} limit={1} />;
  }

  return (
    <Panel.Root role={role}>
      {failed && (
        <Layout.Flex column center classNames='gap-2 p-4 text-fg-muted' role='alert'>
          {t('private-chat-failed.message')}
          <Button.Root icon='ph--arrow-clockwise--regular' label={t('private-chat-retry.label')} onClick={retry} />
        </Layout.Flex>
      )}
    </Panel.Root>
  );
};

AgentPrivateChat.displayName = 'AgentPrivateChat';

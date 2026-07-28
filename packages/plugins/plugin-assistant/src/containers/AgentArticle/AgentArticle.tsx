//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Agent, AgentChat } from '@dxos/assistant-toolkit';
import { Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import { InstructionsEditor } from '@dxos/plugin-routine/components';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

export type AgentArticleProps = AppSurface.ObjectArticleProps<Agent.Agent>;

/**
 * Article surface for an {@link Agent} — the identity/preset: its instructions (text, skills,
 * objects, commands) plus a reset for its conversation history. Durable artifacts live on a
 * Project; automation (subscriptions/schedule) is edited in the properties panel.
 */
export const AgentArticle = ({ role, subject: agent }: AgentArticleProps) => {
  const { t } = useTranslation(meta.profile.key);
  const db = Obj.getDatabase(agent);
  // Resolve reactively: a sync `.target` read never resolves on a cold/deep-link load.
  const [instructionsSnapshot] = useObject(agent.instructions);
  const instructions = Obj.getReactiveOrUndefined(instructionsSnapshot);

  const spaceId = db?.spaceId;
  const resetHistory = useSpaceCallback(
    spaceId,
    [Database.Service],
    Effect.fnUntraced(function* () {
      yield* AgentChat.resetChatHistory(agent);
    }),
    [agent],
  );
  const handleResetHistory = useCallback(async () => {
    await resetHistory();
  }, [resetHistory]);

  if (!db) {
    return null;
  }

  return (
    <Panel.Root role={role}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <Toolbar.Separator variant='gap' />
          <Toolbar.IconButton
            icon='ph--trash--regular'
            label={t('reset-history.button')}
            onClick={handleResetHistory}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content classNames='dx-container'>
        {instructions && <InstructionsEditor db={db} instructions={instructions} />}
      </Panel.Content>
    </Panel.Root>
  );
};

AgentArticle.displayName = 'AgentArticle';

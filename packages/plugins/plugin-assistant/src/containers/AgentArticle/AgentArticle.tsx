//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import type * as AppSurface from '@dxos/app-toolkit/AppSurface';
import * as Agent from '@dxos/assistant/Agent';
import { Database, Obj } from '@dxos/echo';
import { useObject } from '@dxos/echo-react';
import * as InstructionsEditor from '@dxos/plugin-routine/InstructionsEditor';
import * as Button from '@dxos/react-ui/Button';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Panel from '@dxos/react-ui/Panel';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { meta } from '#meta';

export type AgentArticleProps = AppSurface.ObjectArticleProps<Agent.Agent>;

/**
 * Article surface for an {@link Agent} — the identity/preset: its instructions (text, skills,
 * objects, commands) plus a reset for its conversation history. Durable artifacts live on a
 * Project; automation (subscriptions/schedule) is edited in the properties panel.
 */
export const AgentArticle = ({ role, subject: agent }: AgentArticleProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const db = Obj.getDatabase(agent);
  // Resolve reactively: a sync `.target` read never resolves on a cold/deep-link load.
  const [instructionsSnapshot] = useObject(agent.instructions);
  const instructions = Obj.getReactiveOrUndefined(instructionsSnapshot);

  const spaceId = db?.spaceId;
  const resetHistory = Hooks.useSpaceCallback(
    spaceId,
    [Database.Service],
    Effect.fnUntraced(function* () {
      yield* Agent.resetChatHistory(agent);
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
      <Panel.Header>
        <Toolbar.Root classNames='dx-document'>
          <Toolbar.Separator />
          <Button.Root icon='ph--trash--regular' label={t('reset-history.button')} onClick={handleResetHistory} />
        </Toolbar.Root>
      </Panel.Header>
      <Panel.Body classNames='dx-document'>
        {instructions && <InstructionsEditor.Root db={db} instructions={instructions} />}
      </Panel.Body>
    </Panel.Root>
  );
};

AgentArticle.displayName = 'AgentArticle';

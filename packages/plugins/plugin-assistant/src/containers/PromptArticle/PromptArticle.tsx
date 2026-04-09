//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { type Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { useComputeRuntimeCallback } from '@dxos/plugin-automation/hooks';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TemplateEditor } from '#components';
import { meta } from '#meta';

export type PromptArticleProps = AppSurface.ObjectArticleProps<Prompt.Prompt>;

export const PromptArticle = ({ role, attendableId, subject }: PromptArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { hasAttention } = useAttention(attendableId);
  const db = Obj.getDatabase(subject);

  const inputData = useMemo<Operation.Definition.Input<typeof AgentPrompt> | undefined>(
    () =>
      subject && db
        ? {
            prompt: db.makeRef(Obj.getDXN(subject)),
            input: {},
          }
        : undefined,
    [subject, db],
  );

  const handleRun = useComputeRuntimeCallback(
    db?.spaceId,
    () => {
      invariant(inputData);
      return Operation.invoke(AgentPrompt, inputData);
    },
    [inputData],
  );

  return (
    <Panel.Root role={role} className='dx-document'>
      <Panel.Toolbar asChild>
        <Toolbar.Root disabled={!hasAttention} onClick={handleRun}>
          <Toolbar.IconButton iconOnly icon='ph--play--regular' label={t('run-prompt.label')} onClick={handleRun} />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content asChild>
        <TemplateEditor id={subject.id} template={subject.instructions} />
      </Panel.Content>
    </Panel.Root>
  );
};

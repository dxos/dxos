//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { useSpaceCallback } from '@dxos/app-framework/ui';
import { type AppSurface } from '@dxos/app-toolkit/ui';
import { AgentPrompt } from '@dxos/assistant-toolkit';
import { type Routine } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Operation } from '@dxos/operation';
import { Panel, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { TemplateEditor } from '#components';
import { meta } from '#meta';

export type RoutineArticleProps = AppSurface.ObjectArticleProps<Routine.Routine>;

export const RoutineArticle = ({ role, attendableId, subject }: RoutineArticleProps) => {
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

  const handleRun = useSpaceCallback(
    db?.spaceId,
    [] as const,
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

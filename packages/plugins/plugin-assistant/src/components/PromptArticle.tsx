//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-framework/react';
import { Agent } from '@dxos/assistant-toolkit';
import { type Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { invokeFunctionWithTracing, useComputeRuntimeCallback } from '@dxos/plugin-automation';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';

import { TemplateEditor } from './TemplateEditor';

export type PromptArticleProps = SurfaceComponentProps<Prompt.Prompt>;

export const PromptArticle = ({ subject }: PromptArticleProps) => {
  const { t } = useTranslation(meta.id);
  const db = Obj.getDatabase(subject);
  const { hasAttention } = useAttention(Obj.getDXN(subject).toString());

  const inputData = useMemo(
    () =>
      subject && {
        prompt: db?.makeRef(Obj.getDXN(subject)),
        input: {},
      },
    [subject, db],
  );

  const handleRun = useComputeRuntimeCallback(db?.spaceId, () => invokeFunctionWithTracing(Agent.prompt, inputData), [
    inputData,
  ]);

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root disabled={!hasAttention} onClick={handleRun}>
        <Toolbar.IconButton iconOnly icon='ph--play--regular' label={t('run prompt label')} onClick={handleRun} />
      </Toolbar.Root>
      <TemplateEditor id={subject.id} template={subject.instructions} classNames='container-max-width' />
    </StackItem.Content>
  );
};

export default PromptArticle;

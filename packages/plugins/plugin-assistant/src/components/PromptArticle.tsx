//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { AgentFunctions } from '@dxos/assistant-toolkit';
import { type Prompt } from '@dxos/blueprints';
import { Obj } from '@dxos/echo';
import { type FunctionDefinition } from '@dxos/functions';
import { invariant } from '@dxos/invariant';
import { invokeFunctionWithTracing, useComputeRuntimeCallback } from '@dxos/plugin-automation';
import { Layout, Toolbar, useTranslation } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';

import { meta } from '../meta';

import { TemplateEditor } from './TemplateEditor';

export type PromptArticleProps = SurfaceComponentProps<Prompt.Prompt>;

type PromptInput = FunctionDefinition.Input<typeof AgentFunctions.Prompt>;

export const PromptArticle = ({ role, subject }: PromptArticleProps) => {
  const { t } = useTranslation(meta.id);
  const { hasAttention } = useAttention(Obj.getDXN(subject).toString());
  const db = Obj.getDatabase(subject);

  const inputData = useMemo<PromptInput | undefined>(
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
      return invokeFunctionWithTracing(AgentFunctions.Prompt, inputData);
    },
    [inputData],
  );

  return (
    <Layout.Main role={role} toolbar>
      <Toolbar.Root disabled={!hasAttention} onClick={handleRun}>
        <Toolbar.IconButton iconOnly icon='ph--play--regular' label={t('run prompt label')} onClick={handleRun} />
      </Toolbar.Root>
      <TemplateEditor id={subject.id} template={subject.instructions} classNames='container-max-width' />
    </Layout.Main>
  );
};

export default PromptArticle;

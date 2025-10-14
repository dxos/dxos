//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';

import { meta } from '../meta';
import { ComputeGraph } from '../notebook';
import { type Notebook } from '../types';

import { NotebookStack } from './NotebookStack';
import { type TypescriptEditorProps } from './TypescriptEditor';

export type NotebookContainerProps = {
  role?: string;
  notebook?: Notebook.Notebook;
} & Pick<TypescriptEditorProps, 'env'>;

export const NotebookContainer = ({ notebook, env }: NotebookContainerProps) => {
  const { t } = useTranslation(meta.id);

  const computeGraph = useMemo(() => notebook && new ComputeGraph(notebook), [notebook]);

  const handleCompute = useCallback(() => {
    const values = computeGraph?.evaluate();
    console.log(JSON.stringify(values, null, 2));
  }, [computeGraph]);

  return (
    <StackItem.Content toolbar>
      <Toolbar.Root>
        <Toolbar.IconButton icon='ph--plus--regular' iconOnly label={t('add cell label')} />
        <Toolbar.IconButton
          icon='ph--play--fill'
          iconOnly
          label={t('compute label')}
          classNames='text-green-500'
          onClick={handleCompute}
        />
      </Toolbar.Root>
      <NotebookStack notebook={notebook} env={env} />
    </StackItem.Content>
  );
};

export default NotebookContainer;

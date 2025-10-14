//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Obj, Ref } from '@dxos/echo';
import { ScriptType } from '@dxos/functions';
import { Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';
import { ComputeGraph } from '../notebook';
import { type Notebook } from '../types';

import { NotebookStack, type NotebookStackProps } from './NotebookStack';
import { type TypescriptEditorProps } from './TypescriptEditor';

export type NotebookContainerProps = {
  role?: string;
  notebook?: Notebook.Notebook;
} & Pick<TypescriptEditorProps, 'env'>;

export const NotebookContainer = ({ notebook, env }: NotebookContainerProps) => {
  const { t } = useTranslation(meta.id);

  const graph = useMemo(() => notebook && new ComputeGraph(notebook), [notebook]);

  const handleCompute = useCallback(() => {
    graph?.evaluate();
    console.log(JSON.stringify({ values: graph?.values.value, expressions: graph?.expressions }, null, 2));
  }, [graph]);

  const handleCellInsert = useCallback<NonNullable<NotebookStackProps['onCellInsert']>>(
    (after) => {
      const idx = after ? notebook!.cells.findIndex((cell) => cell.id === after) : notebook!.cells.length;
      notebook?.cells.splice(idx, 0, {
        id: crypto.randomUUID(),
        script: Ref.make(Obj.make(ScriptType, { source: Ref.make(DataType.makeText()) })),
      });
    },
    [notebook],
  );

  const handleCellDelete = useCallback<NonNullable<NotebookStackProps['onCellDelete']>>(
    (id: string) => {
      const idx = notebook!.cells.findIndex((cell) => cell.id === id);
      if (idx !== -1) {
        notebook!.cells.splice(idx, 1);
      }
    },
    [notebook],
  );

  return (
    <StackItem.Content classNames='container-max-width border-l border-r border-subduedSeparator' toolbar>
      <Toolbar.Root>
        <Toolbar.IconButton
          icon='ph--plus--regular'
          iconOnly
          label={t('add cell label')}
          onClick={() => handleCellInsert('')}
        />
        <Toolbar.IconButton
          icon='ph--play--fill'
          iconOnly
          label={t('compute label')}
          classNames='text-green-500'
          onClick={handleCompute}
        />
      </Toolbar.Root>
      <NotebookStack
        notebook={notebook}
        graph={graph}
        env={env}
        onCellInsert={handleCellInsert}
        onCellDelete={handleCellDelete}
      />
    </StackItem.Content>
  );
};

export default NotebookContainer;

//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getSpace } from '@dxos/react-client/echo';
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
  const space = getSpace(notebook);

  const graph = useMemo(() => notebook && new ComputeGraph(notebook), [notebook]);

  // TODO(burdon): Cache values in context (preserve when switched).
  const handleCompute = useCallback(() => {
    graph?.evaluate();
  }, [graph]);

  const handleRearrange = useCallback<NonNullable<NotebookStackProps['onRearrange']>>(
    (source, target) => {
      invariant(notebook);
      const from = notebook.cells.findIndex((cell) => cell.id === source.id);
      const to = notebook.cells.findIndex((cell) => cell.id === target.id);
      if (from != null && to != null) {
        const cell = notebook.cells.splice(from, 1)[0];
        if (cell) {
          notebook.cells.splice(to, 0, cell);
        }
      }
    },
    [notebook],
  );

  const handleCellInsert = useCallback<NonNullable<NotebookStackProps['onCellInsert']>>(
    (type, after) => {
      invariant(notebook);
      const idx = after ? notebook!.cells.findIndex((cell) => cell.id === after) : notebook.cells.length;
      notebook.cells.splice(idx, 0, {
        id: crypto.randomUUID(),
        type,
        script: Ref.make(DataType.makeText()),
      });
    },
    [notebook],
  );

  const handleCellDelete = useCallback<NonNullable<NotebookStackProps['onCellDelete']>>(
    (id) => {
      invariant(notebook);
      const idx = notebook.cells.findIndex((cell) => cell.id === id);
      if (idx !== -1) {
        notebook.cells.splice(idx, 1);
      }
    },
    [notebook],
  );

  // TODO(burdon): Run prompt (pass in computed variables).
  const handleCellRun = useCallback<NonNullable<NotebookStackProps['onCellRun']>>((id) => {
    log.info('run', { id });
  }, []);

  return (
    <StackItem.Content classNames='container-max-width border-l border-r border-subduedSeparator' toolbar>
      <Toolbar.Root>
        <Toolbar.IconButton
          icon='ph--plus--regular'
          iconOnly
          label={t('add cell label')}
          onClick={() => handleCellInsert('script', undefined)}
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
        space={space}
        notebook={notebook}
        graph={graph}
        env={env}
        onRearrange={handleRearrange}
        onCellInsert={handleCellInsert}
        onCellDelete={handleCellDelete}
        onCellRun={handleCellRun}
      />
    </StackItem.Content>
  );
};

export default NotebookContainer;

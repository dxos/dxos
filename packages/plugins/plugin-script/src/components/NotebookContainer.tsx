//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Ref } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { Assistant } from '@dxos/plugin-assistant';
import { getSpace } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, Toolbar, useTranslation } from '@dxos/react-ui';
import { StackItem } from '@dxos/react-ui-stack';
import { DataType } from '@dxos/schema';

import { meta } from '../meta';
import { ComputeGraph } from '../notebook';
import { type Notebook } from '../types';

import { NotebookMenu, NotebookStack, type NotebookStackProps } from './NotebookStack';
import { type TypescriptEditorProps } from './TypescriptEditor';

// TODO(burdon): Support calling named deployed functions (as with sheet).

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
      const cell: Notebook.Cell = { id: crypto.randomUUID(), type };
      switch (type) {
        case 'markdown':
        case 'script':
        case 'query': {
          cell.script = Ref.make(DataType.makeText());
          break;
        }

        case 'prompt': {
          if (space) {
            cell.chat = Ref.make(Assistant.makeChat({ queue: space.queues.create() }));
          }
          break;
        }
      }

      const idx = after ? notebook.cells.findIndex((cell) => cell.id === after) : notebook.cells.length;
      notebook.cells.splice(idx, 0, cell);
    },
    [space, notebook],
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

  return (
    <StackItem.Content classNames='container-max-width border-l border-r border-subduedSeparator' toolbar>
      <Toolbar.Root>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton icon='ph--plus--regular' iconOnly label={t('notebook cell insert label')} />
          </DropdownMenu.Trigger>
          <NotebookMenu onCellInsert={handleCellInsert} />
        </DropdownMenu.Root>
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
      />
    </StackItem.Content>
  );
};

export default NotebookContainer;

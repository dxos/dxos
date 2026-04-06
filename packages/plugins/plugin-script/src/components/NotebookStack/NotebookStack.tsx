//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DropdownMenu, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem, type StackProps } from '@dxos/react-ui-stack';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '../../meta';
import { type Notebook } from '#types';
import { type TypescriptEditorProps } from '../TypescriptEditor';

import { NotebookCell, type NotebookCellProps } from './NotebookCell';
import { NotebookMenu } from './NotebookMenu';

const minSectionHeight = 'min-h-[16rem]';

export type NotebookStackProps = ThemedClassName<
  {
    notebook?: Notebook.Notebook;
    onRearrange?: StackProps['onRearrange'];
  } & (Pick<NotebookSectionProps, 'db' | 'graph' | 'promptResults' | 'onCellInsert' | 'onCellDelete'> &
    Pick<TypescriptEditorProps, 'env'>)
>;

// TODO(burdon): Option for narrow rail (with compact buttons that align with first button in toolbar).
export const NotebookStack = composable<HTMLDivElement, NotebookStackProps>(
  ({ notebook, onRearrange, db, graph, promptResults, onCellInsert, onCellDelete, env, ...props }, forwardedRef) => {
    const sectionProps = { db, graph, promptResults, onCellInsert, onCellDelete, env };
    return (
      <Stack
        {...composableProps(props)}
        orientation='vertical'
        size='contain'
        rail
        onRearrange={onRearrange}
        ref={forwardedRef}
      >
        {notebook?.cells.map((cell, i) => (
          <NotebookSection key={i} cell={cell} {...sectionProps} />
        ))}
      </Stack>
    );
  },
);

type NotebookSectionProps = NotebookCellProps;

const NotebookSection = ({
  cell,
  db,
  env,
  promptResults,
  onCellInsert,
  onCellDelete,
  ...props
}: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);
  const resizable = cell.type === 'query';

  return (
    <StackItem.Root role='section' item={cell} draggable classNames={resizable && minSectionHeight}>
      <StackItem.Heading classNames='h-full p-1 justify-between dx-attention-surface'>
        <StackItem.DragHandle asChild>
          <IconButton variant='ghost' icon='ph--dots-six-vertical--regular' iconOnly label='Drag handle' />
        </StackItem.DragHandle>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton
              variant='ghost'
              icon='ph--dots-three--regular'
              iconOnly
              label={t('notebook-cell-insert.label')}
            />
          </DropdownMenu.Trigger>
          <NotebookMenu cell={cell} onCellInsert={onCellInsert} onCellDelete={onCellDelete} />
        </DropdownMenu.Root>
        {resizable && <StackItem.ResizeHandle />}
      </StackItem.Heading>

      {/* TODO(burdon): Move drag preview to outer stack (uniformly). */}
      <StackItem.DragPreview>
        {({ item: cell }) => (
          <StackItem.Content classNames='overflow-visible bg-group-surface border border-subdued-separator'>
            <NotebookCell db={db} cell={cell} env={env} dragging />
          </StackItem.Content>
        )}
      </StackItem.DragPreview>

      <StackItem.Content classNames='overflow-visible'>
        <NotebookCell db={db} cell={cell} env={env} promptResults={promptResults} {...props} />
      </StackItem.Content>
    </StackItem.Root>
  );
};

//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DropdownMenu, IconButton, type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem, type StackProps } from '@dxos/react-ui-stack';

import { meta } from '../../meta';
import { type Notebook } from '../../types';
import { type TypescriptEditorProps } from '../TypescriptEditor';

import { NotebookCell, type NotebookCellProps } from './NotebookCell';
import { NotebookMenu } from './NotebookMenu';

const minSectionHeight = 'min-bs-[16rem]';

export type NotebookStackProps = ThemedClassName<
  {
    notebook?: Notebook.Notebook;
    onRearrange?: StackProps['onRearrange'];
  } & (Pick<NotebookSectionProps, 'space' | 'graph' | 'promptResults' | 'onCellInsert' | 'onCellDelete'> &
    Pick<TypescriptEditorProps, 'env'>)
>;

// TODO(burdon): Option for narrow rail (with compact buttons that align with first button in toolbar).
export const NotebookStack = ({ classNames, notebook, onRearrange, ...props }: NotebookStackProps) => (
  <Stack classNames={classNames} orientation='vertical' size='contain' rail onRearrange={onRearrange}>
    {notebook?.cells.map((cell, i) => (
      <NotebookSection key={i} cell={cell} {...props} />
    ))}
  </Stack>
);

type NotebookSectionProps = NotebookCellProps;

const NotebookSection = ({
  cell,
  space,
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
      <StackItem.Heading classNames='bs-full p-1 justify-between attention-surface'>
        <StackItem.DragHandle asChild>
          <IconButton variant='ghost' icon='ph--dots-six-vertical--regular' iconOnly label='Drag handle' />
        </StackItem.DragHandle>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger asChild>
            <IconButton
              variant='ghost'
              icon='ph--dots-three--regular'
              iconOnly
              label={t('notebook cell insert label')}
            />
          </DropdownMenu.Trigger>
          <NotebookMenu cell={cell} onCellInsert={onCellInsert} onCellDelete={onCellDelete} />
        </DropdownMenu.Root>
        {resizable && <StackItem.ResizeHandle />}
      </StackItem.Heading>

      {/* TODO(burdon): Move drag preview to outer stack (uniformly). */}
      <StackItem.DragPreview>
        {({ item: cell }) => (
          <StackItem.Content classNames='overflow-visible bg-groupSurface border border-subduedSeparator'>
            <NotebookCell space={space} cell={cell} env={env} dragging />
          </StackItem.Content>
        )}
      </StackItem.DragPreview>

      <StackItem.Content classNames='overflow-visible'>
        <NotebookCell space={space} cell={cell} env={env} promptResults={promptResults} {...props} />
      </StackItem.Content>
    </StackItem.Root>
  );
};

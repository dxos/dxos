//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { DropdownMenu, IconButton, useTranslation } from '@dxos/react-ui';
import { Stack, StackItem, type StackProps } from '@dxos/react-ui-stack';

import { meta } from '../../meta';
import { type Notebook } from '../../types';
import { type TypescriptEditorProps } from '../TypescriptEditor';

import { NotebookCell, type NotebookCellProps } from './NotebookCell';
import { NotebookMenu } from './NotebookMenu';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
  onRearrange?: StackProps['onRearrange'];
} & Pick<NotebookSectionProps, 'space' | 'graph' | 'onCellInsert' | 'onCellDelete'> &
  Pick<TypescriptEditorProps, 'env'>;

// TODO(burdon): Option for narrow rail (with compact buttons that align with first button in toolbar).
export const NotebookStack = ({ notebook, onRearrange, ...props }: NotebookStackProps) => {
  return (
    <Stack orientation='vertical' size='contain' rail onRearrange={onRearrange}>
      {notebook?.cells.map((cell, i) => (
        <NotebookSection key={i} cell={cell} {...props} />
      ))}
    </Stack>
  );
};

type NotebookSectionProps = NotebookCellProps;

const NotebookSection = ({ cell, space, env, onCellInsert, onCellDelete, ...props }: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);

  return (
    <StackItem.Root role='section' item={cell} draggable>
      <StackItem.Heading classNames='bs-full p-1 justify-between attention-surface'>
        <StackItem.DragHandle>
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
      </StackItem.Heading>

      {/* TODO(burdon): Fix drag preview. */}
      <StackItem.DragPreview>
        {({ item: cell }) => (
          <StackItem.Content classNames='overflow-visible bg-groupSurface border border-subduedSeparator'>
            <NotebookCell cell={cell} space={space} env={env} />
          </StackItem.Content>
        )}
      </StackItem.DragPreview>

      {/* TODO(burdon): Enable resize. */}
      <StackItem.Content classNames='overflow-visible'>
        <NotebookCell cell={cell} space={space} env={env} {...props} />
      </StackItem.Content>
    </StackItem.Root>
  );
};

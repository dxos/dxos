//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, Icon } from '@dxos/react-ui';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';
import { type TypescriptEditorProps } from '../TypescriptEditor/TypescriptEditor';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
} & Pick<TypescriptEditorProps, 'env'>;

// TODO(burdon): Allow moving cursor between sections (CMD Up/Down).
// TODO(burdon): Different section types (value, query, expression, prompt).
// TODO(burdon): Show result (incl. error, streaming response).
// TODO(burdon): Define actions for plugin.

export const NotebookStack = ({ notebook, env }: NotebookStackProps) => {
  return (
    <Stack orientation='vertical' size='contain' rail>
      {notebook?.cells.map((cell, i) => (
        <NotebookSection key={i} cell={cell} env={env} />
      ))}
    </Stack>
  );
};

type NotebookSectionProps = {
  cell: Notebook.Cell;
} & Pick<TypescriptEditorProps, 'env'>;

const NotebookSection = ({ cell, env }: NotebookSectionProps) => {
  const script = useMemo(() => cell.script.target!, [cell]);
  const extensions = useMemo(() => {
    return [createDataExtensions({ id: script.id, text: createDocAccessor(script.source.target!, ['content']) })];
  }, [script]);

  return (
    <StackItem.Root role='section' item={script}>
      <StackItem.Heading classNames='attention-surface'>
        <StackItem.HeadingStickyContent>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <StackItem.SigilButton>
                <Icon icon='ph--text-aa--regular' size={5} />
              </StackItem.SigilButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item>Option 1</DropdownMenu.Item>
                  <DropdownMenu.Item>Option 2</DropdownMenu.Item>
                  <DropdownMenu.Item>Option 3</DropdownMenu.Item>
                </DropdownMenu.Viewport>
                <DropdownMenu.Arrow />
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </StackItem.HeadingStickyContent>
      </StackItem.Heading>
      <StackItem.Content>
        <TypescriptEditor
          id={script.id}
          role='section'
          initialValue={script.source.target?.content}
          extensions={extensions}
          env={env}
        />
        <div className='p-2 border-t border-subduedSeparator text-description text-sm font-mono'>0</div>
      </StackItem.Content>
    </StackItem.Root>
  );
};

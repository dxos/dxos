//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, Icon } from '@dxos/react-ui';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { type ComputeGraph } from '../../notebook';
import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';
import { type TypescriptEditorProps } from '../TypescriptEditor/TypescriptEditor';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
  graph?: ComputeGraph;
} & Pick<TypescriptEditorProps, 'env'>;

// TODO(burdon): Allow moving cursor between sections (CMD Up/Down).
// TODO(burdon): Different section types (value, query, expression, prompt).
// TODO(burdon): Show result (incl. error, streaming response).
// TODO(burdon): Define actions for plugin.

export const NotebookStack = ({ notebook, graph, env }: NotebookStackProps) => {
  return (
    <Stack orientation='vertical' size='contain' rail>
      {notebook?.cells.map((cell, i) => (
        <NotebookSection key={i} cell={cell} graph={graph} env={env} />
      ))}
    </Stack>
  );
};

type NotebookSectionProps = {
  cell: Notebook.Cell;
  graph?: ComputeGraph;
} & Pick<TypescriptEditorProps, 'env'>;

const NotebookSection = ({ cell, graph, env }: NotebookSectionProps) => {
  const script = useMemo(() => cell.script.target!, [cell]);
  const extensions = useMemo(() => {
    return [createDataExtensions({ id: script.id, text: createDocAccessor(script.source.target!, ['content']) })];
  }, [script]);

  const name = graph?.expressions.value.find((expr) => expr.id === cell.id)?.name;
  const value = name ? graph?.values.value[name] : undefined;

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
        {value != null && (
          <div className='p-2 border-t border-subduedSeparator text-description text-sm font-mono'>
            <span>{name} = </span>
            <span>{value}</span>
          </div>
        )}
      </StackItem.Content>
    </StackItem.Root>
  );
};

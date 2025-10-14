//
// Copyright 2025 DXOS.org
//

import React, { useMemo } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, Icon, useTranslation } from '@dxos/react-ui';
import { createDataExtensions } from '@dxos/react-ui-editor';
import { Stack, StackItem } from '@dxos/react-ui-stack';

import { meta } from '../../meta';
import { type ComputeGraph } from '../../notebook';
import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';
import { type TypescriptEditorProps } from '../TypescriptEditor';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
} & Pick<NotebookSectionProps, 'graph' | 'onCellInsert' | 'onCellDelete'> &
  Pick<TypescriptEditorProps, 'env'>;

export const NotebookStack = ({ notebook, ...props }: NotebookStackProps) => {
  return (
    <Stack orientation='vertical' size='contain' rail>
      {notebook?.cells.map((cell, i) => (
        <NotebookSection key={i} cell={cell} {...props} />
      ))}
    </Stack>
  );
};

// TODO(burdon): Allow moving cursor between sections (CMD Up/Down).
// TODO(burdon): Different section types (value, query, expression, prompt).

type NotebookSectionProps = {
  cell: Notebook.Cell;
  graph?: ComputeGraph;
  onCellInsert?: (after: string | undefined) => void;
  onCellDelete?: (id: string) => void;
} & Pick<TypescriptEditorProps, 'env'>;

const NotebookSection = ({ cell, graph, env, onCellInsert, onCellDelete }: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);
  const script = useMemo(() => cell.script.target!, [cell]);
  const extensions = useMemo(() => {
    return [createDataExtensions({ id: script.id, text: createDocAccessor(script.source.target!, ['content']) })];
  }, [script]);

  const name = graph?.expressions.value[cell.id]?.name;
  const value = graph?.values.value[cell.id];

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
                  <DropdownMenu.Item onClick={() => onCellInsert?.(cell.id)}>
                    {t('notebook cell insert label')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onCellDelete?.(cell.id)}>
                    {t('notebook cell delete label')}
                  </DropdownMenu.Item>
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
          options={{
            highlightActiveLine: false,
            lineNumbers: false,
          }}
          classNames='p-2'
        />
        {value != null && (
          <div className='flex p-2 border-t border-subduedSeparator text-description font-mono'>
            {name && (
              <>
                <span className='text-infoText'>{name}</span>
                <span className='text-description'>&nbsp;=&nbsp;</span>
              </>
            )}
            <span className='text-infoText'>{value}</span>
          </div>
        )}
      </StackItem.Content>
    </StackItem.Root>
  );
};

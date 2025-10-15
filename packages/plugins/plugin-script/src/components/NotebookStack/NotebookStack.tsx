//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, Icon, useThemeContext, useTranslation } from '@dxos/react-ui';
import { QueryEditor } from '@dxos/react-ui-components';
import {
  Editor,
  type EditorProps,
  createBasicExtensions,
  createDataExtensions,
  createThemeExtensions,
} from '@dxos/react-ui-editor';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { type ComputeGraph } from '../../notebook';
import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';
import { type TypescriptEditorProps } from '../TypescriptEditor';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
} & Pick<NotebookSectionProps, 'graph' | 'onCellInsert' | 'onCellDelete'> &
  Pick<TypescriptEditorProps, 'env'>;

// TODO(burdon): Option for narrow rail (with compact buttons that align with first button in toolbar).
export const NotebookStack = ({ notebook, ...props }: NotebookStackProps) => {
  return (
    <Stack orientation='vertical' size='contain' rail>
      {notebook?.cells.map((cell, i) => (
        <NotebookSection key={i} cell={cell} {...props} />
      ))}
    </Stack>
  );
};

// TODO(burdon): Support calling named deployed functions (as with sheet).
// TODO(burdon): Different section types (value, query, expression, prompt).
// TODO(burdon): Display errors.
// TODO(burdon): Allow moving cursor between sections (CMD Up/Down).

type NotebookSectionProps = {
  cell: Notebook.Cell;
  graph?: ComputeGraph;
  onCellInsert?: (type: Notebook.CellType, after: string | undefined) => void;
  onCellDelete?: (id: string) => void;
} & Pick<TypescriptEditorProps, 'env'>;

const NotebookSection = ({ cell, graph, env, onCellInsert, onCellDelete }: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);
  const extensions = useMemo(() => {
    return cell.script.target
      ? [createDataExtensions({ id: cell.id, text: createDocAccessor(cell.script.target, ['content']) })].filter(
          isNonNullable,
        )
      : [];
  }, [cell.script.target]);

  const handleQueryChange = useCallback(
    (value: string) => {
      cell.script.target!.content = value;
    },
    [cell],
  );

  const name = graph?.expressions.value[cell.id]?.name;
  const value = graph?.values.value[cell.id];

  return (
    <StackItem.Root role='section' item={cell}>
      <StackItem.Heading classNames='attention-surface'>
        <StackItem.HeadingStickyContent>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <StackItem.SigilButton>
                <Icon icon='ph--list--regular' size={5} />
              </StackItem.SigilButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content>
                <DropdownMenu.Viewport>
                  <DropdownMenu.Item onClick={() => onCellInsert?.('script', cell.id)}>
                    {t('notebook cell insert script label')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onCellInsert?.('prompt', cell.id)}>
                    {t('notebook cell insert prompt label')}
                  </DropdownMenu.Item>
                  <DropdownMenu.Item onClick={() => onCellInsert?.('query', cell.id)}>
                    {t('notebook cell insert query label')}
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
        {cell.type === 'script' && (
          <TypescriptEditor
            id={cell.id}
            role='section'
            initialValue={cell.script.target?.content}
            extensions={extensions}
            env={env}
            options={{
              placeholder: t('notebook cell placeholder'),
              highlightActiveLine: false,
              lineNumbers: false,
            }}
            classNames='p-2 pbs-3'
          />
        )}

        {cell.type === 'prompt' && (
          <PromptEditor
            id={cell.id}
            initialValue={cell.script.target?.content}
            extensions={extensions}
            classNames='p-2 pbs-3'
          />
        )}

        {/* TODO(burdon): Pass in Space to query types. */}
        {/* TODO(burdon): Save. */}
        {cell.type === 'query' && (
          <QueryEditor
            id={cell.id}
            value={cell.script.target?.content}
            onChange={handleQueryChange}
            classNames='p-2 pbs-3'
          />
        )}

        {value != null && (
          <div className='flex p-2 bg-groupSurface border-t border-subduedSeparator text-description font-mono'>
            {name && (
              <>
                <span className='text-successText'>{name}</span>
                <span className='text-description'>&nbsp;=&nbsp;</span>
              </>
            )}
            <span>{value}</span>
          </div>
        )}
      </StackItem.Content>
    </StackItem.Root>
  );
};

const PromptEditor = ({ extensions: extensionsParam, ...props }: EditorProps) => {
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();
  const extensions = useMemo(() => {
    return [
      createBasicExtensions({ placeholder: t('notebook prompt placeholder') }),
      createThemeExtensions({ themeMode }),
      extensionsParam,
    ].filter(isNonNullable);
  }, [extensionsParam]);

  return <Editor {...props} moveToEnd extensions={extensions} />;
};

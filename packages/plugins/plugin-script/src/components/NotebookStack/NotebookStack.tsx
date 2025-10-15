//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { type Space, createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, Icon, IconButton, useThemeContext, useTranslation } from '@dxos/react-ui';
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
} & Pick<NotebookSectionProps, 'space' | 'graph' | 'onCellInsert' | 'onCellDelete' | 'onCellRun'> &
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

// TODO(burdon): Display errors.
// TODO(burdon): Support calling named deployed functions (as with sheet).

const editorStyles = 'p-3';

type NotebookSectionProps = {
  cell: Notebook.Cell;
  space?: Space;
  graph?: ComputeGraph;
  onCellInsert?: (type: Notebook.CellType, after: string | undefined) => void;
  onCellDelete?: (id: string) => void;
  onCellRun?: (id: string) => void;
} & Pick<TypescriptEditorProps, 'env'>;

const NotebookSection = ({ cell, space, graph, env, onCellInsert, onCellDelete, onCellRun }: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);

  const name = graph?.expressions.value[cell.id]?.name;
  const value = graph?.values.value[cell.id];

  return (
    <StackItem.Root role='section' item={cell}>
      <StackItem.Heading classNames='attention-surface'>
        <StackItem.HeadingStickyContent>
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <StackItem.SigilButton>
                <Icon icon='ph--list--regular' size={4} />
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

      <StackItem.Content classNames='overflow-visible'>
        <NotebookCell cell={cell} space={space} env={env} onCellRun={onCellRun} />

        {value != null && (
          <div className='flex p-2 pis-3 bg-groupSurface border-t border-subduedSeparator text-description font-mono'>
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

const NotebookCell = ({ cell, space, env, onCellRun }: NotebookSectionProps) => {
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

  switch (cell.type) {
    case 'script':
      return (
        <TypescriptEditor
          id={cell.id}
          role='section'
          classNames={editorStyles}
          initialValue={cell.script.target?.content}
          extensions={extensions}
          env={env}
          options={{
            placeholder: t('notebook cell placeholder'),
            highlightActiveLine: false,
            lineNumbers: false,
          }}
        />
      );

    case 'query':
      return (
        <QueryEditor
          id={cell.id}
          classNames={editorStyles}
          space={space}
          value={cell.script.target?.content}
          onChange={handleQueryChange}
        />
      );

    case 'prompt':
      return (
        <div role='none' className='flex is-full'>
          <PromptEditor
            id={cell.id}
            classNames={editorStyles}
            initialValue={cell.script.target?.content}
            extensions={extensions}
          />
          <div className='p-2'>
            <IconButton
              variant='ghost'
              icon='ph--play--regular'
              iconOnly
              label={t('notebook cell prompt run label')}
              onClick={() => onCellRun?.(cell.id)}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
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

  return <Editor {...props} extensions={extensions} moveToEnd />;
};

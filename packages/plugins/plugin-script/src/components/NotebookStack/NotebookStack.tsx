//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Query, Ref } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { Graph } from '@dxos/plugin-explorer/types';
import { type Space, createDocAccessor } from '@dxos/react-client/echo';
import { DropdownMenu, IconButton, useAsyncEffect, useThemeContext, useTranslation } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import {
  Editor,
  type EditorProps,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/react-ui-editor';
import { Stack, StackItem, type StackProps } from '@dxos/react-ui-stack';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { type ComputeGraph } from '../../notebook';
import { type Notebook } from '../../types';
import { TypescriptEditor } from '../TypescriptEditor';
import { type TypescriptEditorProps } from '../TypescriptEditor';

import { NotebookMenu, type NotebookMenuProps } from './NotebookMenu';

export type NotebookStackProps = {
  notebook?: Notebook.Notebook;
  onRearrange?: StackProps['onRearrange'];
} & Pick<NotebookSectionProps, 'space' | 'graph' | 'onCellInsert' | 'onCellDelete' | 'onCellRun'> &
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

// TODO(burdon): Display errors.

const editorStyles = 'p-2 pis-3';

type NotebookSectionProps = {
  space?: Space;
  graph?: ComputeGraph;
  cell: Notebook.Cell;
  onCellRun?: (id: string) => void;
} & (Pick<NotebookMenuProps, 'onCellInsert' | 'onCellDelete'> & Pick<TypescriptEditorProps, 'env'>);

const NotebookSection = ({ cell, space, graph, env, onCellInsert, onCellDelete, onCellRun }: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);
  const name = graph?.expressions.value[cell.id]?.name;
  const value = graph?.values.value[cell.id];
  const view = cell.view?.target;

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
        <NotebookCell cell={cell} space={space} env={env} onCellRun={onCellRun} />
        {(value != null || view != null) && (
          <div className='flex is-full bg-groupSurface border-t border-subduedSeparator text-description font-mono'>
            {value != null && (
              <div className={mx(editorStyles)}>
                {name && (
                  <>
                    <span className='text-successText'>{name}</span>
                    <span className='text-description'>&nbsp;=&nbsp;</span>
                  </>
                )}
                <span>{value}</span>
              </div>
            )}
            {view && <Surface role='section' limit={1} data={{ subject: view }} />}
          </div>
        )}
      </StackItem.Content>
    </StackItem.Root>
  );
};

const NotebookCell = ({ space, cell, env, onCellRun }: NotebookSectionProps) => {
  const { t } = useTranslation(meta.id);
  const extensions = useMemo(() => {
    return cell.script.target
      ? [createDataExtensions({ id: cell.id, text: createDocAccessor(cell.script.target, ['content']) })].filter(
          isNonNullable,
        )
      : [];
  }, [cell.script.target]);

  const builder = useMemo(() => new QueryBuilder(), []);
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    if (cell.type === 'query') {
      const query = cell.script.target!.content;
      const filter = builder.build(query);
      if (filter) {
        const ast = Query.select(filter).ast;
        const view = cell.view?.target;
        if (!view) {
          const graph = Graph.make({ query: { ast } });
          const { view } = await Graph.makeView({ space, presentation: graph });
          cell.view = Ref.make(view);
        } else {
          view.query.ast = ast;
        }
      }
    }
  }, [space, builder, cell, cell.script.target?.content]);

  const handleQueryChange = useCallback<NonNullable<QueryEditorProps['onChange']>>((value: string) => {
    cell.script.target!.content = value;
  }, []);

  switch (cell.type) {
    case 'markdown':
      return (
        <MarkdownEditor
          id={cell.id}
          classNames={editorStyles}
          initialValue={cell.script.target?.content}
          extensions={extensions}
        />
      );

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
          db={space?.db}
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

// TODO(burdon): Support widgets that can consume variables.
const MarkdownEditor = ({ extensions: extensionsParam, ...props }: EditorProps) => {
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();
  const extensions = useMemo(() => {
    return [
      createBasicExtensions({ placeholder: t('notebook markdown placeholder') }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      extensionsParam,
    ].filter(isNonNullable);
  }, [extensionsParam]);

  return <Editor {...props} extensions={extensions} moveToEnd />;
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

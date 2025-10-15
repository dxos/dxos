//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework';
import { Query, Ref } from '@dxos/echo';
import { QueryBuilder } from '@dxos/echo-query';
import { invariant } from '@dxos/invariant';
import { useChatProcessor } from '@dxos/plugin-assistant';
import { Chat } from '@dxos/plugin-assistant';
import { Graph } from '@dxos/plugin-explorer/types';
import { createDocAccessor } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { IconButton, useAsyncEffect, useThemeContext, useTranslation } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import {
  Editor,
  type EditorProps,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { type ComputeGraph } from '../../notebook';
import { type Notebook } from '../../types';
import { TypescriptEditor, type TypescriptEditorProps } from '../TypescriptEditor';

import { type NotebookMenuProps } from './NotebookMenu';

const editorStyles = 'p-2 pis-3';

export type NotebookCellProps = {
  space?: Space;
  graph?: ComputeGraph;
  cell: Notebook.Cell;
} & (Pick<NotebookMenuProps, 'onCellInsert' | 'onCellDelete'> & Pick<TypescriptEditorProps, 'env'>);

// TODO(burdon): Display errors.
export const NotebookCell = ({ space, graph, cell, env }: NotebookCellProps) => {
  const { t } = useTranslation(meta.id);

  //
  // Common.
  //
  const extensions = useMemo(() => {
    return cell.script?.target
      ? [createDataExtensions({ id: cell.id, text: createDocAccessor(cell.script.target, ['content']) })].filter(
          isNonNullable,
        )
      : [];
  }, [cell.script?.target]);

  //
  // Query.
  //
  const view = cell.view?.target;
  const builder = useMemo(() => new QueryBuilder(), []);
  useAsyncEffect(async () => {
    if (!space) {
      return;
    }

    if (cell.type === 'query') {
      invariant(cell.script?.target);
      const query = cell.script.target.content;
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
  }, [space, builder, cell, cell.script?.target?.content]);

  const handleQueryChange = useCallback<NonNullable<QueryEditorProps['onChange']>>(
    (value: string) => {
      invariant(cell.script?.target);
      cell.script.target.content = value;
    },
    [cell],
  );

  //
  // Prompt.
  // TODO(burdon): Requires services.
  //
  const processor = useChatProcessor({ chat: cell.chat?.target });
  if (cell.chat?.target) {
    console.log('processor', cell.chat.target, processor);
  }

  const handleCellRun = useCallback(() => {
    invariant(processor);
    void processor.request({
      message: 'Hello',
    });
  }, [cell, processor]);

  switch (cell.type) {
    case 'markdown':
      invariant(cell.script?.target);
      return (
        <MarkdownEditor
          id={cell.id}
          classNames={editorStyles}
          initialValue={cell.script.target.content}
          extensions={extensions}
        />
      );

    case 'script':
      invariant(cell.script?.target);
      return (
        <>
          <TypescriptEditor
            id={cell.id}
            role='section'
            classNames={editorStyles}
            initialValue={cell.script.target.content}
            extensions={extensions}
            env={env}
            options={{
              placeholder: t('notebook cell placeholder'),
              highlightActiveLine: false,
              lineNumbers: false,
            }}
          />
          <NotebookCellValue cell={cell} graph={graph} />
        </>
      );

    case 'query':
      invariant(cell.script?.target);
      return (
        <>
          <QueryEditor
            id={cell.id}
            classNames={editorStyles}
            db={space?.db}
            value={cell.script.target.content}
            onChange={handleQueryChange}
          />
          {view && (
            <div role='none' className='border-t border-subduedSeparator'>
              <Surface role='section' limit={1} data={{ subject: view }} />
            </div>
          )}
        </>
      );

    case 'prompt':
      if (!cell.chat?.target || !processor) {
        return null;
      }

      return (
        <div role='none' className='flex is-full'>
          <Chat.Root chat={cell.chat.target} processor={processor}>
            <Chat.Prompt />
          </Chat.Root>
          <div className='p-2'>
            <IconButton
              variant='ghost'
              icon='ph--play--regular'
              iconOnly
              label={t('notebook cell prompt run label')}
              onClick={handleCellRun}
            />
          </div>
        </div>
      );

    default:
      return null;
  }
};

const NotebookCellValue = ({ cell, graph }: NotebookCellProps) => {
  const name = graph?.expressions.value[cell.id]?.name;
  const value = graph?.values.value[cell.id];
  if (value == null) {
    return null;
  }

  return (
    <div
      className={mx(
        'flex is-full bg-groupSurface border-t border-subduedSeparator text-description font-mono',
        editorStyles,
      )}
    >
      {name && (
        <>
          <span className='text-successText'>{name}</span>
          <span className='text-description'>&nbsp;=&nbsp;</span>
        </>
      )}
      <span>{value}</span>
    </div>
  );
};

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

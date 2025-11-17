//
// Copyright 2025 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import { Surface } from '@dxos/app-framework/react';
import { invariant } from '@dxos/invariant';
import { TemplateEditor } from '@dxos/plugin-assistant';
import { createDocAccessor } from '@dxos/react-client/echo';
import { type Space } from '@dxos/react-client/echo';
import { useThemeContext, useTranslation } from '@dxos/react-ui';
import { QueryEditor, type QueryEditorProps } from '@dxos/react-ui-components';
import {
  type BasicExtensionsOptions,
  EditorContent,
  type EditorContentProps,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { meta } from '../../meta';
import { type ComputeGraph } from '../../notebook';
import { type Notebook } from '../../types';
import { TypescriptEditor, type TypescriptEditorProps } from '../TypescriptEditor';

import { type NotebookMenuProps } from './NotebookMenu';

const editorStyles = 'p-2 pis-3';
const valueStyles = 'p-1 pis-3';

export type NotebookCellProps = {
  space?: Space;
  graph?: ComputeGraph;
  dragging?: boolean;
  cell: Notebook.Cell;
  promptResults?: Record<string, string>;
} & (Pick<NotebookMenuProps, 'onCellInsert' | 'onCellDelete'> & Pick<TypescriptEditorProps, 'env'>);

// TODO(burdon): Show evaluation errors.
export const NotebookCell = ({ space, graph, dragging, cell, promptResults, env }: NotebookCellProps) => {
  const { t } = useTranslation(meta.id);

  const extensions = useMemo(() => {
    return cell.source?.target
      ? [
          createDataExtensions({
            id: cell.id,
            text: createDocAccessor(cell.source.target, ['content']),
          }),
        ].filter(isNonNullable)
      : [];
  }, [cell.source?.target]);

  const explorerGraph = cell.graph?.target;

  const handleQueryChange = useCallback<NonNullable<QueryEditorProps['onChange']>>(
    (value: string) => {
      invariant(cell.source?.target);
      cell.source.target.content = value;
    },
    [cell],
  );

  switch (cell.type) {
    case 'markdown':
      if (!cell.source?.target) {
        return null;
      }

      return (
        <NotebookTextEditor
          id={cell.id}
          classNames={editorStyles}
          initialValue={cell.source.target.content}
          extensions={extensions}
        />
      );

    case 'script':
      if (!cell.source?.target) {
        return null;
      }

      return (
        <>
          <TypescriptEditor
            id={cell.id}
            role='section'
            classNames={editorStyles}
            initialValue={cell.source.target.content}
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
      if (!cell.source?.target) {
        return null;
      }

      // TODO(burdon): Remove app-framework deps (via render prop).
      return (
        <div
          className={mx('bs-full overflow-hidden grid', explorerGraph && !dragging && 'grid-rows-[min-content_1fr]')}
        >
          <QueryEditor
            id={cell.id}
            classNames={[editorStyles, 'border-be border-subduedSeparator']}
            db={space?.db}
            value={cell.source.target.content}
            onChange={handleQueryChange}
          />
          {explorerGraph && !dragging && <Surface role='section' limit={1} data={{ subject: explorerGraph }} />}
        </div>
      );

    // TODO(burdon): Use streaming response from Chat.
    case 'prompt':
      if (!cell.prompt?.target) {
        return null;
      }

      return (
        <>
          <TemplateEditor
            id={cell.id}
            template={cell.prompt.target.instructions}
            lineNumbers={false}
            classNames={editorStyles}
          />
          <NotebookPromptResult cell={cell} promptResults={promptResults} />
        </>
      );

    default:
      return null;
  }
};

const NotebookCellValue = ({ cell, graph }: NotebookCellProps) => {
  const name = graph?.expressions.value[cell.id]?.name;
  const value = graph?.getValue(cell.id);
  if (value == null) {
    return null;
  }

  return (
    <div
      className={mx(
        'flex is-full bg-groupSurface border-t border-subduedSeparator text-description font-mono',
        valueStyles,
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

const NotebookPromptResult = ({ cell, promptResults }: NotebookCellProps) => {
  if (!cell.prompt) {
    return null;
  }

  const value = promptResults?.[cell.prompt.dxn.toString()];
  if (value == null) {
    return null;
  }

  return (
    <div className={mx('flex is-full bg-groupSurface text-description border-t border-subduedSeparator', valueStyles)}>
      <NotebookTextEditor readOnly value={value} />
    </div>
  );
};

const NotebookTextEditor = ({
  extensions: extensionsParam,
  readOnly,
  ...props
}: EditorContentProps & Pick<BasicExtensionsOptions, 'readOnly'>) => {
  const { t } = useTranslation(meta.id);
  const { themeMode } = useThemeContext();
  const extensions = useMemo(() => {
    return [
      createBasicExtensions({
        placeholder: t('notebook markdown placeholder'),
        readOnly,
      }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      extensionsParam,
    ].filter(isNonNullable);
  }, [extensionsParam]);

  return <EditorContent {...props} extensions={extensions} selectionEnd />;
};

//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { type ReactNode, forwardRef, useEffect, useImperativeHandle, useMemo, useState } from 'react';

import { createDocAccessor, createObject } from '@dxos/client/echo';
import { Expando } from '@dxos/echo/internal';
import { live } from '@dxos/echo/internal';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { useForwardedRef, useThemeContext } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { editorGutter, editorSlots } from '../../defaults';
import {
  type DebugNode,
  type ThemeExtensionsOptions,
  createBasicExtensions,
  createDataExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  debugTree,
  decorateMarkdown,
} from '../../extensions';
import { type UseTextEditorProps, useTextEditor } from '../../hooks';

// Type definitions.
export type DebugMode = 'raw' | 'tree' | 'raw+tree';

const defaultId = 'editor-' + PublicKey.random().toHex().slice(0, 8);

export type StoryProps = Pick<UseTextEditorProps, 'id' | 'scrollTo' | 'selection' | 'extensions'> &
  Pick<ThemeExtensionsOptions, 'slots'> & {
    debug?: DebugMode;
    debugCustom?: (view: EditorView) => ReactNode;
    text?: string;
    object?: Expando;
    readOnly?: boolean;
    placeholder?: string;
    lineNumbers?: boolean;
    onReady?: (view: EditorView) => void;
  };

export const EditorStory = forwardRef<EditorView | null, StoryProps>(
  ({ debug, debugCustom, text, extensions: _extensions, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes('test-panel');
    const [tree, setTree] = useState<DebugNode>();
    const [object] = useState(createObject(live(Expando, { content: text ?? '' })));
    const viewRef = useForwardedRef(forwardedRef);
    const extensions = useMemo(
      () => (debug ? [_extensions, debugTree(setTree)].filter(isNonNullable) : _extensions),
      [debug, _extensions],
    );

    const view = viewRef.current;
    return (
      <div className={mx('is-full bs-full grid overflow-hidden', debug && 'grid-cols-2 lg:grid-cols-[1fr_600px]')}>
        <EditorComponent ref={viewRef} object={object} text={text} extensions={extensions} {...props} />

        {debug && (
          <div
            className='grid bs-full auto-rows-fr border-l border-separator divide-y divide-separator overflow-hidden'
            {...attentionAttrs}
          >
            {view && debugCustom?.(view)}
            {(debug === 'raw' || debug === 'raw+tree') && (
              <pre className='p-1 text-xs text-green-800 dark:text-green-200 overflow-auto'>
                {view?.state.doc.toString()}
              </pre>
            )}
            {(debug === 'tree' || debug === 'raw+tree') && <JsonFilter data={tree} classNames='p-1 text-xs' />}
          </div>
        )}
      </div>
    );
  },
);

/**
 * Default story component.
 */
// TODO(burdon): Replace with <Editor.Root>
export const EditorComponent = forwardRef<EditorView | null, StoryProps>(
  (
    {
      id = defaultId,
      text,
      object,
      readOnly,
      placeholder = 'New document.',
      lineNumbers,
      scrollTo,
      selection,
      extensions,
      slots = editorSlots,
      onReady,
    },
    forwardedRef,
  ) => {
    invariant(object);
    const { themeMode } = useThemeContext();
    const attentionAttrs = useAttentionAttributes(id);
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        scrollTo,
        selection,
        initialValue: text,
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(object, ['content']) }),
          createBasicExtensions({ readOnly, placeholder, lineNumbers, scrollPastEnd: true, search: true }),
          createMarkdownExtensions(),
          createThemeExtensions({ themeMode, syntaxHighlighting: true, slots }),
          decorateMarkdown(),
          editorGutter,
          extensions || [],
        ],
      }),
      [id, object, extensions, themeMode],
    );

    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    useEffect(() => {
      if (view) {
        onReady?.(view);
      }
    }, [view]);

    return <div ref={parentRef} className='flex overflow-hidden' {...attentionAttrs} {...focusAttributes} />;
  },
);

//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { type ReactNode, forwardRef, useEffect, useState, useImperativeHandle, useMemo } from 'react';

import { Expando } from '@dxos/echo-schema';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { useForwardedRef, useThemeContext } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { editorSlots, editorGutter } from '../../defaults';
import {
  type DebugNode,
  type ThemeExtensionsOptions,
  createDataExtensions,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  debugTree,
} from '../../extensions';
import { useTextEditor, type UseTextEditorProps } from '../../hooks';

// Type definitions.
export type DebugMode = 'raw' | 'tree' | 'raw+tree';

const defaultId = 'editor-' + PublicKey.random().toHex().slice(0, 8);

export type StoryProps = Pick<UseTextEditorProps, 'scrollTo' | 'selection' | 'extensions'> &
  Pick<ThemeExtensionsOptions, 'slots'> & {
    id?: string;
    debug?: DebugMode;
    debugCustom?: (view: EditorView) => ReactNode;
    text?: string;
    object?: Expando;
    readOnly?: boolean;
    placeholder?: string;
    lineNumbers?: boolean;
    onReady?: (view: EditorView) => void;
  };

export const EditorStory = forwardRef<EditorView | undefined, StoryProps>(
  ({ debug, debugCustom, text, extensions: _extensions, ...props }, forwardedRef) => {
    const attentionAttrs = useAttentionAttributes('testing');
    const [tree, setTree] = useState<DebugNode>();
    const [object] = useState(createObject(live(Expando, { content: text ?? '' })));
    const viewRef = useForwardedRef(forwardedRef);
    const view = viewRef.current;
    const extensions = useMemo(
      () => (debug ? [_extensions, debugTree(setTree)].filter(isNonNullable) : _extensions),
      [debug, _extensions],
    );

    return (
      <div className={mx('w-full h-full grid overflow-hidden', debug && 'grid-cols-2 lg:grid-cols-[1fr_600px]')}>
        <EditorComponent ref={viewRef} object={object} text={text} extensions={extensions} {...props} />

        {debug && (
          <div
            className='grid h-full auto-rows-fr border-l border-separator divide-y divide-separator overflow-hidden'
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
export const EditorComponent = forwardRef<EditorView | undefined, StoryProps>(
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
          createBasicExtensions({ readOnly, placeholder, lineNumbers, scrollPastEnd: true }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({ themeMode, syntaxHighlighting: true, slots }),
          editorGutter,
          extensions || [],
        ],
      }),
      [id, object, extensions, themeMode],
    );

    useImperativeHandle(forwardedRef, () => view, [view]);

    useEffect(() => {
      if (view) {
        onReady?.(view);
      }
    }, [view]);

    return <div ref={parentRef} className='flex overflow-hidden' {...attentionAttrs} {...focusAttributes} />;
  },
);

//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import React, { type ReactNode, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

import { Expando } from '@dxos/echo-schema';
import { PublicKey } from '@dxos/keys';
import { live } from '@dxos/live-object';
import { createDocAccessor, createObject } from '@dxos/react-client/echo';
import { useThemeContext } from '@dxos/react-ui';
import { useAttention } from '@dxos/react-ui-attention';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';

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

// Type definitions
export type DebugMode = 'raw' | 'tree' | 'raw+tree';

const defaultId = 'editor-' + PublicKey.random().toHex().slice(0, 8);

export type StoryProps = {
  id?: string;
  debug?: DebugMode;
  debugCustom?: (view: EditorView) => ReactNode;
  text?: string;
  readOnly?: boolean;
  placeholder?: string;
  lineNumbers?: boolean;
  onReady?: (view: EditorView) => void;
} & Pick<UseTextEditorProps, 'scrollTo' | 'selection' | 'extensions'> &
  Pick<ThemeExtensionsOptions, 'slots'>;

/**
 * Default story component
 */
export const EditorStory = forwardRef<EditorView | undefined, StoryProps>(
  (
    {
      id = defaultId,
      debug,
      debugCustom,
      text,
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
    const { hasAttention } = useAttention(id);
    console.log(hasAttention);

    const [object] = useState(createObject(live(Expando, { content: text ?? '' })));
    const { themeMode } = useThemeContext();
    const [tree, setTree] = useState<DebugNode>();
    const { parentRef, focusAttributes, view } = useTextEditor(
      () => ({
        id,
        initialValue: text,
        extensions: [
          createDataExtensions({ id, text: createDocAccessor(object, ['content']) }),
          createBasicExtensions({ readOnly, placeholder, lineNumbers, scrollPastEnd: true }),
          createMarkdownExtensions({ themeMode }),
          createThemeExtensions({
            themeMode,
            syntaxHighlighting: true,
            slots,
          }),
          editorGutter,
          extensions || [],
          debug ? debugTree(setTree) : [],
        ],
        scrollTo,
        selection,
      }),
      [object, extensions, themeMode],
    );

    useImperativeHandle(forwardedRef, () => view, [view]);

    useEffect(() => {
      if (view) {
        onReady?.(view);
      }
    }, [view]);

    return (
      <div className={mx('w-full h-full grid overflow-hidden', debug && 'grid-cols-2 lg:grid-cols-[1fr_600px]')}>
        <div role='none' className='flex overflow-hidden' ref={parentRef} {...focusAttributes} />
        {debug && (
          <div className='grid h-full auto-rows-fr border-l border-separator divide-y divide-separator overflow-hidden'>
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

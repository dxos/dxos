//
// Copyright 2023 DXOS.org
//

import { type EditorView } from '@codemirror/view';
import type * as Schema from 'effect/Schema';
import React, { type ReactNode, forwardRef, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react';

import { Obj, Type } from '@dxos/echo';
import { createDocAccessor } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { useMergeRefs, useThemeContext } from '@dxos/react-ui';
import { useAttentionAttributes } from '@dxos/react-ui-attention';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { mx } from '@dxos/react-ui-theme';
import { isNonNullable } from '@dxos/util';

import { type EditorController, createEditorController } from '../../components';
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
    // TODO(wittjosiah): Find a simpler way to define this type.
    object?: Obj.Obj<Schema.Schema.Type<typeof Type.Expando>>;
    readOnly?: boolean;
    placeholder?: string;
    lineNumbers?: boolean;
    onReady?: (view: EditorView) => void;
  };

export const EditorStory = forwardRef<EditorController, StoryProps>(
  ({ debug, debugCustom, text, extensions: extensionsParam, ...props }, forwardedRef) => {
    const controllerRef = useRef<EditorController>(null);
    const mergedRef = useMergeRefs([controllerRef, forwardedRef]);

    const attentionAttrs = useAttentionAttributes('test-panel');
    const [tree, setTree] = useState<DebugNode>();
    const [object] = useState(Obj.make(Type.Expando, { content: text ?? '' }));

    const extensions = useMemo(
      () => (debug ? [extensionsParam, debugTree(setTree)].filter(isNonNullable) : extensionsParam),
      [debug, extensionsParam],
    );

    const view = controllerRef.current?.view;
    return (
      <div className={mx('is-full bs-full grid overflow-hidden', debug && 'grid-cols-2 lg:grid-cols-[1fr_600px]')}>
        <EditorComponent ref={mergedRef} object={object} text={text} extensions={extensions} {...props} />

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
 * @deprecated
 */
// TODO(burdon): Replace with <Editor.Root>
export const EditorComponent = forwardRef<EditorController, StoryProps>(
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

    // External controller.
    useImperativeHandle(forwardedRef, () => {
      log.info('view updated', { id });
      return createEditorController(view);
    }, [id, view]);

    useEffect(() => {
      if (view) {
        onReady?.(view);
      }
    }, [view]);

    return <div ref={parentRef} className='flex overflow-hidden' {...attentionAttrs} {...focusAttributes} />;
  },
);

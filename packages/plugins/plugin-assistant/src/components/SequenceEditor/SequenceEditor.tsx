//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useImperativeHandle } from 'react';

import { SequenceDefinition } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { type ThemedClassName, useThemeContext } from '@dxos/react-ui';
import {
  type EditorView,
  createBasicExtensions,
  createJsonExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type SequenceEditorProps = ThemedClassName<{
  sequence: SequenceDefinition;
}>;

// TODO(burdon): Factor out JsonEditor.
export const SequenceEditor = forwardRef<EditorView | null, SequenceEditorProps>(
  ({ classNames, sequence }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor({
      initialValue: JSON.stringify(sequence, null, 2),
      extensions: [
        createBasicExtensions({
          lineNumbers: true,
          lineWrapping: false,
          monospace: true,
          scrollPastEnd: true,
        }),
        createThemeExtensions({
          themeMode,
          syntaxHighlighting: true,
        }),
        createJsonExtensions({
          schema: Type.toJsonSchema(SequenceDefinition, { strict: true }),
        }),
      ],
    });

    useImperativeHandle<EditorView | null, EditorView | null>(forwardedRef, () => view, [view]);

    return <div ref={parentRef} className={mx('overflow-hidden', classNames)} />;
  },
);

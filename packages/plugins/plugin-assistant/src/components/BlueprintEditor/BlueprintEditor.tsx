//
// Copyright 2025 DXOS.org
//

import React, { forwardRef, useImperativeHandle } from 'react';

import { BlueprintDefinition } from '@dxos/conductor';
import { Type } from '@dxos/echo';
import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  type EditorView,
  createBasicExtensions,
  createJsonExtensions,
  createThemeExtensions,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type BlueprintEditorProps = ThemedClassName<{
  blueprint: BlueprintDefinition;
}>;

// TODO(burdon): Factor out JsonEditor.
export const BlueprintEditor = forwardRef<EditorView | undefined, BlueprintEditorProps>(
  ({ classNames, blueprint }, forwardedRef) => {
    const { themeMode } = useThemeContext();
    const { parentRef, view } = useTextEditor({
      initialValue: JSON.stringify(blueprint, null, 2),
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
          schema: Type.toJsonSchema(BlueprintDefinition, { strict: true }),
        }),
      ],
    });

    useImperativeHandle(forwardedRef, () => view, [view]);

    return <div ref={parentRef} className={mx('overflow-hidden', classNames)} />;
  },
);

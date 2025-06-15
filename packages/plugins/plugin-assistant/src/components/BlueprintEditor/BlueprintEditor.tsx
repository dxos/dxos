//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Blueprint, type BlueprintParser } from '@dxos/assistant';
import { toJsonSchema } from '@dxos/echo-schema';
import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
  createBasicExtensions,
  createJsonExtensions,
  createThemeExtensions,
  editorMonospace,
  useTextEditor,
} from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type BlueprintEditorProps = ThemedClassName<{
  blueprint: BlueprintParser.DSL;
}>;

// TODO(burdon): Factor out JsonEditor.
// TODO(burdon): Make editable.
export const BlueprintEditor = ({ classNames, blueprint }: BlueprintEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor({
    initialValue: JSON.stringify(blueprint, null, 2),
    extensions: [
      createBasicExtensions({ lineWrapping: false }),
      createThemeExtensions({
        themeMode,
        syntaxHighlighting: true,
      }),
      // TODO(burdon): ERROR: reference "/schemas/any" resolves to more than one schema
      createJsonExtensions({ schema: false ? toJsonSchema(Blueprint) : undefined }),
      editorMonospace,
    ],
  });

  return <div ref={parentRef} className={mx('w-full pli-2 overflow-x-scroll bg-inputSurface', classNames)} />;
};

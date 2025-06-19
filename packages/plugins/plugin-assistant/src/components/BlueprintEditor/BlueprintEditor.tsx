//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { BlueprintDefinition } from '@dxos/assistant';
import { JsonSchema } from '@dxos/echo';
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
  blueprint: BlueprintDefinition;
}>;

// TODO(burdon): Factor out JsonEditor.
// TODO(burdon): Make editable.
export const BlueprintEditor = ({ classNames, blueprint }: BlueprintEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor({
    initialValue: JSON.stringify(blueprint, null, 2),
    extensions: [
      createBasicExtensions({ lineWrapping: false }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true }),
      createJsonExtensions({ schema: JsonSchema.toJsonSchema(BlueprintDefinition, { strict: true }) }),
      editorMonospace,
    ],
  });

  return (
    <div ref={parentRef} className={mx('flex w-full pli-2 overflow-x-scroll border-x border-separator', classNames)} />
  );
};

//
// Copyright 2025 DXOS.org
//

import { Schema } from 'effect';
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
import { removeProperties } from '@dxos/util';

export type BlueprintEditorProps = ThemedClassName<{
  blueprint: BlueprintParser.DSL;
}>;

export const Test = Schema.Struct({
  steps: Schema.optional(Schema.Array(Schema.Any).pipe(Schema.mutable)),
  foo: Schema.optional(Schema.Array(Schema.Any).pipe(Schema.mutable)),
});

// TODO(burdon): Factor out JsonEditor.
// TODO(burdon): Make editable.
export const BlueprintEditor = ({ classNames, blueprint }: BlueprintEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor({
    initialValue: JSON.stringify(blueprint, null, 2),
    extensions: [
      createBasicExtensions({ lineWrapping: false }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true }),
      createJsonExtensions({
        schema: removeProperties(toJsonSchema(Blueprint), (key, value) => {
          if (key === '$ref' && value === '#/$defs/jsonSchema') {
            return true;
          }
          if (key === '$ref' && value === '#/$defs/dependency') {
            return true;
          }
          if (key === '$id' && value === '/schemas/any') {
            return true;
          }

          return false;
        }),
      }),
      editorMonospace,
    ],
  });

  return (
    <div ref={parentRef} className={mx('flex w-full pli-2 overflow-x-scroll border-x border-separator', classNames)} />
  );
};

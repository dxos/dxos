//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { BlueprintDefinition } from '@dxos/assistant';
import { Type } from '@dxos/echo';
import { useThemeContext, type ThemedClassName } from '@dxos/react-ui';
import {
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
export const BlueprintEditor = ({ classNames, blueprint }: BlueprintEditorProps) => {
  const { themeMode } = useThemeContext();
  const { parentRef } = useTextEditor({
    initialValue: JSON.stringify(blueprint, null, 2),
    extensions: [
      createBasicExtensions({
        lineNumbers: true,
        lineWrapping: false,
        monospace: true,
        scrollPastEnd: true,
      }),
      createThemeExtensions({ themeMode, syntaxHighlighting: true }),
      createJsonExtensions({ schema: Type.toJsonSchema(BlueprintDefinition, { strict: true }) }),
    ],
  });

  return <div ref={parentRef} className={mx('flex w-full pli-2 overflow-x-scroll', classNames)} />;
};

//
// Copyright 2023 DXOS.org
//

import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { minimalSetup } from 'codemirror';
import React, { useMemo } from 'react';

import { type TextObject } from '@dxos/client/echo';
import { getTextContent } from '@dxos/echo-schema';
import { type ThemeMode } from '@dxos/react-ui';
import { useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type ScriptEditorProps = {
  source?: TextObject;
  themeMode?: ThemeMode;
  className?: string;
};

// TODO(burdon): https://davidmyers.dev/blog/how-to-build-a-code-editor-with-codemirror-6-and-typescript/introduction

export const ScriptEditor = ({ source, themeMode, className }: ScriptEditorProps) => {
  const extensions = useMemo(
    () => [
      //
      // basicSetup,
      minimalSetup, // TODO(burdon): Use this in text editor (cancels highlight current line)???
      lineNumbers(),
      javascript({ typescript: true }),
      autocompletion({ activateOnTyping: false }),
      keymap.of([
        //
        ...completionKeymap,
      ]),
      EditorView.darkTheme.of(themeMode === 'dark'),
      EditorView.editorAttributes.of({ class: 'grow' }),
    ],
    [themeMode],
  );

  const { parentRef } = useTextEditor({
    extensions,
    doc: getTextContent(source),
  });

  return <div ref={parentRef} className={mx('flex grow', className)} />;
};

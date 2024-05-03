//
// Copyright 2023 DXOS.org
//

import { autocompletion, completionKeymap } from '@codemirror/autocomplete';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView, keymap, lineNumbers } from '@codemirror/view';
import { minimalSetup } from 'codemirror';
import React from 'react';

import { DocAccessor } from '@dxos/react-client/echo';
import { type ThemeMode } from '@dxos/react-ui';
import { automerge, defaultTheme, useTextEditor } from '@dxos/react-ui-editor';
import { mx } from '@dxos/react-ui-theme';

export type ScriptEditorProps = {
  source: DocAccessor;
  themeMode?: ThemeMode;
  className?: string;
};

// TODO(burdon): https://davidmyers.dev/blog/how-to-build-a-code-editor-with-codemirror-6-and-typescript/introduction

export const ScriptEditor = ({ source, themeMode, className }: ScriptEditorProps) => {
  const { parentRef } = useTextEditor(
    () => ({
      doc: DocAccessor.getValue(source),
      extensions: [
        // TODO(burdon): Use basic set-up (e.g., bracket matching).
        // TODO(burdon): Use this in text editor (cancels highlight current line)
        // basicSetup,
        minimalSetup,

        lineNumbers(),
        // TODO(burdon): Syntax highlighting theme.
        javascript({ typescript: true }),
        autocompletion({ activateOnTyping: false }),
        keymap.of([...completionKeymap]),

        EditorView.baseTheme(defaultTheme),
        EditorView.darkTheme.of(themeMode === 'dark'),
        EditorView.contentAttributes.of({ class: '!px-2' }),

        // TODO(burdon): Presence.
        automerge(source),
      ],
    }),
    [source, themeMode],
  );

  return <div ref={parentRef} className={mx('flex grow', className)} />;
};

//
// Copyright 2026 DXOS.org
//

import { markdown } from '@codemirror/lang-markdown';
import { lintGutter } from '@codemirror/lint';
import { type Extension } from '@codemirror/state';
import type * as LanguageModel from '@effect/ai/LanguageModel';
import React, { useMemo, useRef } from 'react';

import { DensityProvider, ThemeProvider } from '@dxos/react-ui';
import { Editor, type EditorController } from '@dxos/react-ui-editor';

import { assistant } from './assistant-extension';
import { Runtime } from 'effect';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
} from '@dxos/ui-editor';

export type TypewriterProps = {
  initialContent?: string;
  extensions?: Extension[];
  runtime: Runtime.Runtime<LanguageModel.LanguageModel>;
};

export const Typewriter = ({ initialContent = '', extensions = [], runtime }: TypewriterProps) => {
  const editorRef = useRef<EditorController>(null);
  const extension = useMemo(
    () => [
      createBasicExtensions({ scrollPastEnd: true, search: true }),
      createThemeExtensions({ syntaxHighlighting: true }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      assistant(runtime),
      ...extensions,
    ],
    [runtime, extensions],
  );

  return (
    <ThemeProvider>
      <DensityProvider density='fine'>
        <div className='is-full bs-full grid overflow-hidden'>
          <Editor.Root ref={editorRef}>
            <Editor.Viewport>
              <Editor.Content initialValue={initialContent} extensions={extension} />
            </Editor.Viewport>
          </Editor.Root>
        </div>
      </DensityProvider>
    </ThemeProvider>
  );
};

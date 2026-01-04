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

export type TypewriterProps = {
  initialContent?: string;
  extensions?: Extension[];
  runtime: Runtime.Runtime<LanguageModel.LanguageModel>;
};

export const Typewriter = ({ initialContent = '', extensions = [], runtime }: TypewriterProps) => {
  const editorRef = useRef<EditorController>(null);
  const extension = useMemo(() => [markdown(), lintGutter(), assistant(runtime), ...extensions], [runtime, extensions]);

  return (
    <ThemeProvider>
      <DensityProvider density='fine'>
        <div className='relative w-full h-[600px] border border-neutral-200 rounded-md overflow-hidden bg-white dark:bg-neutral-900 dark:border-neutral-700 shadow-sm group'>
          <Editor.Root ref={editorRef}>
            <Editor.Viewport>
              <Editor.Content
                initialValue={initialContent}
                extensions={[markdown(), lintGutter(), assistant(runtime), ...extensions]}
              />
            </Editor.Viewport>
          </Editor.Root>
        </div>
      </DensityProvider>
    </ThemeProvider>
  );
};

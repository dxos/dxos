//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { type Parser } from '@dxos/nlp';
import { IconButton, Panel, type ThemedClassName, Toolbar, useThemeContext } from '@dxos/react-ui';
import { Editor } from '@dxos/react-ui-editor';
import {
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  pos,
} from '@dxos/ui-editor';

export type DocumentEditorProps = ThemedClassName<{
  /** Initial markdown content; the component owns subsequent edits. */
  initialValue?: string;
  /** POS tagger wired into the `pos` decoration extension; omit to disable decorations. */
  parse?: Parser;
  /** Disables the trigger and swaps its icon while a pipeline run is in flight. */
  busy?: boolean;
  /** Toolbar trigger; receives the current document text. */
  onRun?: (text: string) => void;
}>;

/**
 * Text-document column: markdown editor with `pos` decoration extension and a toolbar button that
 * triggers a pipeline over the current text. The document lives in component state so pipelines
 * always receive the latest edits; variants select the pipeline via the parent's `onRun`.
 */
export const DocumentEditor = ({ classNames, initialValue = '', parse, busy, onRun }: DocumentEditorProps) => {
  const { themeMode } = useThemeContext();
  const [text, setText] = useState(initialValue);
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      ...(parse ? [pos({ parse, popover: true })] : []),
    ],
    [themeMode, parse],
  );

  return (
    <Panel.Root classNames={classNames}>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          <div role='none' className='grow' />
          <IconButton
            icon={busy ? 'ph--spinner-gap--regular' : 'ph--play--regular'}
            iconOnly
            label='Run pipeline'
            disabled={busy || !onRun}
            onClick={() => onRun?.(text)}
          />
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Editor.Root>
          <Editor.View value={text} onChange={setText} extensions={extensions} />
        </Editor.Root>
      </Panel.Content>
    </Panel.Root>
  );
};

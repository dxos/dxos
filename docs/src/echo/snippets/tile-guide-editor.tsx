//
// Copyright 2026 DXOS.org
//

import React, { useMemo, useState } from 'react';

import { createObject } from '@dxos/echo-client';
import { Doc } from '@dxos/echo-doc';
import {
  AttendableContainer,
  RootAttentionProvider,
} from '@dxos/react-ui-attention';
import { Editor } from '@dxos/react-ui-editor';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Typography from '@dxos/react-ui/Typography';
import { Text } from '@dxos/schema';
import {
  automerge,
  createBasicExtensions,
  createMarkdownExtensions,
  createThemeExtensions,
  decorateMarkdown,
  listener,
} from '@dxos/ui-editor';

// #region plain
/** A plain-text editor: the basic extensions give it editing, and the theme extensions match the app's theme. */
export const NotesEditor = () => {
  const themeMode = Hooks.useThemeMode();
  // The text lives in state, so it survives the editor being rebuilt when the theme changes.
  const [text, setText] = useState('');
  const extensions = useMemo(
    () => [
      createBasicExtensions({
        placeholder: 'Write a note…',
        lineWrapping: true,
      }),
      createThemeExtensions({ themeMode }),
    ],
    [themeMode],
  );

  return (
    <Editor.Root extensions={extensions}>
      <Editor.View value={text} onChange={setText} />
    </Editor.Root>
  );
};
// #endregion

// #region markdown
const NOTES = '# Notes\n\nSome **bold** text and a [link](https://dxos.org).\n';

const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;

/**
 * A markdown editor with a formatting toolbar; `listener` reports each change. The toolbar is active while the
 * container it shares with the editor has the user's attention.
 */
export const MarkdownEditor = () => {
  const themeMode = Hooks.useThemeMode();
  // The text lives in state, so it survives the editor being rebuilt when the theme changes.
  const [text, setText] = useState(NOTES);
  const [words, setWords] = useState(() => countWords(NOTES));
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      listener({ onChange: ({ text }) => setWords(countWords(text)) }),
    ],
    [themeMode],
  );

  return (
    <RootAttentionProvider>
      <AttendableContainer id='notes'>
        <Editor.Root extensions={extensions} viewMode='preview'>
          <Editor.Content>
            <Editor.Toolbar attendableId='notes' />
            <Editor.View value={text} onChange={setText} />
          </Editor.Content>
        </Editor.Root>
      </AttendableContainer>
      <Typography.Text tone='muted'>{words} words</Typography.Text>
    </RootAttentionProvider>
  );
};
// #endregion

// #region echo
/**
 * An editor bound to an ECHO `Text` object: edits go into the object, and edits made to it elsewhere (another
 * window, another device) appear in the editor.
 */
export const SharedEditor = ({ text }: { text: Text.Text }) => {
  const themeMode = Hooks.useThemeMode();
  const extensions = useMemo(
    () => [
      createBasicExtensions({ lineWrapping: true }),
      createThemeExtensions({ themeMode }),
      createMarkdownExtensions(),
      decorateMarkdown(),
      automerge(Doc.createAccessor(text, ['content'])),
    ],
    [themeMode, text],
  );

  return (
    <Editor.Root extensions={extensions}>
      <Editor.View />
    </Editor.Root>
  );
};
// #endregion

/** The shared editor over a `Text` object that is not in a database, for the docs preview. */
export const SharedEditorPreview = () => {
  const text = useMemo(
    () =>
      createObject(
        Text.make({ content: 'Type here; the text is an ECHO object.\n' }),
      ),
    [],
  );
  return <SharedEditor text={text} />;
};

//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { EditorState } from 'prosemirror-state';
import { EditorView } from 'prosemirror-view';
import { schema } from 'prosemirror-schema-basic';
import { suggest, Suggester } from 'prosemirror-suggest';
import React, { useEffect, useRef } from 'react';

const styles = css`
  > div {
    p {
      margin: 0;
    }
  }

  .ProseMirror {
    word-wrap: break-word;
    white-space: pre-wrap;
    white-space: break-spaces;
    font-family: sans-serif;
    line-height: 1.2;
    outline: none;
    padding-right: 0;
    position: relative;
    max-width: 100%;
    min-height: 100%;
  }
`;

const commands = [
  'select',
  'children',
  'links',
  'parent',
  'source',
  'target',
  'filter'
];

// NOTE: Documentation is out of date.
// TODO(burdon): https://github.com/remirror/remirror/tree/HEAD/packages/prosemirror-suggest
//  - https://github.com/remirror/remirror/blob/main/packages/prosemirror-suggest/src/suggest-types.ts
// TODO(burdon): See hooks.
//  - https://github.com/remirror/remirror/blob/main/packages/remirror__react-hooks/src/use-suggest.ts

// TODO(burdon): CSS?
const suggestCommands: Suggester = {
  char: '.',
  name: 'commands',
  validPrefixCharacters: /^.$/,
  onChange: ({ query, ...rest }) => {
    console.log('onChange', query, rest);
  }
};

export interface EditorProps {}

// https://prosemirror.net/examples/basic
export const Editor = ({
}: EditorProps) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const suggestionPlugin = suggest(suggestCommands);

    // Create editor.
    const view = new EditorView(ref.current!, {
      state: EditorState.create({
        plugins: [suggestionPlugin],
        schema
      })
    });

    view.focus();
  }, [ref]);

  return (
    <div
      ref={ref}
      spellCheck={false}
      style={{
        padding: 16,
        margin: 16,
        height: 80,
        border: '1px solid #999'
      }}
      className={styles}
    />
  );
};

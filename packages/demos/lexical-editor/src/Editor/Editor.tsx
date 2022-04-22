//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { $getRoot, $getSelection } from 'lexical';
import React, { useEffect } from 'react';
import { Doc } from 'yjs'
import { Awareness } from 'y-protocols/awareness';

import type { EditorState } from 'lexical';

/*
import {
  LexicalComposer,
  LexicalPlainTextPlugin,
  LexicalContentEditable,
  HistoryPlugin,
  LexicalOnChangePlugin,
  useLexicalComposerContext
} from '@lexical/react';
*/

import LexicalHashtagPlugin from '@lexical/react/LexicalHashtagPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import LexicalRichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import LexicalOnChangePlugin from '@lexical/react/LexicalOnChangePlugin';
import { CollaborationPlugin, ProviderFactory } from '@lexical/react/LexicalCollaborationPlugin';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';

import { HashtagNode } from '@lexical/hashtag';
import { Provider, ProviderAwareness } from '@lexical/yjs';

// TODO(burdon): YJS.

const styles = css`
  > div {
    outline: none;
    margin: 16px;
  }
  
  .ltr {
    text-align: left;
  }
  
  .rtl {
    text-align: right;
  }
  
  .editor-paragraph {
    margin: 0 0 15px 0;
    position: relative;
  }
`;

// https://github.com/facebook/lexical/blob/ec7c75afe6c2db15d5bc1e9bb35df4d649e25d93/packages/lexical-website-new/docs/getting-started/theming.md
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph'
};

const CustomAutoFocusPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.focus();
  }, [editor]);

  return null;
}

export interface EditorProps {
  onDebug?: (debug: any) => void
}

/**
 * Editor
 * https://lexical.dev/docs/getting-started/quick-start
 */
export const Editor = ({
  onDebug
}: EditorProps) => {
  const handleError = (error: Error) => {
    onDebug?.({ error });
  };

  // TODO(burdon): Adapt y-webrtc/y-websocket to use ECHO.
  // import { WebrtcProvider } from 'y-webrtc'
  // https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js
  const providerFactory = (id: string, yjsDocMap: Map<string, Doc>) => {
    let doc = yjsDocMap.get(id);
    if (!doc) {
      doc = new Doc();
      // TODO(burdon): Plug-in TextModel?
      // https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js
      doc.on('update', (update: Uint8Array, origin: any) => {
        console.log(origin);
        console.log('update', update); // Send?
      })
      yjsDocMap.set(id, doc);
    }

    const provider: Provider = {
      // Ephemeral state (e.g., cursors).
      // https://github.com/yjs/y-protocols/blob/master/awareness.js
      awareness: new Awareness(doc),

      connect: async () => {
        console.log('connect');
      },
      disconnect: () => {
        console.log('disconnect');
      },
      on: (type: string) => { // 'reload', 'status', 'sync'
        console.log('on:', type);
      },
      off: (type: string) => {
        console.log('off:', type);
      }
    };

    return provider;
  };

  const handleChange = (state: EditorState) => {
    state.read(() => {
      const root = $getRoot();
      const selection = $getSelection();
      onDebug?.({ root, selection });
    });
  };

  return (
    <LexicalComposer
      initialConfig={{
        theme,
        nodes: [
          HashtagNode
        ],
        onError: handleError
      }}
    >
      <div className={styles}>
        {/*<ToolbarPlugin />*/}
        <LexicalRichTextPlugin
          contentEditable={<LexicalContentEditable spellcheck={false }/>}
          placeholder={null}
        />
        {/*
        <LexicalOnChangePlugin
          onChange={handleChange}
        />
        */}
        <CollaborationPlugin
          id='main'
          shouldBootstrap={false}
          providerFactory={providerFactory}
        />
        <HistoryPlugin />
        <CustomAutoFocusPlugin />
        <LexicalHashtagPlugin />
      </div>
    </LexicalComposer>
  );
};

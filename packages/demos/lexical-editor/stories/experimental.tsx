//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { HashtagNode } from '@lexical/hashtag';
import LexicalComposer from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import LexicalRichTextPlugin from '@lexical/react/LexicalRichTextPlugin';
import { $getRoot, $getSelection } from 'lexical';
import type { EditorState } from 'lexical';
import React, { FC, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

export default {
  title: 'Lexical/experimental'
};

// TODO(burdon): Experiments:
// https://news.ycombinator.com/item?id=31017943 (Why Lexical)
//  - YJS/TextModel
//    - With history
//  - scrolling
//  - side margin "+" button (absolute position)
//  - side margin drag (without cut/paste); show inline horizontal rule
//  - "/" command menu/popup
//  - inline blocks
//  - inline list
//  - drag blocks
//  - Typescript?

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

const editorStyles = css`
  border: 1px solid green;
  
  > div {
    outline: none;
    margin: 16px 64px;
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

// const marginStyles = css``;

const popupStyles = css`
  position: absolute;
  left: 100px;
  top: 100px;
  z-index: 999;
  visibility: hidden;
  border: 1px solid lightgray;
  padding: 8px;
`;

// https://github.com/facebook/lexical/blob/ec7c75afe6c2db15d5bc1e9bb35df4d649e25d93/packages/lexical-website-new/docs/getting-started/theming.md
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph'
};

// TODO(burdon): See FloatingCharacterStylesEditor.
const Popup = () => {
  const [editor] = useLexicalComposerContext();
  const popupRef = useRef<HTMLDivElement | null>(null);

  const updatePopup = useCallback(() => {
    const nativeSelection = window.getSelection()!;
    const domRange = nativeSelection.getRangeAt(0);
    let rect;
    const rootElement = editor.getRootElement();
    if (nativeSelection.anchorNode === rootElement) {
      let inner = rootElement!;
      while (inner.firstElementChild != null) {
        inner = inner.firstElementChild as any;
      }
      rect = inner.getBoundingClientRect();
    } else {
      rect = domRange.getBoundingClientRect();
    }

    const { x, y } = rect;
    popupRef.current!.style.left = `${x - 8}px`;
    popupRef.current!.style.top = `${y + 24}px`;
  }, [editor]);

  useEffect(() => editor.registerUpdateListener(({ editorState }) => {
    editorState.read(() => {
      updatePopup();
    });
  }), [editor]);

  useEffect(() => {
    const keyDownHandler = (event: KeyboardEvent) => {
      const key = event.key;
      switch (key) {
        case '/': {
          // TODO(burdon): Focus menu.
          popupRef.current!.style.visibility = 'visible';
          break;
        }

        case 'Escape': {
          popupRef.current!.style.visibility = 'hidden';
          setTimeout(() => {
            editor.focus();
          }, 0); // TODO(burdon): Hack.
          break;
        }
      }
    };

    window.addEventListener('keydown', keyDownHandler, true);
    return () => {
      window.removeEventListener('keydown', keyDownHandler, true);
    };
  }, [editor]);

  return (
    <div ref={popupRef} className={popupStyles}>
      <div>Option 1</div>
      <div>Option 2</div>
      <div>Option 3</div>
      <div>Option 4</div>
      <div>Option 5</div>
    </div>
  );
};

const _CommandPopupPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.focus();
  }, [editor]);

  return createPortal(<Popup />, document.body);
};

/*
const CustomCollaborationPlugin = ({ model }: { model: SyncModel }) => {
  const { clientID, ...rest } = useCollaborationContext();
  useEffect(() => {
    console.log(`Editor: ${clientID}`, rest);
  }, [clientID]);

  // TODO(burdon): Adapt y-webrtc/y-websocket to use ECHO.
  // import { WebrtcProvider } from 'y-webrtc'
  // https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js
  const providerFactory = useCallback((id: string, yjsDocMap: Map<string, Doc>) => {
    // TODO(burdon): Only called one side?
    let doc = yjsDocMap.get(id);
    if (!doc) {
      console.log(`providerFactory: ${clientID}:${id}`);
      // doc = new Doc();
      doc = model.doc;

      // TODO(burdon): Plug-in TextModel?
      // https://github.com/yjs/y-websocket/blob/master/src/y-websocket.js
      doc.on('update', (update: Uint8Array, origin: any) => {
        console.log(clientID, origin.clientID);
        // console.log('update', update); // Send?
      })

      // model.onUpdate && doc.on('update', model.onUpdate);
      yjsDocMap.set(id, model.doc);
    }

    const provider: Provider = {
      // Ephemeral state (e.g., cursors).
      // https://github.com/yjs/y-protocols/blob/master/awareness.js
      awareness: new Awareness(doc),

      connect: async () => {
        // console.log('connect');
      },
      disconnect: () => {
        // console.log('disconnect');
      },
      on: (type: string) => { // 'reload', 'status', 'sync'
        // console.log('on:', type);
      },
      off: (type: string) => {
        // console.log('off:', type);
      }
    };

    return provider;
  }, [clientID]);

  return (
    <CollaborationPlugin
      id='main'
      shouldBootstrap={true}
      providerFactory={providerFactory}
    />
  );
};
*/

/**
 * Editor
 * https://lexical.dev/docs/getting-started/quick-start
 */
const _Editor: FC<{
  onDebug?: (debug: any) => void
}> = ({
  onDebug
}) => {
  const handleError = (error: Error) => {
    onDebug?.({ error });
  };

  const _handleChange = (state: EditorState) => {
    state.read(() => {
      const root = $getRoot();
      const selection = $getSelection();
      onDebug?.({ root, selection });
    });
  };

  return (
    <LexicalComposer
      initialConfig={{
        namespace: 'dxos',
        theme,
        nodes: [
          HashtagNode
        ],
        onError: handleError
      }}
    >
      <div className={editorStyles}>
        <LexicalRichTextPlugin
          contentEditable={<LexicalContentEditable spellcheck={false} />}
          placeholder={null}
        />
        {/*
        <LexicalRichTextPlugin
          contentEditable={<LexicalContentEditable spellcheck={false}/>}
          placeholder={null}
        />
        */}
        {/*
        <ToolbarPlugin />
        */}
        {/*
        <LexicalOnChangePlugin
          onChange={handleChange}
        />
        */}
        {/*
        <HistoryPlugin />
        <LexicalHashtagPlugin />
        <CommandPopupPlugin />
        */}
      </div>
    </LexicalComposer>
  );
};

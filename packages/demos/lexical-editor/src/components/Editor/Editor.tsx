//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { ContentEditable as LexicalContentEditable } from '@lexical/react/LexicalContentEditable';
import { PlainTextPlugin as LexicalPlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import React, { FC, useEffect, useMemo } from 'react';

import { Event } from '@dxos/async';
import { Item } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

// https://github.com/facebook/lexical/blob/ec7c75afe6c2db15d5bc1e9bb35df4d649e25d93/packages/lexical-website-new/docs/getting-started/theming.md
const theme = {
  ltr: 'ltr',
  rtl: 'rtl',
  placeholder: 'editor-placeholder',
  paragraph: 'editor-paragraph'
};

const editorStyles = css`
  width: 100%;
  
  > div {
    outline: none;
    margin: 16px 40px;
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

// TODO(burdon): Too narrow/specialized.
const FocusPlugin: FC<{
  eventHandler: Event
}> = ({
  eventHandler
}) => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.focus();
    return eventHandler.on(() => {
      console.log('FocusPlugin: focus');
      setTimeout(() => {
        editor.focus(); // TODO(burdon): Not working.
      });
    });
  }, [editor]);

  return null;
};

/**
 *
 */
export const Editor: FC<{
  id: string,
  item: Item<TextModel>,
  children?: JSX.Element
}> = ({
  id,
  item,
  children
}) => {
  const eventHandler = useMemo(() => new Event(), []);

  const handleClick = () => {
    eventHandler.emit();
  };

  // https://github.com/facebook/lexical
  return (
    <div
      className={editorStyles}
      onClick={handleClick}
    >
      <LexicalComposer
        initialConfig={{
          namespace: 'dxos',
          theme,
          onError: (err) => {
            console.error(err);
          }
        }}
      >
        <LexicalPlainTextPlugin
          placeholder=''
          contentEditable={(
            <LexicalContentEditable
              spellCheck={false}
            />
          )}
        />

        <FocusPlugin
          eventHandler={eventHandler}
        />

        {children}
      </LexicalComposer>
    </div>
  );
};

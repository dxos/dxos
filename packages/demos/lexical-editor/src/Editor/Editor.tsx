//
// Copyright 2022 DXOS.org
//

import { css } from '@emotion/css';
import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import LexicalComposer from '@lexical/react/LexicalComposer';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import LexicalContentEditable from '@lexical/react/LexicalContentEditable';
import LexicalPlainTextPlugin from '@lexical/react/LexicalPlainTextPlugin';
import React, { FC, useEffect } from 'react';

import { Item } from '@dxos/client';
import { TextModel } from '@dxos/text-model';

import { useProviderFactory } from '../hooks';

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

const FocusPlugin = () => {
  const [editor] = useLexicalComposerContext();
  useEffect(() => {
    editor.focus();
  }, [editor]);

  return null;
};

export const Editor: FC<{
  id: string
  item: Item<TextModel>
}> = ({
  id,
  item
}) => {
  const providerFactory = useProviderFactory(item);

  return (
    <div className={editorStyles}>
      <LexicalComposer
        initialConfig={{
          namespace: 'dxos',
          theme,
          onError: () => {}
        }}
      >
        <FocusPlugin />
        <LexicalPlainTextPlugin
          placeholder={null}
          contentEditable={(
            <LexicalContentEditable spellcheck={false} />
          )}
        />
        <CollaborationPlugin
          id={id}
          shouldBootstrap={true}
          providerFactory={providerFactory}
        />
      </LexicalComposer>
    </div>
  );
};

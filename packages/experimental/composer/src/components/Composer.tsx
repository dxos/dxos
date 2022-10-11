//
// Copyright 2022 DXOS.org
//
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import React from 'react';

import { TextModel, useTextItem } from './TextItemProvider';

const editorConfig = {
  namespace: 'org.dxos.composer',
  theme: {
    ltr: 'ltr',
    rtl: 'rtl',
    placeholder: 'editor-placeholder',
    paragraph: 'editor-paragraph'
  },
  onError: (error: Error) => {
    throw error;
  },
  nodes: []
};

export const Composer = () => {
  const { item } = useTextItem();
  console.log('[item]', (item?.model as TextModel).content);

  return (
    <LexicalComposer initialConfig={editorConfig}>
      <div className='editor-container'>
        <PlainTextPlugin
          contentEditable={<ContentEditable className='editor-input' />}
          placeholder={
            <div className='editor-placeholder'>Enter some plain text...</div>
          }
        />
      </div>
    </LexicalComposer>
  );
};

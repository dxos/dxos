//
// Copyright 2022 DXOS.org
//

import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import {
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  LexicalEditor
} from 'lexical';
import React from 'react';

import { Loading } from '@dxos/react-ui';

import { useTextItem } from '../context/TextItemProvider';
import { useProviderFactory } from '../hooks';

const initialLexicalConfig = {
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

const initialEditorState = (editor: LexicalEditor): void => {
  const root = $getRoot();
  const paragraph = $createParagraphNode();
  const text = $createTextNode('Welcome to collab!');
  paragraph.append(text);
  root.append(paragraph);
};

export const Composer = () => {
  const { item } = useTextItem();

  const providerFactory = useProviderFactory(item);

  return (
    <LexicalComposer initialConfig={initialLexicalConfig}>
      <div className='editor-container'>
        <PlainTextPlugin
          contentEditable={<ContentEditable />}
          placeholder={<Loading />}
        />
        <CollaborationPlugin
          id='echo-plugin'
          providerFactory={providerFactory}
          initialEditorState={initialEditorState}
          shouldBootstrap={true}
        />
      </div>
    </LexicalComposer>
  );
};

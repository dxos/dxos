//
// Copyright 2022 DXOS.org
//

import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import React from 'react';

import { useProfile } from '../context/ProfileProvider';
import { useTextItem } from '../context/TextItemProvider';
import { useYEchoProvider } from '../y-echo/YEcho';

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

interface ComposerProps {
  id?: string
}

export const Composer = (props: ComposerProps) => {
  const { item } = useTextItem();
  const { profile } = useProfile();
  const username = profile!.username || profile!.publicKey.truncate(8);

  const providerFactory = useYEchoProvider(item!);

  return (
    <LexicalComposer initialConfig={initialLexicalConfig}>
      <div className='editor-container'>
        <PlainTextPlugin
          contentEditable={<ContentEditable className='border-2 border-primary-500 rounded-md' />}
          placeholder=''
        />
        <CollaborationPlugin
          username={username}
          id={item!.id}
          providerFactory={providerFactory}
          shouldBootstrap={true}
        />
      </div>
    </LexicalComposer>
  );
};

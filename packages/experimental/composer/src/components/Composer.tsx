//
// Copyright 2022 DXOS.org
//

import { CollaborationPlugin } from '@lexical/react/LexicalCollaborationPlugin';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { PlainTextPlugin } from '@lexical/react/LexicalPlainTextPlugin';
import cx from 'classnames';
import React, { useEffect } from 'react';

import { defaultFocus } from '@dxos/react-ui';
import type { TextModel } from '@dxos/text-model';

import { useProfile } from '../context/ProfileProvider';
import { useTextItem } from '../context/TextItemProvider';
import { useYEchoProvider } from '../y-echo/YEcho';

interface ComposerProps {
  id?: string
}

const logDocUpdates = (update: Uint8Array, origin: any) => {
  console.log('[doc updated]', update.length);
};

const logModelUpdates = (model: TextModel) => {
  console.log('[echo model updated]', model);
};

export const Composer = (props: ComposerProps) => {
  const { item } = useTextItem();
  const { profile } = useProfile();
  const username = profile!.username || profile!.publicKey.truncate(8);

  const providerFactory = useYEchoProvider(item!);

  useEffect(() => {
    item?.model.doc.on('updateV2', logDocUpdates);
    item?.model.subscribe(logModelUpdates);
    return () => {
      item?.model.doc.off('updateV2', logDocUpdates);
    };
  }, [item]);

  return (
    <LexicalComposer initialConfig={{
      editorState: null,
      namespace: 'org.dxos.composer',
      theme: {
        ltr: 'ltr',
        rtl: 'rtl'
      },
      onError: (error: Error) => {
        throw error;
      },
      nodes: []
    }}>
      <div role='none' className='relative'>
        <PlainTextPlugin
          contentEditable={(
            <ContentEditable
              className={cx(defaultFocus, 'p-4 bg-white dark:bg-neutral-950 rounded')} />
          )}
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

//
// Copyright 2022 DXOS.org
//

import Collaboration from '@tiptap/extension-collaboration';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { useEffect } from 'react';
import { WebrtcProvider } from 'y-webrtc';
// import * as Y from 'yjs';

// import { useProfile } from '../context/ProfileProvider';
import { useTextItem } from '../context/TextItemProvider';

interface ComposerProps {
  id?: string
}

// const ydoc = new Y.Doc();
// const provider = new WebrtcProvider('example-document', ydoc);

export const Composer = (props: ComposerProps) => {
  const { item } = useTextItem();
  // const { profile } = useProfile();
  // const username = profile!.username || profile!.publicKey.truncate(8);

  useEffect(() => {
    if (!item) {
      return;
    }

    const provider = new WebrtcProvider(item.id, item.model.doc);
  }, [item]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: item?.model.doc })
    ]
  }, [item]);

  return (
    <EditorContent editor={editor} />
  );
};

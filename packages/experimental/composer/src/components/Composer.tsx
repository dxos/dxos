//
// Copyright 2022 DXOS.org
//

import Collaboration from '@tiptap/extension-collaboration';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import cx from 'classnames';
import React, { useEffect } from 'react';
import { WebrtcProvider } from 'y-webrtc';

import { defaultFocus } from '@dxos/react-ui';

import { useTextItem } from '../context';

export const Composer = () => {
  const { item } = useTextItem();

  // useEffect(() => {
  //   item && new WebrtcProvider(item.id, item.model.doc);
  // }, [item]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ history: false }),
      Collaboration.configure({ document: item?.model.doc, field: 'content' })
    ],
    editorProps: {
      attributes: {
        class: cx(defaultFocus, 'bg-neutral-50/25 border border-neutral-300 text-neutral-900 text-sm rounded-lg block w-full p-4 dark:bg-neutral-700/25 dark:border-neutral-600 dark:text-white')
      }
    }
  }, [item]);

  return (
    <EditorContent editor={editor} />
  );
};

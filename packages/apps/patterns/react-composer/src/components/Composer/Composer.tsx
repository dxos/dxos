//
// Copyright 2022 DXOS.org
//

import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React from 'react';

import { Item } from '@dxos/client';
import { useTranslation, mx } from '@dxos/react-uikit';
import { TextModel } from '@dxos/text-model';

export interface ComposerProps {
  item: Item<TextModel>;
  className?: string;
}

export const Composer = ({ item, className }: ComposerProps) => {
  const { t } = useTranslation('appkit');
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        Collaboration.configure({ document: item?.model.doc, field: 'content' }),
        Placeholder.configure({
          placeholder: t('composer placeholder'),
          emptyEditorClass: 'before:content-[attr(data-placeholder)] before:absolute opacity-50 cursor-text'
        })
      ],
      editorProps: {
        attributes: {
          class: mx('focus:outline-none focus-visible:outline-none', className)
        }
      }
    },
    [item, item?.model.doc]
  );

  return <EditorContent editor={editor} />;
};

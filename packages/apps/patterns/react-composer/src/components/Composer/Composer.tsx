//
// Copyright 2022 DXOS.org
//

import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { ComponentProps } from 'react';

import type { TextObject } from '@dxos/client';
import { useTranslation, mx } from '@dxos/react-components';

export interface ComposerSlots {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
    spellCheck?: boolean;
  };
}

export interface ComposerProps {
  document: TextObject;
  field?: string;
  placeholder?: string;
  slots?: ComposerSlots;
}

export const Composer = ({ document, field = 'content', placeholder, slots = {} }: ComposerProps) => {
  // TODO(wittjosiah): Provide own translations?
  //   Maybe default is not translated and translated placeholder can be provided by the app.
  const { t } = useTranslation('appkit');

  // TODO(burdon): Value doesn't show up after synced.
  const v = document?.doc?.getXmlFragment(field);
  console.log('[[', v?.toString().length, ']]');

  // Reference:
  // https://tiptap.dev/installation/react
  // https://github.com/ueberdosis/tiptap
  // https://tiptap.dev/guide/output/#option-3-yjs
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        // https://github.com/ueberdosis/tiptap/tree/main/packages/extension-collaboration
        Collaboration.configure({ document: document.doc!, field }),
        Placeholder.configure({
          placeholder: placeholder ?? t('composer placeholder'),
          emptyEditorClass: 'before:content-[attr(data-placeholder)] before:absolute opacity-50 cursor-text'
        })
      ],
      editorProps: {
        attributes: {
          class: mx('focus:outline-none focus-visible:outline-none', slots?.editor?.className),
          spellcheck: slots?.editor?.spellCheck === false ? 'false' : 'true'
        }
      }
    },
    [document, document?.doc]
  );

  return <EditorContent {...slots?.root} editor={editor} />;
};

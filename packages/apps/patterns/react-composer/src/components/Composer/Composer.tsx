//
// Copyright 2022 DXOS.org
//

import Collaboration from '@tiptap/extension-collaboration';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { ComponentProps } from 'react';
import * as Y from 'yjs';

import { Item } from '@dxos/client';
import { useTranslation, mx } from '@dxos/react-components';
import { TextModel, Doc } from '@dxos/text-model';

export interface ComposerSlots {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
  };
}

export interface ComposerProps {
  doc?: Doc;
  field?: string;
  fragment?: Y.XmlFragment;
  /**
   * @deprecated Use `doc` instead.
   */
  item?: Item<TextModel>;
  slots?: ComposerSlots;
}

// TODO(burdon): Pass in document (or fragment?) directly (remove dependency on item).
export const Composer = ({ item, doc /*= item?.model?.doc*/, field = 'content', fragment, slots = {} }: ComposerProps) => {
  const { t } = useTranslation('appkit');

  // Reference:
  // https://tiptap.dev/installation/react
  // https://github.com/ueberdosis/tiptap
  // https://tiptap.dev/guide/output/#option-3-yjs
  const editor = useEditor(
    {
      extensions: [
        StarterKit.configure({ history: false }),
        // https://github.com/ueberdosis/tiptap/tree/main/packages/extension-collaboration
        Collaboration.configure({ document: doc, field, fragment }),
        Placeholder.configure({
          placeholder: t('composer placeholder'),
          emptyEditorClass: 'before:content-[attr(data-placeholder)] before:absolute opacity-50 cursor-text'
        })
      ],
      editorProps: {
        attributes: {
          class: mx('focus:outline-none focus-visible:outline-none', slots?.editor?.className)
        }
      }
    },
    [doc]
  );

  return <EditorContent {...slots?.root} editor={editor} />;
};

//
// Copyright 2022 DXOS.org
//
import { mergeAttributes } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import CollaborationCursor from '@tiptap/extension-collaboration-cursor';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Placeholder from '@tiptap/extension-placeholder';
import { type Editor, EditorContent, useEditor as useNaturalEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { forwardRef, useImperativeHandle, useMemo } from 'react';

import { generateName } from '@dxos/display-name';
import { mx } from '@dxos/react-ui-theme';

import { type EditorModel, type EditorSlots } from '../../model';
import {
  blockquote,
  bold,
  codeBlock,
  heading,
  type HeadingLevel,
  horizontalRule,
  italic,
  listItem,
  orderedList,
  paragraph,
  strikethrough,
  unorderedList,
  codeWithoutMarks,
} from '../../styles';
import { cursorColor } from '../../yjs';

export type TipTapEditor = Editor;

type UseEditorOptions = {
  model?: EditorModel;
  placeholder?: string;
  slots?: Pick<EditorSlots, 'editor'>;
};

const useEditor = ({ model, placeholder = 'Enter text…', slots = {} }: UseEditorOptions) => {
  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Extensions
        history: false,
        // Nodes
        blockquote: {
          HTMLAttributes: {
            class: blockquote,
          },
        },
        bulletList: {
          HTMLAttributes: {
            class: unorderedList,
          },
        },
        codeBlock: {
          HTMLAttributes: {
            class: codeBlock,
          },
        },
        heading: false, // (thure): `StarterKit` doesn’t let you configure how headings are rendered, see `Heading` below.
        horizontalRule: {
          HTMLAttributes: {
            class: horizontalRule,
          },
        },
        listItem: false, // (thure): `StarterKit` doesn’t let you configure how list items are rendered, see `ListItem` below.
        orderedList: {
          HTMLAttributes: {
            class: orderedList,
          },
        },
        paragraph: {
          HTMLAttributes: {
            class: paragraph,
          },
        },
        // Marks
        bold: {
          HTMLAttributes: {
            class: bold,
          },
        },
        code: {
          HTMLAttributes: {
            class: codeWithoutMarks,
          },
        },
        italic: {
          HTMLAttributes: {
            class: italic,
          },
        },
        strike: {
          HTMLAttributes: {
            class: strikethrough,
          },
        },
      }),
      Heading.extend({
        renderHTML({ node, HTMLAttributes }) {
          const hasLevel = this.options.levels.includes(node.attrs.level);
          const level: HeadingLevel = hasLevel ? node.attrs.level : this.options.levels[0];

          return [
            `h${level}`,
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
              class: heading[level],
            }),
            0,
          ];
        },
      }),
      ListItem.extend({
        renderHTML: ({ HTMLAttributes }) => [
          'li',
          mergeAttributes(HTMLAttributes, {
            marker: '• ',
            class: listItem,
          }),
          ['div', { role: 'none' }, 0],
        ],
      }),
      // https://github.com/ueberdosis/tiptap/tree/main/packages/extension-collaboration
      ...(model && typeof model.content !== 'string' ? [Collaboration.configure({ fragment: model.content })] : []),
      ...(model?.provider
        ? [
            CollaborationCursor.configure({
              provider: model.provider,
              user: model.peer && {
                name: model.peer.name ?? generateName(model.peer.id),
                color: cursorColor.color,
              },
            }),
          ]
        : []),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:absolute opacity-50 cursor-text',
      }),
    ],
    [model?.id],
  );

  return useNaturalEditor(
    {
      extensions,
      editorProps: {
        attributes: {
          class: mx('focus:outline-none focus-visible:outline-none', slots.editor?.className),
          spellcheck: slots.editor?.spellCheck === false ? 'false' : 'true',
          tabindex: slots.editor?.tabIndex ? String(slots.editor?.tabIndex) : '0',
        },
      },
    },
    [extensions],
  );
};

export type RichTextEditorProps = UseEditorOptions & {
  slots?: EditorSlots;
};

/**
 * @deprecated
 */
// TODO(burdon): Remove?
export const RichTextEditor = forwardRef<Editor | null, RichTextEditorProps>((props, ref) => {
  const editor = useEditor(props);
  useImperativeHandle<Editor | null, Editor | null>(ref, () => editor, [editor]);

  // Reference:
  // https://tiptap.dev/installation/react
  // https://github.com/ueberdosis/tiptap
  // https://tiptap.dev/guide/output/#option-3-yjs
  return <EditorContent {...props.slots?.root} editor={editor} />;
});

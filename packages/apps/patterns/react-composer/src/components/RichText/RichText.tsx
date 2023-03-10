//
// Copyright 2022 DXOS.org
//
import { mergeAttributes } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Placeholder from '@tiptap/extension-placeholder';
import { Editor, EditorContent, useEditor as useNaturalEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { ComponentProps, forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';

import type { Text } from '@dxos/client';
import { log } from '@dxos/log';
import { mx } from '@dxos/react-components';

import {
  blockquote,
  bold,
  code,
  codeBlock,
  heading,
  HeadingLevel,
  horizontalRule,
  italic,
  listItem,
  orderedList,
  paragraph,
  strikethrough,
  unorderedList
} from '../../styles';

export type TipTapEditor = Editor;

export type RichTextComposerSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
    spellCheck?: boolean;
    tabIndex?: number;
  };
};

type UseEditorOptions = {
  text?: Text;
  field?: string;
  placeholder?: string;
  slots?: Pick<RichTextComposerSlots, 'editor'>;
};

const onDocUpdate = (update: Uint8Array) => {
  log.debug('[doc update]', update);
};

const useEditor = ({ text, field = 'content', placeholder = 'Enter text…', slots = {} }: UseEditorOptions) => {
  useEffect(() => {
    log.debug('[text.doc]', 'referential change');
    text?.doc?.on('update', onDocUpdate);
    return () => text?.doc?.off('update', onDocUpdate);
  }, [text?.doc]);

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        // Extensions
        history: false,
        // Nodes
        blockquote: {
          HTMLAttributes: {
            class: blockquote
          }
        },
        bulletList: {
          HTMLAttributes: {
            class: unorderedList
          }
        },
        codeBlock: {
          HTMLAttributes: {
            class: codeBlock
          }
        },
        heading: false, // (thure): `StarterKit` doesn’t let you configure how headings are rendered, see `Heading` below.
        horizontalRule: {
          HTMLAttributes: {
            class: horizontalRule
          }
        },
        listItem: false, // (thure): `StarterKit` doesn’t let you configure how list items are rendered, see `ListItem` below.
        orderedList: {
          HTMLAttributes: {
            class: orderedList
          }
        },
        paragraph: {
          HTMLAttributes: {
            class: paragraph
          }
        },
        // Marks
        bold: {
          HTMLAttributes: {
            class: bold
          }
        },
        code: {
          HTMLAttributes: {
            class: code
          }
        },
        italic: {
          HTMLAttributes: {
            class: italic
          }
        },
        strike: {
          HTMLAttributes: {
            class: strikethrough
          }
        }
      }),
      Heading.extend({
        renderHTML({ node, HTMLAttributes }) {
          const hasLevel = this.options.levels.includes(node.attrs.level);
          const level: HeadingLevel = hasLevel ? node.attrs.level : this.options.levels[0];

          return [
            `h${level}`,
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
              class: heading[level]
            }),
            0
          ];
        }
      }),
      ListItem.extend({
        renderHTML: ({ HTMLAttributes }) => [
          'li',
          mergeAttributes(HTMLAttributes, {
            marker: '• ',
            class: listItem
          }),
          ['div', { role: 'none' }, 0]
        ]
      }),
      // https://github.com/ueberdosis/tiptap/tree/main/packages/extension-collaboration
      ...(text ? [Collaboration.configure({ document: text.doc, field })] : []),
      Placeholder.configure({
        placeholder,
        emptyEditorClass: 'before:content-[attr(data-placeholder)] before:absolute opacity-50 cursor-text'
      })
    ],
    [text?.doc?.guid, field]
  );

  return useNaturalEditor(
    {
      extensions,
      editorProps: {
        attributes: {
          class: mx('focus:outline-none focus-visible:outline-none', slots.editor?.className),
          spellcheck: slots.editor?.spellCheck === false ? 'false' : 'true',
          tabindex: slots?.editor?.tabIndex ? String(slots?.editor?.tabIndex) : '0'
        }
      }
    },
    [text?.doc?.guid]
  );
};

export type RichTextComposerProps = {
  text?: UseEditorOptions['text'];
  field?: UseEditorOptions['field'];
  placeholder?: UseEditorOptions['placeholder'];
  slots?: RichTextComposerSlots;
};

export const RichTextComposer = forwardRef<Editor | null, RichTextComposerProps>(
  ({ text, field, placeholder, slots = {} }, ref) => {
    const editor = useEditor({ text, field, placeholder, slots });
    useImperativeHandle<Editor | null, Editor | null>(ref, () => editor, [editor]);

    // Reference:
    // https://tiptap.dev/installation/react
    // https://github.com/ueberdosis/tiptap
    // https://tiptap.dev/guide/output/#option-3-yjs
    return <EditorContent {...slots?.root} editor={editor} />;
  }
);

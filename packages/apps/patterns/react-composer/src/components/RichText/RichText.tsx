//
// Copyright 2022 DXOS.org
//
import { mergeAttributes } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, EditorContentProps, useEditor as useNaturalEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { ComponentProps, useEffect, useMemo } from 'react';

import type { Text } from '@dxos/client';
import { log } from '@dxos/log';
import { mx } from '@dxos/react-components';

export type RichTextComposerSlots = {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
};

export type RichTextComposerProps = {
  editor: EditorContentProps['editor'];
  slots?: RichTextComposerSlots;
};

export const RichTextComposer = ({ editor, slots = {} }: RichTextComposerProps) => {
  // Reference:
  // https://tiptap.dev/installation/react
  // https://github.com/ueberdosis/tiptap
  // https://tiptap.dev/guide/output/#option-3-yjs
  return <EditorContent {...slots?.root} editor={editor} />;
};

export type UseEditorOptions = {
  text?: Text;
  field?: string;
  placeholder?: string;
  slots?: {
    editor?: {
      className?: string;
      spellCheck?: boolean;
      tabIndex?: number;
    };
  };
};

type Levels = 1 | 2 | 3 | 4 | 5 | 6;

const headingClassNames: Record<Levels, string> = {
  1: 'mbs-4 mbe-2 text-4xl font-semibold',
  2: 'mbs-4 mbe-2 text-3xl font-bold',
  3: 'mbs-4 mbe-2 text-2xl font-bold',
  4: 'mbs-4 mbe-2 text-xl font-extrabold',
  5: 'mbs-4 mbe-2 text-lg font-extrabold',
  6: 'mbs-4 mbe-2 font-black'
};

const onDocUpdate = (update: Uint8Array) => {
  log.debug('[doc update]', update);
};

export const useEditor = ({ text, field = 'content', placeholder = 'Enter text…', slots = {} }: UseEditorOptions) => {
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
            class: 'mlb-2 border-is-4 border-neutral-500/50 pis-5'
          }
        },
        bulletList: {
          HTMLAttributes: {
            class:
              // todo (thure): Tailwind was not seeing `[&>li:before]:content-["•"]` as a utility class, but it would work if instead of `"•"` it was `"X"`… why?
              'mlb-2 grid grid-cols-[min-content_1fr] [&>li:before]:content-[attr(marker)] [&>li:before]:mlb-1 [&>li:before]:mie-2'
          }
        },
        codeBlock: {
          HTMLAttributes: {
            class: 'mlb-2 font-mono bg-neutral-500/10 p-3 rounded'
          }
        },
        heading: false, // (thure): `StarterKit` doesn’t let you configure how headings are rendered, see `Heading` below.
        horizontalRule: {
          HTMLAttributes: {
            class: 'mlb-4 border-neutral-500/50'
          }
        },
        listItem: false, // (thure): `StarterKit` doesn’t let you configure how list items are rendered, see `ListItem` below.
        orderedList: {
          HTMLAttributes: {
            class:
              'mlb-2 grid grid-cols-[min-content_1fr]  [&>li:before]:content-[counters(section,_".")_"._"] [counter-reset:section] [&>li:before]:mlb-1'
          }
        },
        paragraph: {
          HTMLAttributes: {
            class: 'mlb-1'
          }
        },
        // Marks
        bold: {
          HTMLAttributes: {
            class: 'font-bold'
          }
        },
        code: {
          HTMLAttributes: {
            class: 'font-mono bg-neutral-500/10 rounded pli-1.5 mli-0.5 plb-0.5 -mlb-0.5'
          }
        },
        italic: {
          HTMLAttributes: {
            class: 'italic'
          }
        },
        strike: {
          HTMLAttributes: {
            class: 'line-through'
          }
        }
      }),
      Heading.extend({
        renderHTML({ node, HTMLAttributes }) {
          const hasLevel = this.options.levels.includes(node.attrs.level);
          const level: Levels = hasLevel ? node.attrs.level : this.options.levels[0];

          return [
            `h${level}`,
            mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
              class: headingClassNames[level]
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
            class: 'contents before:[counter-increment:section]'
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

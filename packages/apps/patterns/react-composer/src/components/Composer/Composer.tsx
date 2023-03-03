//
// Copyright 2022 DXOS.org
//

import { mergeAttributes } from '@tiptap/core';
import Collaboration from '@tiptap/extension-collaboration';
import Heading from '@tiptap/extension-heading';
import ListItem from '@tiptap/extension-list-item';
import Placeholder from '@tiptap/extension-placeholder';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import React, { ComponentProps } from 'react';

import type { Text } from '@dxos/client';
import { useTranslation, mx } from '@dxos/react-components';

export interface ComposerSlots {
  root?: Omit<ComponentProps<'div'>, 'ref'>;
  editor?: {
    className?: string;
    spellCheck?: boolean;
    tabIndex?: number;
  };
}

export interface ComposerProps {
  document: Text;
  field?: string;
  placeholder?: string;
  slots?: ComposerSlots;
}

type Levels = 1 | 2 | 3 | 4 | 5 | 6;

const headingClassNames: Record<Levels, string> = {
  1: 'mbs-4 mbe-2 text-4xl font-semibold',
  2: 'mbs-4 mbe-2 text-3xl font-semibold',
  3: 'mbs-4 mbe-2 text-2xl font-bold',
  4: 'mbs-4 mbe-2 text-xl font-bold',
  5: 'mbs-4 mbe-2 text-lg font-extrabold',
  6: 'mbs-4 mbe-2 font-extrabold'
};

export const Composer = ({ document, field = 'content', placeholder, slots = {} }: ComposerProps) => {
  // TODO(wittjosiah): Provide own translations?
  //   Maybe default is not translated and translated placeholder can be provided by the app.
  const { t } = useTranslation('appkit');

  // Reference:
  // https://tiptap.dev/installation/react
  // https://github.com/ueberdosis/tiptap
  // https://tiptap.dev/guide/output/#option-3-yjs
  const editor = useEditor(
    {
      extensions: [
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
        Collaboration.configure({ document: document.doc!, field }),
        Placeholder.configure({
          placeholder: placeholder ?? t('composer placeholder'),
          emptyEditorClass: 'before:content-[attr(data-placeholder)] before:absolute opacity-50 cursor-text'
        })
      ],
      editorProps: {
        attributes: {
          class: mx('focus:outline-none focus-visible:outline-none', slots.editor?.className),
          spellcheck: slots.editor?.spellCheck === false ? 'false' : 'true',
          tabindex: slots?.editor?.tabIndex ? String(slots?.editor?.tabIndex) : '0'
        }
      }
    },
    [document, document?.doc]
  );

  return <EditorContent {...slots?.root} editor={editor} />;
};

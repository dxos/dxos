//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type SlideTokenKind, slideTokens } from '#markdown';

const marks: Record<SlideTokenKind, Decoration> = {
  'frontmatter': Decoration.mark({ class: 'cm-slide-frontmatter' }),
  'frontmatter-delimiter': Decoration.mark({ class: 'cm-slide-frontmatter-delimiter' }),
  'frontmatter-key': Decoration.mark({ class: 'cm-slide-frontmatter-key' }),
  'slot': Decoration.mark({ class: 'cm-slide-slot' }),
  'tag': Decoration.mark({ class: 'cm-slide-tag' }),
  'tag-attribute': Decoration.mark({ class: 'cm-slide-tag-attribute' }),
  'embed': Decoration.mark({ class: 'cm-slide-embed' }),
  'notes': Decoration.mark({ class: 'cm-slide-notes' }),
};

// A slide is short, so the whole document is re-tokenized on each change rather than tracking visible ranges.
const decorate = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to, kind } of slideTokens(view.state.doc.toString())) {
    if (to > from) {
      builder.add(from, to, marks[kind]);
    }
  }
  return builder.finish();
};

/**
 * Highlights what the slide DSL adds to markdown: the frontmatter (its delimiters and keys), `::slot::` markers,
 * click and `Surface` tags (and their attribute names), object embeds, and the speaker notes.
 */
export const slideHighlight = (): Extension => [
  ViewPlugin.fromClass(
    class {
      decorations: DecorationSet;

      constructor(view: EditorView) {
        this.decorations = decorate(view);
      }

      update(update: ViewUpdate) {
        if (update.docChanged) {
          this.decorations = decorate(update.view);
        }
      }
    },
    { decorations: (plugin) => plugin.decorations },
  ),
  EditorView.baseTheme({
    // DSL markup is code, not prose, so it reads in the code font (the notes stay prose); descendants too, since the
    // markdown highlighter wraps the same text in spans that set their own font.
    '.cm-slide-frontmatter, .cm-slide-frontmatter *, .cm-slide-slot, .cm-slide-slot *, .cm-slide-tag, .cm-slide-tag *, .cm-slide-embed, .cm-slide-embed *':
      { fontFamily: 'var(--font-mono)' },
    '.cm-slide-frontmatter': { color: 'var(--color-fg-muted)' },
    '.cm-slide-frontmatter-delimiter': { color: 'var(--color-fg-subtle)' },
    '.cm-slide-frontmatter-key': { color: 'var(--color-accent-text)' },
    '.cm-slide-slot': {
      color: 'var(--color-accent-text)',
      backgroundColor: 'var(--color-hover-surface-subtle)',
      borderRadius: '2px',
    },
    '.cm-slide-tag': { color: 'var(--color-info-text)' },
    '.cm-slide-tag-attribute': { color: 'var(--color-accent-text)' },
    '.cm-slide-embed': { color: 'var(--color-success-text)' },
    '.cm-slide-notes': { color: 'var(--color-fg-subtle)', fontStyle: 'italic' },
  }),
];

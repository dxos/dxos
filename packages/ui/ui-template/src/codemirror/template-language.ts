//
// Copyright 2026 DXOS.org
//

//
// CodeMirror support for the template grammar: XML syntax plus this language's rules.
//
// The base grammar comes from `@codemirror/lang-xml`; what is added here is the part XML cannot
// know — which tags exist, and what the three attribute prefixes mean. Deliberately in its own
// subpath so the model stays free of editor dependencies.
//

import { xml } from '@codemirror/lang-xml';
import { syntaxTree } from '@codemirror/language';
import { type Diagnostic, linter } from '@codemirror/lint';
import { type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from '@codemirror/view';

import { type Tag, TAGS } from '../model.ts';
import { TemplateParseError, parse } from '../parser.ts';

/**
 * Completions for the closed tag set, so the editor offers the vocabulary rather than leaving the
 * author to remember it.
 */
const elements = TAGS.map((tag) => ({ name: tag }));

const isKnownTag = (name: string): name is Tag => (TAGS as readonly string[]).includes(name);

/**
 * Live diagnostics from the real parser, rather than a second implementation that can disagree
 * with it. An unknown tag is reported where it appears, which is what makes a closed vocabulary
 * usable rather than merely strict (ONTOLOGY R-8).
 */
const templateLinter = linter((view): Diagnostic[] => {
  const source = view.state.doc.toString();
  if (!source.trim()) {
    return [];
  }

  try {
    parse(source);
    return [];
  } catch (err) {
    if (!(err instanceof TemplateParseError)) {
      return [{ from: 0, to: source.length, severity: 'error', message: String(err) }];
    }

    // The parser reports the offset of the offending tag; widen to the end of that tag so the
    // squiggle covers something the author can see.
    const from = Math.min(err.position ?? 0, source.length);
    const close = source.indexOf('>', from);
    return [
      {
        from,
        to: close === -1 ? source.length : close + 1,
        severity: 'error',
        message: err.message,
      },
    ];
  }
});

//
// Semantic decoration.
//
// XML sees one kind of tag and one kind of attribute. This language has a closed tag set and four
// attribute families, and which family an attribute belongs to is the single most important thing
// to read off a template — a `data-` reads, an `on-` writes.
//

// Theme utility classes, not an editor theme block: the palette is the app's, and an invented
// `--dx-*` variable would silently resolve to nothing.
const marks = {
  data: Decoration.mark({ class: 'text-accent-text' }),
  item: Decoration.mark({ class: 'text-accent-text italic' }),
  event: Decoration.mark({ class: 'text-success-text font-medium' }),
  unknown: Decoration.mark({ class: 'text-error-text underline decoration-wavy' }),
};

const familyOf = (name: string): 'data' | 'item' | 'event' | undefined =>
  name.startsWith('data-') ? 'data' : name.startsWith('item-') ? 'item' : name.startsWith('on-') ? 'event' : undefined;

const decorate = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        const text = view.state.doc.sliceString(node.from, node.to);
        if (node.name === 'AttributeName') {
          const family = familyOf(text);
          if (family) {
            builder.add(node.from, node.to, marks[family]);
          }
        } else if (node.name === 'TagName' && !isKnownTag(text)) {
          // Marked as well as linted: the squiggle says something is wrong, the strike says the
          // vocabulary is closed and this word is not in it.
          builder.add(node.from, node.to, marks.unknown);
        }
      },
    });
  }
  return builder.finish();
};

const semanticDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorate(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = decorate(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

export type TemplateLanguageOptions = {
  /** Report parse errors as diagnostics. Default `true`. */
  lint?: boolean;
};

/** XML, extended with the template grammar: tag completions, live diagnostics, semantic colouring. */
export const templateLanguage = ({ lint = true }: TemplateLanguageOptions = {}): Extension[] => [
  xml({ elements }),
  semanticDecorations,
  ...(lint ? [templateLinter] : []),
];

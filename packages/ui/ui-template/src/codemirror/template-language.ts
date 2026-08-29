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

import { TAGS } from '../model';
import { TemplateParseError, parse } from '../parser';

/**
 * Completions for the closed tag set, so the editor offers the vocabulary rather than leaving the
 * author to remember it.
 */
const elements = TAGS.map((tag) => ({ name: tag }));

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
// Attribute-family decoration.
//
// XML sees one kind of attribute. This language has four, and which family an attribute belongs to
// is the single most important thing to read off a template — a `data-` reads, an `on-` writes.
//

const familyMark = {
  data: Decoration.mark({ class: 'cm-template-data' }),
  item: Decoration.mark({ class: 'cm-template-item' }),
  event: Decoration.mark({ class: 'cm-template-event' }),
};

const familyOf = (name: string): keyof typeof familyMark | undefined =>
  name.startsWith('data-') ? 'data' : name.startsWith('item-') ? 'item' : name.startsWith('on-') ? 'event' : undefined;

const decorateFamilies = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    syntaxTree(view.state).iterate({
      from,
      to,
      enter: (node) => {
        if (node.name !== 'AttributeName') {
          return;
        }
        const family = familyOf(view.state.doc.sliceString(node.from, node.to));
        if (family) {
          builder.add(node.from, node.to, familyMark[family]);
        }
      },
    });
  }
  return builder.finish();
};

const familyDecorations = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = decorateFamilies(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = decorateFamilies(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// Theme tokens rather than literal colours, so the editor follows light/dark with everything else.
const familyTheme = EditorView.theme({
  '.cm-template-data': { color: 'var(--dx-accentText)' },
  '.cm-template-item': { color: 'var(--dx-accentText)', fontStyle: 'italic' },
  '.cm-template-event': { color: 'var(--dx-successText)', fontWeight: '500' },
});

export type TemplateLanguageOptions = {
  /** Report parse errors as diagnostics. Default `true`. */
  lint?: boolean;
};

/** XML, extended with the template grammar: tag completions, live diagnostics, family colouring. */
export const templateLanguage = ({ lint = true }: TemplateLanguageOptions = {}): Extension[] => [
  xml({ elements }),
  familyDecorations,
  familyTheme,
  ...(lint ? [templateLinter] : []),
];

//
// Copyright 2026 DXOS.org
//

import { type Extension, RangeSetBuilder, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

export type Pattern = { pattern: RegExp; classNames: string };

/**
 * Replaces matched spans with the first capture group from each pattern.
 */
export const replacePatterns = (patterns: Pattern[]): Extension => {
  const buildDecorations = (text: string): DecorationSet => {
    const builder = new RangeSetBuilder<Decoration>();
    for (const { from, to, text: replacementText, classNames } of computePatternReplacements(text, patterns)) {
      builder.add(from, to, Decoration.replace({ widget: new ReplacementTextWidget(replacementText, classNames) }));
    }

    return builder.finish();
  };

  return StateField.define<DecorationSet>({
    create: (state) => buildDecorations(state.doc.toString()),
    update: (decorations, transaction) =>
      transaction.docChanged ? buildDecorations(transaction.state.doc.toString()) : decorations,
    provide: (field) => EditorView.decorations.from(field),
  });
};

class ReplacementTextWidget extends WidgetType {
  constructor(
    private readonly text: string,
    private readonly classNames: string,
  ) {
    super();
  }

  override eq(other: ReplacementTextWidget) {
    return other.text === this.text;
  }

  override toDOM() {
    const span = document.createElement('span');
    span.className = this.classNames;
    span.textContent = this.text;
    return span;
  }
}

const globalRegexp = (pattern: RegExp): RegExp =>
  pattern.global ? pattern : new RegExp(pattern.source, `${pattern.flags}g`);

export type PatternReplacement = { from: number; to: number; text: string; classNames: string };

/**
 * Finds document spans to replace. Each pattern must include a capture group for the visible text.
 */
export const computePatternReplacements = (text: string, patterns: Pattern[]): PatternReplacement[] => {
  const replacements: PatternReplacement[] = [];
  for (const { pattern, classNames } of patterns) {
    for (const match of text.matchAll(globalRegexp(pattern))) {
      const replacement = match[1];
      if (replacement === undefined || match.index === undefined) {
        continue;
      }
      replacements.push({
        from: match.index,
        to: match.index + match[0].length,
        text: replacement,
        classNames,
      });
    }
  }

  replacements.sort((left, right) => left.from - right.from);

  const result: PatternReplacement[] = [];
  let lastTo = 0;
  for (const replacement of replacements) {
    if (replacement.from >= replacement.to || replacement.from < lastTo) {
      continue;
    }
    result.push(replacement);
    lastTo = replacement.to;
  }

  return result;
};

//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { type ReviewModel, STATUS_STYLE, type Verdict, type VerdictStatus } from '../SpecModel/index.ts';

/** A block declaration line, `feat F-1: …`, `  req F-1.2: …` or `type Scene`, captured as its id. */
const DECLARATION = /^\s*[a-z]+\s+([A-Za-z][\w.-]*)\s*(?::|$)/;

const CHIP_CLASSES: Record<VerdictStatus, string> = {
  done: 'bg-success-surface text-success-text',
  untested: 'bg-info-surface text-info-text',
  partial: 'bg-warning-surface text-warning-text',
  diverged: 'bg-orange-surface text-orange-text',
  missing: 'bg-error-surface text-error-text',
};

class VerdictWidget extends WidgetType {
  constructor(
    readonly verdict: Verdict,
    readonly onSelect?: (id: string) => void,
  ) {
    super();
  }

  override eq(other: VerdictWidget): boolean {
    return (
      other.verdict.id === this.verdict.id &&
      other.verdict.status === this.verdict.status &&
      other.verdict.note === this.verdict.note
    );
  }

  override toDOM(): HTMLElement {
    const { id, status, summary, note } = this.verdict;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.title = [`${STATUS_STYLE[status].label}: ${summary ?? id}`, note].filter(Boolean).join('\n\n');
    chip.dataset.verdict = id;
    chip.dataset.status = status;
    chip.dataset.testid = 'spec-review.gutter-chip';
    // Floated into the right margin, beside the decision chips, so the annotated line's text does not move.
    chip.className = `float-right ms-2 px-1.5 rounded-sm text-xs leading-5 select-none cursor-pointer ${CHIP_CLASSES[status]}`;
    chip.textContent = STATUS_STYLE[status].label;
    chip.addEventListener('click', () => this.onSelect?.(id));
    return chip;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

const buildDecorations = (
  state: EditorState,
  byId: Map<string, Verdict>,
  onSelect?: (id: string) => void,
): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const seen = new Set<string>();
  for (let number = 1; number <= state.doc.lines; number++) {
    const line = state.doc.line(number);
    const id = DECLARATION.exec(line.text)?.[1];
    const verdict = id && !seen.has(id) ? byId.get(id) : undefined;
    if (verdict) {
      // The first declaration wins; later mentions (a changelog's `affects:`) are not the item itself.
      seen.add(verdict.id);
      // Line decorations sort before widgets at the same position, and the builder requires sorted input.
      builder.add(line.from, line.from, Decoration.line({ class: `dx-review-${verdict.status}` }));
      builder.add(line.from, line.from, Decoration.widget({ widget: new VerdictWidget(verdict, onSelect), side: -1 }));
    }
  }
  return builder.finish();
};

/** Marks each reviewed spec item's declaration line with its verdict; a chip selects the verdict. */
export const reviewGutter = (review: ReviewModel, onSelect?: (id: string) => void): Extension => {
  const byId = new Map(review.verdicts.map((verdict) => [verdict.id, verdict]));
  return [
    EditorView.decorations.compute(['doc'], (state) => buildDecorations(state, byId, onSelect)),
    EditorView.theme({
      '.dx-review-done': { boxShadow: 'inset 3px 0 0 var(--color-success-text, #16a34a)' },
      '.dx-review-untested': { boxShadow: 'inset 3px 0 0 var(--color-info-text, #2563eb)' },
      '.dx-review-partial': { boxShadow: 'inset 3px 0 0 var(--color-warning-text, #d97706)' },
      '.dx-review-diverged': { boxShadow: 'inset 3px 0 0 var(--color-orange-text, #ea580c)' },
      '.dx-review-missing': { boxShadow: 'inset 3px 0 0 var(--color-error-text, #dc2626)' },
    }),
  ];
};

//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, WidgetType } from '@codemirror/view';

import { type SourceKey, formatSourceKey } from '#sync';

import {
  type Annotation,
  type ReviewModel,
  STATUS_STYLE,
  type Verdict,
  reviewAnnotations,
} from '../SpecModel/index.ts';

/** A block declaration line, `feat F-1: …`, `  req F-1.2: …` or `type Scene`, captured as its kind and id. */
const DECLARATION = /^\s*([a-z]+)\s+([A-Za-z][\w.-]*)\s*(?::|$)/;

/** Kinds that describe behaviour to exercise, so a review judges whether automation runs them (`lang/review.mdl`). */
const EXERCISE_KINDS = new Set(['scenario', 'test']);

const EXERCISE_LABEL: Record<Verdict['status'], { text: string; hue: string } | undefined> = {
  done: { text: 'exercised', hue: 'success' },
  partial: { text: 'partly exercised', hue: 'warning' },
  diverged: { text: 'partly exercised', hue: 'warning' },
  missing: { text: 'not exercised', hue: 'error' },
  untested: { text: 'not exercised', hue: 'error' },
};

/** More code chips than this collapse into a `+n` chip whose tooltip lists the rest. */
const MAX_CODE_CHIPS = 3;

const labelOf = (key: SourceKey): string => key.fragment ?? key.path.split('/').pop() ?? key.path;

export type ReviewGutterCallbacks = {
  /** A status chip selects the item's verdict. */
  onSelect?: (id: string) => void;
  /** A code or test chip opens the file at its symbol. */
  onOpen?: (key: SourceKey) => void;
};

const keysEqual = (left: readonly SourceKey[] = [], right: readonly SourceKey[] = []): boolean =>
  left.map((key) => formatSourceKey(key)).join() === right.map((key) => formatSourceKey(key)).join();

class ReviewWidget extends WidgetType {
  constructor(
    readonly verdict: Verdict,
    readonly annotation: Annotation | undefined,
    readonly exercise: boolean,
    readonly callbacks: ReviewGutterCallbacks,
  ) {
    super();
  }

  override eq(other: ReviewWidget): boolean {
    return (
      other.exercise === this.exercise &&
      other.verdict.id === this.verdict.id &&
      other.verdict.status === this.verdict.status &&
      other.verdict.note === this.verdict.note &&
      other.annotation?.testing === this.annotation?.testing &&
      keysEqual(other.annotation?.keys, this.annotation?.keys) &&
      keysEqual(other.annotation?.tests, this.annotation?.tests)
    );
  }

  override toDOM(): HTMLElement {
    const { id, status, summary, note } = this.verdict;
    const { onSelect, onOpen } = this.callbacks;
    // Floated into the right margin, beside the decision chips, so the annotated line's text does not move.
    const row = document.createElement('span');
    row.className = 'float-right flex flex-wrap justify-end gap-1 ms-2 select-none';
    row.dataset.testid = 'spec-review.chips';
    row.dataset.verdict = id;

    const tag = (text: string, hue: string, title: string, testId: string, onClick?: () => void) => {
      const element = document.createElement(onClick ? 'button' : 'span');
      element.className = `dx-tag dx-tag-inline${onClick ? ' cursor-pointer' : ''}`;
      element.dataset.hue = hue;
      element.dataset.testid = testId;
      element.title = title;
      element.textContent = text;
      if (onClick) {
        element.setAttribute('type', 'button');
        element.addEventListener('click', onClick);
      }
      row.appendChild(element);
      return element;
    };

    const statusTag = tag(
      STATUS_STYLE[status].label,
      STATUS_STYLE[status].hue,
      [`${STATUS_STYLE[status].label}: ${summary ?? id}`, note].filter(Boolean).join('\n\n'),
      'spec-review.gutter-chip',
      () => onSelect?.(id),
    );
    statusTag.dataset.status = status;

    const codeChips = (keys: readonly SourceKey[], hue: string, testId: string) => {
      keys
        .slice(0, MAX_CODE_CHIPS)
        .forEach((key) => tag(`</> ${labelOf(key)}`, hue, formatSourceKey(key), testId, () => onOpen?.(key)));
      const rest = keys.slice(MAX_CODE_CHIPS);
      if (rest.length > 0) {
        tag(`+${rest.length}`, hue, rest.map((key) => formatSourceKey(key)).join('\n'), testId, () =>
          onOpen?.(rest[0]),
        );
      }
    };

    const keys = this.annotation?.keys ?? [];
    const tests = this.annotation?.tests ?? [];
    if (this.exercise) {
      // A scenario or test is judged on whether automation runs it: the tests that do, then the code they drive.
      codeChips(tests, 'teal', 'spec-review.test-chip');
      codeChips(keys, 'amber', 'spec-editor.implementation-chip');
      const label = EXERCISE_LABEL[status];
      if (label) {
        tag(label.text, label.hue, note ?? label.text, 'spec-review.exercised').dataset.exercised = status;
      }
      return row;
    }

    // Whether code covers the item: links to it, or a plain "no code" tag.
    if (keys.length === 0) {
      tag('no code', 'neutral', 'The review found no code for this item.', 'spec-review.no-code');
    } else {
      codeChips(keys, 'amber', 'spec-editor.implementation-chip');
    }

    const testing = this.annotation?.testing;
    if (testing) {
      tag(
        testing,
        testing === 'tested' ? 'success' : 'warning',
        tests.length > 0
          ? tests.map((key) => formatSourceKey(key)).join('\n')
          : testing === 'tested'
            ? 'Tested: the review judged the item done.'
            : 'No test exercises this item.',
        'spec-review.testing',
        tests.length > 0 ? () => onOpen?.(tests[0]) : undefined,
      ).dataset.testing = testing;
    }
    return row;
  }

  override ignoreEvent(): boolean {
    return false;
  }
}

const buildDecorations = (
  state: EditorState,
  verdicts: Map<string, Verdict>,
  annotations: Map<string, Annotation>,
  callbacks: ReviewGutterCallbacks,
): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const seen = new Set<string>();
  for (let number = 1; number <= state.doc.lines; number++) {
    const line = state.doc.line(number);
    const [, kind, id] = DECLARATION.exec(line.text) ?? [];
    const verdict = id && !seen.has(id) ? verdicts.get(id) : undefined;
    if (verdict) {
      // The first declaration wins; later mentions (a changelog's `affects:`) are not the item itself.
      seen.add(verdict.id);
      // Line decorations sort before widgets at the same position, and the builder requires sorted input.
      builder.add(line.from, line.from, Decoration.line({ class: `dx-review-${verdict.status}` }));
      builder.add(
        line.from,
        line.from,
        Decoration.widget({
          widget: new ReviewWidget(verdict, annotations.get(verdict.id), EXERCISE_KINDS.has(kind), callbacks),
          side: -1,
        }),
      );
    }
  }
  return builder.finish();
};

/**
 * Marks each reviewed spec item's declaration line with its verdict, the code that implements it and whether tests
 * exercise it. These come from the review, not the spec text, so they render as decorations like the decision chips.
 */
export const reviewGutter = (review: ReviewModel, callbacks: ReviewGutterCallbacks = {}): Extension => {
  const verdicts = new Map(review.verdicts.map((verdict) => [verdict.id, verdict]));
  const annotations = new Map(reviewAnnotations(review).map((annotation) => [annotation.id, annotation]));
  return [
    EditorView.decorations.compute(['doc'], (state) => buildDecorations(state, verdicts, annotations, callbacks)),
    EditorView.theme({
      '.dx-review-done': { boxShadow: 'inset 3px 0 0 var(--color-success-text, #16a34a)' },
      '.dx-review-untested': { boxShadow: 'inset 3px 0 0 var(--color-info-text, #2563eb)' },
      '.dx-review-partial': { boxShadow: 'inset 3px 0 0 var(--color-warning-text, #d97706)' },
      '.dx-review-diverged': { boxShadow: 'inset 3px 0 0 var(--color-orange-text, #ea580c)' },
      '.dx-review-missing': { boxShadow: 'inset 3px 0 0 var(--color-error-text, #dc2626)' },
    }),
  ];
};

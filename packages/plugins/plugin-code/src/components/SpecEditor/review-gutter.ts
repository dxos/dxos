//
// Copyright 2026 DXOS.org
//

import { type EditorState, type Extension, RangeSetBuilder, StateEffect, StateField } from '@codemirror/state';
import { Decoration, type DecorationSet, EditorView, type Tooltip, WidgetType, showTooltip } from '@codemirror/view';

import { type SourceKey, formatSourceKey } from '#sync';

import {
  type Annotation,
  type ReviewModel,
  STATUS_STYLE,
  type Verdict,
  reviewAnnotations,
  walkthroughOf,
} from '../SpecModel/index.ts';
import { type SourceReader, snippetCard, walkthroughCard } from './snippet-card.ts';

/** A block declaration line, `feat F-1: …`, `  req F-1.2: …` or `type Scene`, captured as its kind and id. */
const DECLARATION = /^\s*([a-z]+)\s+([A-Za-z][\w.-]*)\s*(?::|$)/;

/** Kinds that describe behaviour to exercise, so a review judges whether automation runs them (`lang/review.mdl`). */
const EXERCISE_KINDS = new Set(['scenario', 'test']);

const EXERCISE_LABEL: Record<Verdict['status'], { text: string; hue: string } | undefined> = {
  done: { text: 'tested', hue: 'success' },
  partial: { text: 'partly tested', hue: 'warning' },
  diverged: { text: 'partly tested', hue: 'warning' },
  missing: { text: 'not tested', hue: 'error' },
  untested: { text: 'not tested', hue: 'error' },
};

/** How long a hover card stays after the pointer leaves its chip, so the pointer can move onto the card. */
const HIDE_DELAY = 200;

type HoverCard = { chip: HTMLElement; render: () => HTMLElement };

const setHoverCard = StateEffect.define<HoverCard | null>();

/** The one hover card a chip opens, anchored to the chip rather than to a document position. */
const hoverCardField = StateField.define<Tooltip | null>({
  create: () => null,
  update: (value, transaction) => {
    for (const effect of transaction.effects) {
      if (effect.is(setHoverCard)) {
        const card = effect.value;
        return card
          ? {
              pos: 0,
              above: true,
              // Measured on every reposition, so the card follows its chip when the editor scrolls.
              getCoords: () => card.chip.getBoundingClientRect(),
              create: () => ({ dom: card.render() }),
            }
          : null;
      }
    }
    return value;
  },
  provide: (field) => showTooltip.from(field),
});

/** More code chips than this collapse into a `+n` chip whose tooltip lists the rest. */
const MAX_CODE_CHIPS = 3;

const labelOf = (key: SourceKey): string => key.fragment ?? key.path.split('/').pop() ?? key.path;

export type ReviewGutterCallbacks = {
  /** A status chip selects the item's verdict. */
  onSelect?: (id: string) => void;
  /** A code or test chip opens the file at its symbol. */
  onOpen?: (key: SourceKey) => void;
  /** The checkout's text of a file, for the declarations hover cards show. */
  read?: SourceReader;
};

/** Shows a card while the pointer is on the chip or on the card itself. */
class HoverController {
  #timer: ReturnType<typeof setTimeout> | undefined;

  attach(view: EditorView, chip: HTMLElement, render: () => HTMLElement): void {
    chip.addEventListener('mouseenter', () => {
      this.#cancel();
      view.dispatch({
        effects: setHoverCard.of({
          chip,
          render: () => {
            const dom = render();
            dom.addEventListener('mouseenter', () => this.#cancel());
            dom.addEventListener('mouseleave', () => this.#hide(view));
            return dom;
          },
        }),
      });
    });
    chip.addEventListener('mouseleave', () => this.#hide(view));
  }

  #cancel(): void {
    clearTimeout(this.#timer);
  }

  #hide(view: EditorView): void {
    this.#cancel();
    this.#timer = setTimeout(() => view.dispatch({ effects: setHoverCard.of(null) }), HIDE_DELAY);
  }
}

const keysEqual = (left: readonly SourceKey[] = [], right: readonly SourceKey[] = []): boolean =>
  left.map((key) => formatSourceKey(key)).join() === right.map((key) => formatSourceKey(key)).join();

class ReviewWidget extends WidgetType {
  constructor(
    readonly verdict: Verdict,
    readonly annotation: Annotation | undefined,
    readonly exercise: boolean,
    readonly callbacks: ReviewGutterCallbacks,
    readonly hover: HoverController,
  ) {
    super();
  }

  override eq(other: ReviewWidget): boolean {
    return (
      other.callbacks === this.callbacks &&
      other.exercise === this.exercise &&
      other.verdict.id === this.verdict.id &&
      other.verdict.status === this.verdict.status &&
      other.verdict.summary === this.verdict.summary &&
      other.verdict.note === this.verdict.note &&
      other.verdict.walkthrough === this.verdict.walkthrough &&
      other.annotation?.testing === this.annotation?.testing &&
      keysEqual(other.annotation?.keys, this.annotation?.keys) &&
      keysEqual(other.annotation?.tests, this.annotation?.tests)
    );
  }

  override toDOM(view: EditorView): HTMLElement {
    const { id, status, summary, note } = this.verdict;
    const { onSelect, onOpen, read } = this.callbacks;
    // Floated into the right margin, beside the decision chips, so the annotated line's text does not move.
    const row = document.createElement('span');
    row.className = 'float-right flex flex-wrap justify-end gap-1 ms-2 select-none';
    row.dataset.testid = 'spec-review.chips';
    row.dataset.verdict = id;

    const tag = (text: string, hue: string, title: string | undefined, testId: string, onClick?: () => void) => {
      const element = document.createElement(onClick ? 'button' : 'span');
      element.className = `dx-tag dx-tag-inline${onClick ? ' cursor-pointer' : ''}`;
      element.dataset.hue = hue;
      element.dataset.testid = testId;
      if (title) {
        element.title = title;
      }
      element.textContent = text;
      if (onClick) {
        element.setAttribute('type', 'button');
        element.addEventListener('click', onClick);
      }
      row.appendChild(element);
      return element;
    };

    // An item implemented in several places shows its walkthrough on hover; the browser tooltip would cover it.
    const steps = walkthroughOf(this.verdict);
    const statusTag = tag(
      STATUS_STYLE[status].label,
      STATUS_STYLE[status].hue,
      steps ? undefined : [`${STATUS_STYLE[status].label}: ${summary ?? id}`, note].filter(Boolean).join('\n\n'),
      'spec-review.gutter-chip',
      () => onSelect?.(id),
    );
    statusTag.dataset.status = status;
    if (steps) {
      this.hover.attach(view, statusTag, () => walkthroughCard(steps, read, onOpen));
    }

    const codeChips = (keys: readonly SourceKey[], hue: string, testId: string) => {
      keys.slice(0, MAX_CODE_CHIPS).forEach((key) => {
        const chip = tag(`</> ${labelOf(key)}`, hue, undefined, testId, () => onOpen?.(key));
        chip.dataset.key = formatSourceKey(key);
        this.hover.attach(view, chip, () => snippetCard(key, read, onOpen));
      });
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
      const chip = tag(
        testing,
        testing === 'tested' ? 'success' : 'warning',
        tests.length > 0
          ? undefined
          : testing === 'tested'
            ? 'Tested: the review judged the item done.'
            : 'No test exercises this item.',
        'spec-review.testing',
        tests.length > 0 ? () => onOpen?.(tests[0]) : undefined,
      );
      chip.dataset.testing = testing;
      if (tests.length > 0) {
        this.hover.attach(view, chip, () =>
          walkthroughCard(
            tests.map((key) => ({ text: '', key: formatSourceKey(key) })),
            read,
            onOpen,
          ),
        );
      }
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
  hover: HoverController,
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
          widget: new ReviewWidget(verdict, annotations.get(verdict.id), EXERCISE_KINDS.has(kind), callbacks, hover),
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
  const hover = new HoverController();
  return [
    hoverCardField,
    EditorView.decorations.compute(['doc'], (state) =>
      buildDecorations(state, verdicts, annotations, callbacks, hover),
    ),
    EditorView.theme({
      '.dx-review-done': { boxShadow: 'inset 3px 0 0 var(--color-success-text, #16a34a)' },
      '.dx-review-untested': { boxShadow: 'inset 3px 0 0 var(--color-info-text, #2563eb)' },
      '.dx-review-partial': { boxShadow: 'inset 3px 0 0 var(--color-warning-text, #d97706)' },
      '.dx-review-diverged': { boxShadow: 'inset 3px 0 0 var(--color-orange-text, #ea580c)' },
      '.dx-review-missing': { boxShadow: 'inset 3px 0 0 var(--color-error-text, #dc2626)' },
    }),
  ];
};

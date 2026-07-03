//
// Copyright 2026 DXOS.org
//

import { codeFolding, foldedRanges, foldEffect, unfoldEffect } from '@codemirror/language';
import { type EditorState, type Extension, RangeSetBuilder } from '@codemirror/state';
import { EditorView, GutterMarker, gutter } from '@codemirror/view';

import { Domino } from '@dxos/ui';

/**
 * Turn folding.
 *
 * Makes each turn's response a foldable region. `codeFolding` (from `@codemirror/language`) hides the
 * folded ranges and renders the placeholder, but folds are driven **only** by this extension's own
 * gutter — never through CodeMirror's `foldable()`/`foldGutter`/`foldService`. That matters because
 * `foldable()` unconditionally falls back to the language's `syntaxFolding` (markdown `foldNodeProp`
 * — headings, fenced code, …) whenever no fold service matches a line; routing folds through
 * `foldEffect` on our own ranges instead means only turns from the caller-provided {@link TurnSource}
 * can ever fold. The section model (scan text, read a tree, derive from a message array) lives with
 * the host and can change without touching the fold UI.
 *
 * Folding starts at the end of a turn's head, so the head (e.g. the user prompt) stays visible while
 * its response collapses.
 */

/** A foldable turn response. */
export type Turn = {
  /** Fold range start — the end of the head line, so the head stays visible. */
  from: number;
  /** Fold range end — the end of the response that follows the head. */
  to: number;
  /** Start offset of the head line; the gutter marker anchors here. */
  headLineFrom: number;
};

/** Yields the foldable turn ranges for a document. */
export type TurnSource = (state: EditorState) => Turn[];

export type TurnFoldingOptions = {
  /** Source of foldable ranges (e.g. scanned from text or derived from the message model). */
  source: TurnSource;
};

/** Whether `turn`'s range is currently folded. */
const isFolded = (state: EditorState, turn: Turn): boolean => {
  let folded = false;
  foldedRanges(state).between(turn.from, turn.to, (from, to) => {
    if (from <= turn.from && to >= turn.to) {
      folded = true;
    }
  });
  return folded;
};

/** Folds every turn from `source` (used for a host "collapse all"). Folds only turns, never syntax. */
export const foldTurns = (view: EditorView, source: TurnSource): void => {
  const effects = source(view.state)
    .filter((turn) => turn.to > turn.from)
    .map((turn) => foldEffect.of({ from: turn.from, to: turn.to }));
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
};

/** Unfolds every turn from `source` (used for a host "expand all"). */
export const unfoldTurns = (view: EditorView, source: TurnSource): void => {
  const effects = source(view.state).map((turn) => unfoldEffect.of({ from: turn.from, to: turn.to }));
  if (effects.length > 0) {
    view.dispatch({ effects });
  }
};

export const turnFolding = ({ source }: TurnFoldingOptions): Extension => {
  // The gutter's `markers` runs per update; memoize the per-state turn scan.
  const cache = new WeakMap<EditorState, Turn[]>();
  const turnsOf = (state: EditorState): Turn[] => {
    let turns = cache.get(state);
    if (!turns) {
      turns = source(state);
      cache.set(state, turns);
    }
    return turns;
  };

  return [
    // Hides folded ranges + renders the placeholder; folds are dispatched only by the gutter below.
    codeFolding({
      placeholderDOM: () => Domino.of('span').classNames('hidden').root,
    }),
    gutter({
      class: 'cm-turn-gutter',
      markers: (view) => {
        const builder = new RangeSetBuilder<GutterMarker>();
        for (const turn of turnsOf(view.state)) {
          builder.add(turn.headLineFrom, turn.headLineFrom, new TurnMarker(isFolded(view.state, turn)));
        }
        return builder.finish();
      },
      // A fold toggle changes neither the doc nor the viewport, so re-measure on our fold effects
      // to keep the caret direction in sync.
      lineMarkerChange: (update) =>
        update.transactions.some((tr) => tr.effects.some((effect) => effect.is(foldEffect) || effect.is(unfoldEffect))),
      domEventHandlers: {
        mousedown: (view, line) => {
          const turn = turnsOf(view.state).find((candidate) => candidate.headLineFrom === line.from);
          if (!turn) {
            return false;
          }
          const effect = isFolded(view.state, turn) ? unfoldEffect : foldEffect;
          view.dispatch({ effects: effect.of({ from: turn.from, to: turn.to }) });
          return true;
        },
      },
    }),
    EditorView.theme({
      '.cm-turn-gutter': {
        width: '1.5rem',
        color: 'var(--dx-description, currentColor)',
        opacity: '0.4',
        transition: 'opacity 0.2s',
      },
      '.cm-turn-gutter:hover': {
        opacity: '1',
      },
    }),
  ];
};

/** Gutter marker for a turn head: a caret whose direction reflects the fold state. */
class TurnMarker extends GutterMarker {
  constructor(private readonly _folded: boolean) {
    super();
  }

  override eq(other: TurnMarker): boolean {
    return this._folded === other._folded;
  }

  override toDOM(): HTMLElement {
    return Domino.of('div')
      .classNames('flex h-full items-center justify-center cursor-pointer')
      .append(
        Domino.of('svg', Domino.SVG)
          .classNames('w-4 h-4')
          .append(
            Domino.of('use', Domino.SVG).attributes({
              href: Domino.icon(this._folded ? 'ph--caret-right--regular' : 'ph--caret-down--regular'),
            }),
          ),
      ).root;
  }
}

/** Default head element: a `<prompt>…</prompt>` element (content is escaped, so it never nests). */
export const PROMPT_ELEMENT = /<prompt\b[^>]*>[\s\S]*?<\/prompt>/g;

/**
 * Builds a {@link TurnSource} that scans the document for head elements matching `element`, folding
 * the response after each — from the end of that head's line up to the next head (or the end of the
 * document), trailing whitespace trimmed. `element` selects the turn head (e.g. {@link PROMPT_ELEMENT}
 * for `<prompt>`); pass another pattern to key turns off a different tag.
 */
export const createTurnSource = (element: RegExp): TurnSource => {
  // Clone with the global flag so `exec` iterates (and never shares `lastIndex` with the caller).
  const pattern = new RegExp(element.source, element.flags.includes('g') ? element.flags : `${element.flags}g`);
  return (state) => {
    const doc = state.doc;
    const text = doc.toString();
    const heads: number[] = [];
    let match: RegExpExecArray | null;
    pattern.lastIndex = 0;
    while ((match = pattern.exec(text)) !== null) {
      heads.push(match.index, match.index + match[0].length);
    }

    const turns: Turn[] = [];
    for (let index = 0; index < heads.length; index += 2) {
      const headEnd = heads[index + 1];
      const headLine = doc.lineAt(headEnd);
      const from = headLine.to;
      const nextHeadStart = index + 2 < heads.length ? heads[index + 2] : doc.length;
      let to = nextHeadStart;
      while (to > from && /\s/.test(text[to - 1])) {
        to--;
      }
      if (to > from) {
        turns.push({ from, to, headLineFrom: headLine.from });
      }
    }
    return turns;
  };
};

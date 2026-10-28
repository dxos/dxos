//
// Copyright 2026 DXOS.org
//

//
// Labels beside a stage's objects (plugin-animator F-8.1, F-8.2): where a label sits for its style, how it fades with
// its object, and how a change of text morphs by sliding the words that differ (echo3d's `centreMorphs`). Every value
// is a function of the sample, so a frame reached by scrubbing matches playback.
//

import type * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { type Model } from '#types';

import { type ObjectState } from './stage.ts';

export type VisibleLabelStyle = Exclude<Model.LabelStyle, 'hidden'>;

/** The font size in pixels of each label style (echo3d's label classes). */
export const LABEL_SIZES: Readonly<Record<VisibleLabelStyle, number>> = { plain: 13, hero: 26, title: 46, inside: 40 };

/** The CSS font of a label style, which the label is drawn in and its words are measured in. */
export const labelFont = (style: VisibleLabelStyle): string =>
  `${style === 'plain' ? 600 : 800} ${LABEL_SIZES[style]}px sans-serif`;

/** Pixels between an object's projected edge and the bottom of a label above it. */
export const LABEL_GAP = 6;

/** A word of a label, `x` pixels from the label's centre to the word's left edge. */
export type LabelWord = { text: string; x: number; opacity: number };

/** A label laid out at one time: its words and total width. */
export type LabelLayout = { words: LabelWord[]; width: number };

/** Splits two texts into the words before, the longest run of words both share, and the words after. */
export const wordDiff = (from: string, to: string) => {
  const left = from.split(/\s+/).filter(Boolean);
  const right = to.split(/\s+/).filter(Boolean);
  // The longest common run of words, by dynamic programming over word pairs.
  let best = { length: 0, left: 0, right: 0 };
  const runs = left.map(() => right.map(() => 0));
  left.forEach((word, i) =>
    right.forEach((other, j) => {
      if (word === other) {
        const length = (i > 0 && j > 0 ? runs[i - 1][j - 1] : 0) + 1;
        runs[i][j] = length;
        if (length > best.length) {
          best = { length, left: i - length + 1, right: j - length + 1 };
        }
      }
    }),
  );
  return {
    droppedBefore: left.slice(0, best.left),
    addedBefore: right.slice(0, best.right),
    kept: left.slice(best.left, best.left + best.length),
    droppedAfter: left.slice(best.left + best.length),
    addedAfter: right.slice(best.right + best.length),
  };
};

/**
 * A label morphing from `from` to `to` at `progress` (0 to 1): words both share stay, dropped words fade out and close
 * up, added words fade in and open up, and the row stays centred, so the shared words slide into their new place.
 * `measure` gives a text's width in pixels.
 */
export const morphLayout = (
  from: string,
  to: string,
  progress: number,
  measure: (text: string) => number,
): LabelLayout => {
  const amount = Math.max(0, Math.min(1, progress));
  const diff = wordDiff(from, to);
  const space = measure(' ');
  const parts = [
    ...diff.droppedBefore.map((text) => ({ text, opacity: 1 - amount })),
    ...diff.addedBefore.map((text) => ({ text, opacity: amount })),
    ...diff.kept.map((text) => ({ text, opacity: 1 })),
    ...diff.droppedAfter.map((text) => ({ text, opacity: 1 - amount })),
    ...diff.addedAfter.map((text) => ({ text, opacity: amount })),
  ];
  // A word takes room in proportion to how visible it is, with the space after it.
  const room = parts.map((part) => (measure(part.text) + space) * part.opacity);
  const width = Math.max(0, room.reduce((sum, value) => sum + value, 0) - space);
  let cursor = -width / 2;
  const words = parts.map((part, index) => {
    const word = { text: part.text, x: cursor, opacity: part.opacity };
    cursor += room[index];
    return word;
  });
  return { words, width };
};

/** A label's text at rest: one word run with nothing fading. */
export const plainLayout = (text: string, measure: (text: string) => number): LabelLayout =>
  morphLayout(text, text, 1, measure);

/** Where a label goes for its style: across its object's centre (`inside`) or above its projected edge. */
export const labelPosition = (
  style: Model.LabelStyle,
  anchor: AnimatorCapabilities.ProjectedAnchor,
): { x: number; y: number; align: 'centre' | 'bottom' } =>
  style === 'inside'
    ? { x: anchor.x, y: anchor.y, align: 'centre' }
    : { x: anchor.x, y: anchor.y - anchor.radius - LABEL_GAP, align: 'bottom' };

/** A label fades with its object, and while its object grows from nothing it fades in with it (by `rest`, its size). */
export const labelOpacity = (state: Pick<ObjectState, 'opacity' | 'radius'>, rest: number): number =>
  state.opacity * Math.max(0, Math.min(1, rest > 0 ? state.radius / rest : 1));

/** The words a label shows at a state: its text, or its morph from `labelFrom` while `labelMorph` is below 1. */
export const labelLayout = (
  state: Pick<ObjectState, 'label' | 'labelFrom' | 'labelMorph'>,
  measure: (text: string) => number,
): LabelLayout =>
  state.labelFrom.length > 0 && state.labelMorph < 1
    ? morphLayout(state.labelFrom, state.label, state.labelMorph, measure)
    : plainLayout(state.label, measure);

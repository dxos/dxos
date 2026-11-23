//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type LayoutName } from './markdown/frontmatter.ts';

/** The footer's parts, in reading order: each holds the slide's start edge, its middle or its end edge. */
export const PARTS = ['left', 'center', 'right'] as const;

export type Part = (typeof PARTS)[number];

/**
 * A deck's footer, drawn on every slide: each part is one line of inline slide markdown — text, a link, an image, or
 * the `<SlideCurrentNo />` and `<SlidesTotal />` tags. A deck with no part set draws no footer.
 */
export const Settings = Schema.Struct({
  left: Schema.optional(
    Schema.String.annotate({ title: 'Left', description: 'Shown at the start edge of every slide.' }),
  ),
  center: Schema.optional(
    Schema.String.annotate({ title: 'Center', description: 'Shown in the middle of every slide.' }),
  ),
  right: Schema.optional(
    Schema.String.annotate({ title: 'Right', description: 'Shown at the end edge of every slide.' }),
  ),
});

export type Settings = Schema.Schema.Type<typeof Settings>;

/** True when no part holds anything to draw. */
export const isEmpty = (settings: Settings | undefined): boolean => PARTS.every((part) => !settings?.[part]?.trim());

/** Layouts that open or close a deck, which show no footer unless the slide asks for one. */
const BARE_LAYOUTS: readonly LayoutName[] = ['cover', 'end'];

/**
 * Whether a slide draws the deck's footer: its own `footer:` frontmatter decides, and a slide that says nothing
 * shows it on every layout but the ones that open or close a deck.
 */
export const shownOn = ({ footer, layout }: { footer?: boolean; layout: LayoutName }): boolean =>
  footer ?? !BARE_LAYOUTS.includes(layout);

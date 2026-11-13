//
// Copyright 2026 DXOS.org
//

//
// The deck's `card({ variant: 'compact' })` with a `feedStrip()` (studio `assets/deck/lib/components.mjs`,
// `.d-card.compact` / `.d-feed` in `deck.css`) as a canvas element kind: a Phosphor icon and a title, a row of feed
// blocks with some marked, an optional sentence of body, and a mono footer under a hairline.
//
// Sizes on the Agents slide: 300 × 138 (inbound feeds), 300 × 176 (agents), 300 × 120 (sub-agents). The type sizes
// are slide units, which is what the node's own frame is in, so the card scales with the drawing rather than with
// the page.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React, { type CSSProperties } from 'react';

import {
  CardFrame,
  type ElementKindSpec,
  IconSpec,
  type NodeViewProps,
  TextPart,
  kindData,
} from '@dxos/react-ui-canvas';
import { Scene } from '@dxos/scene';

/** A style that also sets custom properties, which `CSSProperties` alone does not allow. */
export type Styled = CSSProperties & Record<`--${string}`, string>;

/**
 * The deck's tones by name: its two emphases and the five object types (`deck.css` `--t-*`). Names rather than CSS,
 * so the field is a select rather than free text and every value resolves to a token that follows the mode — a
 * sidecar's `var(--t-trip)` is mapped to `trip` when a slide is loaded.
 */
export const TONES = ['accent', 'ink', 'event', 'message', 'file', 'trip', 'sheet'] as const;

export type Tone = (typeof TONES)[number];

const TONE_TOKENS: Record<Tone, string> = {
  accent: 'var(--sd-accent)',
  ink: 'var(--sd-fg)',
  event: 'var(--sd-t-event)',
  message: 'var(--sd-t-message)',
  file: 'var(--sd-t-file)',
  trip: 'var(--sd-t-trip)',
  sheet: 'var(--sd-t-sheet)',
};

/** The token a tone draws in; an unknown name draws nothing rather than an unresolved colour. */
export const toneValue = (tone: string | undefined): string | undefined =>
  tone === undefined ? undefined : TONE_TOKENS[tone as Tone];

/** What this kind adds to the core card, kept under `data`: its tone and its feed strip. */
export const FeedCardData = Schema.Struct({
  /** An accent drawn as the card's outline and its icon; `ink` is the agents' dark edge. */
  tone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Tone' })),
  /** How many blocks the feed strip has. */
  feed: Schema.optional(Schema.Number.annotate({ title: 'Feed blocks' })),
  /** A mono caption to the left of the strip (`feed`, `task`). */
  feedLabel: Schema.optional(Schema.String.annotate({ title: 'Feed label' })),
  /** Which blocks of the strip are filled, by 0-based index; a filled block takes the deck's accent. */
  marks: Schema.optional(Schema.Array(Schema.Number).annotate({ title: 'Marked blocks' })),
});

/**
 * The core card's own fields stay at the element's top, where the card prototype's frame reads them: its title (the
 * base's `label`), `icon`, `body` and `footer`.
 */
export const FeedCardNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('feed-card'),
  label: Schema.String,
  icon: Schema.optional(IconSpec),
  body: Schema.optional(Schema.String.annotate({ title: 'Body' })),
  footer: Schema.optional(Schema.String.annotate({ title: 'Footer' })),
  data: Schema.optional(FeedCardData),
});

type FeedStripProps = {
  n: number;
  label?: string;
  /** The 0-based indexes of the filled blocks; a filled block takes the accent, whatever the card's tone. */
  marks?: readonly number[];
  editing?: NodeViewProps['editing'];
};

const FeedStrip = ({ n, label, marks, editing }: FeedStripProps) => {
  const filled = new Set(marks ?? []);
  return (
    <div className='flex items-center shrink-0' style={{ gap: 5 }} data-testid='feed-strip'>
      {label !== undefined && (
        <TextPart
          part='data.feedLabel'
          text={label}
          editing={editing}
          classNames='studio-card-label font-mono shrink-0 text-[12px] me-[2px]'
        >
          {label}
        </TextPart>
      )}
      {Array.from({ length: n }, (_, index) => {
        return (
          <i
            key={index}
            data-marked={filled.has(index) ? true : undefined}
            className='studio-feed-block block shrink-0 rounded-[3px]'
            style={{ width: 17, height: 17 }}
          />
        );
      })}
    </div>
  );
};

export const FeedCardNodeView = ({ node, editing }: NodeViewProps) => {
  const data = kindData(FeedCardData, node);
  if (node.type !== 'feed-card' || !data) {
    return null;
  }
  const tone = toneValue(data.tone);
  const style: Styled = { padding: '12px 18px', ...(tone ? { '--sd-tone': tone } : {}) };
  return (
    <div
      className='studio-card dx-cover rounded-xl overflow-hidden'
      data-testid='feed-card-node'
      data-tone={tone ? true : undefined}
      style={style}
    >
      {/* The core card prototype's frame draws the header, body and footer and makes each a part; the feed strip is
          what this kind adds between the header and the body. */}
      <CardFrame node={node} editing={editing} classNames='studio-card-frame p-0 gap-[7px]'>
        {data.feed ? <FeedStrip n={data.feed} label={data.feedLabel} marks={data.marks} editing={editing} /> : null}
      </CardFrame>
    </div>
  );
};

export const feedCardSpec: ElementKindSpec = {
  // Five ports a side: a true middle to tie a trunk to, and room either side of it for a fan of edges
  // that converge on one card.
  portsPerSide: 5,
  // The card prototype supplies the sizing and the three text parts; this kind adds its own icon, strip and tone.
  extends: 'card',
  name: 'Feed card',
  icon: 'ph--rows--regular',
  key: 'F',
  schema: FeedCardNode,
  component: FeedCardNodeView,
  create: ({ id, z, center, size }) => ({
    type: 'feed-card',
    id,
    z,
    center,
    size,
    label: 'Feed',
    icon: { name: 'queue' },
    data: { feed: 9, marks: [] },
  }),
  // Nominal units (one unit is the major grid cell, 48px): the deck's 300 x 138 card, give or take.
  defaultSize: { width: 6, height: 3 },
  // Composite: every text of the card is edited in place, in reading order. The first is the node's main text, so
  // Enter on a selected card edits its title; Tab moves on through the strip's caption, the body and the footer.
  parts: [{ field: 'label' }, { field: 'data.feedLabel' }, { field: 'body', multiline: true }, { field: 'footer' }],
};

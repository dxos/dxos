//
// Copyright 2026 DXOS.org
//

//
// The deck's `card({ variant: 'simple' })` as a canvas element kind: a Phosphor icon, a title, a soft raised panel,
// and an optional coloured outline. `tone` is the card's own field, under its `data`, rather than `style.tone`,
// which is the hue's fill level. The look comes from the deck tokens in `theme.css`, so the card follows the
// canvas's mode.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React from 'react';

import {
  CardFrame,
  type ElementKindSpec,
  IconSpec,
  type NodeViewProps,
  TextPart,
  iconOf,
  iconSymbol,
  kindData,
} from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

import { ChipList, Chips } from './Chip.tsx';
import { type Styled, toneValue } from './FeedCard.tsx';

//
// The card kind: the deck's `.d-card.simple` — a Phosphor icon, a title, a soft raised shadow, and an optional
// coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's fill level.
//

/** What this kind adds to the core card, kept under `data`. */
export const CardData = Schema.Struct({
  /** An accent, drawn as the card's outline (`#2d6fff`). */
  tone: Schema.optional(Schema.String.annotate({ title: 'Tone' })),
  /** The glyph's own colour, with no outline on the card: what the Composer slide gives its plugin cards. */
  iconTone: Schema.optional(Schema.String.annotate({ title: 'Icon tone' })),
  /**
   * The deck's card variants: `full` (the default) and `compact` draw through the shared card frame, `simple` is the
   * one-line row of an EDGE service — icon, title, and the footer under the title with no rule over it.
   */
  variant: Schema.optional(Schema.Literals(['full', 'compact', 'simple']).annotate({ title: 'Variant' })),
  /** A row or grid of chips in the card's body: what the layer holds, or which services it runs. */
  chips: Schema.optional(ChipList.annotate({ title: 'Chips' })),
});

export const CardNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('card'),
  /** The card's title, in the core base's `label`, so it still reads where the kind is unknown. */
  label: Schema.String,
  /** The core card's glyph and its weight, at the element's top as the core card keeps it. */
  icon: Schema.optional(IconSpec),
  data: Schema.optional(CardData),
});

const CardNodeView = ({ node, editing }: NodeViewProps) => {
  const data = kindData(CardData, node);
  if (node.type !== 'card' || !data) {
    return null;
  }
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';
  const footer = 'footer' in node && typeof node.footer === 'string' ? node.footer : undefined;
  const body = 'body' in node && typeof node.body === 'string' ? node.body : undefined;
  const tone = toneValue(data.tone);
  // The glyph takes the card's tone where it has one, its own where the slide colours only the glyph.
  const glyph = tone ?? toneValue(data.iconTone);
  const symbol = iconSymbol(iconOf(node) ?? {});
  // A variable rather than a literal in the prop: a style that sets custom properties is not a fresh `CSSProperties`.
  const style: Styled = glyph ? { '--sd-tone': glyph } : {};

  // The deck's `.d-card.simple`: one row of icon and title, with the footer under the title and no rule over it.
  if (data.variant === 'simple') {
    return (
      <div
        className='studio-card studio-card-simple dx-cover flex flex-col justify-center rounded-xl overflow-hidden'
        data-testid='card-node'
        data-tone={tone ? true : undefined}
        style={style}
      >
        <div className='flex items-center min-w-0'>
          {symbol && <Icon.Icon icon={symbol} classNames='studio-card-icon shrink-0' />}
          <TextPart part='label' text={label} editing={editing} classNames='grow truncate'>
            {label}
          </TextPart>
        </div>
        {/* Through `TextPart`, since the spec advertises `footer` as an editable part; mounted while that part is
            edited even once it is empty, so the editor can put a note back. */}
        {(footer !== undefined || editing?.part === 'footer') && (
          <TextPart
            part='footer'
            text={footer ?? ''}
            editing={editing}
            classNames='studio-card-note font-mono truncate'
          >
            {footer}
          </TextPart>
        )}
      </div>
    );
  }

  // Anything the card holds beyond its title draws through the core card's frame, which makes each region a part;
  // the chips are what this kind adds between the header and the body.
  if (data.chips !== undefined || body !== undefined || footer !== undefined) {
    return (
      <div
        className='studio-card dx-cover rounded-xl overflow-hidden'
        data-testid='card-node'
        data-tone={tone ? true : undefined}
        style={{ padding: '12px 18px', ...style }}
      >
        <CardFrame node={node} editing={editing} classNames='studio-card-frame p-0 gap-[7px]'>
          {data.chips ? <Chips {...data.chips} /> : null}
        </CardFrame>
      </div>
    );
  }

  return (
    <div
      className='studio-card dx-cover flex items-center gap-3 px-4 rounded-xl'
      data-testid='card-node'
      data-tone={tone ? true : undefined}
      style={style}
    >
      {/* The header reads as the framed card's does — the same glyph and title — so a row of plain cards under a row
          of framed ones is one scale. The glyph is sized inline: the icon recipe's own size class would win. */}
      {symbol && <Icon.Icon icon={symbol} classNames='studio-card-icon shrink-0' style={{ width: 26, height: 26 }} />}
      <TextPart part='label' text={label} editing={editing} classNames='studio-card-title grow truncate'>
        {label}
      </TextPart>
    </div>
  );
};

export const cardSpec: ElementKindSpec = {
  // Five ports a side: a true middle to tie a trunk to, and room either side of it for a fan of edges
  // that converge on one card.
  portsPerSide: 5,
  // The core card with a look of its own: its title and glyph stay the core card's fields.
  extends: 'card',
  name: 'Card',
  icon: 'ph--cards--regular',
  key: 'C',
  schema: CardNode,
  component: CardNodeView,
  create: ({ id, z, center, size }) => ({ type: 'card', id, z, center, size, label: 'Card' }),
  // Nominal units (one unit is the major grid cell, 48px): the deck's 236 x 66 card, give or take.
  defaultSize: { width: 5, height: 1.5 },
  resizable: true,
  // Composite: the title first, so Enter on a selected card edits it, then the body and footer the frame draws.
  parts: [{ field: 'label' }, { field: 'body', multiline: true }, { field: 'footer' }],
};

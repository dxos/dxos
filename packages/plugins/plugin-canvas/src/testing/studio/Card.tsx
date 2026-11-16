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

import { type Styled, toneValue } from './FeedCard.tsx';

//
// The card kind: the deck's `.d-card.simple` — a Phosphor icon, a title, a soft raised shadow, and an optional
// coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's fill level.
//

/** What this kind adds to the core card, kept under `data`. */
export const CardData = Schema.Struct({
  /** An accent, drawn as the card's outline (`#2d6fff`). */
  tone: Schema.optional(Schema.String.annotate({ title: 'Tone' })),
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
  const tone = toneValue(data.tone);
  const symbol = iconSymbol(iconOf(node) ?? {});
  // A variable rather than a literal in the prop: a style that sets custom properties is not a fresh `CSSProperties`.
  const style: Styled = tone ? { '--sd-tone': tone } : {};
  return (
    <div
      className='studio-card dx-cover flex items-center gap-3 px-4 rounded-xl'
      data-testid='card-node'
      data-tone={tone ? true : undefined}
      style={style}
    >
      {symbol && <Icon.Icon icon={symbol} size='lg' classNames='studio-card-icon shrink-0' />}
      <TextPart part='label' text={label} editing={editing} classNames='grow truncate text-lg'>
        {label}
      </TextPart>
    </div>
  );
};

export const cardSpec: ElementKindSpec = {
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
  parts: [{ field: 'label' }],
};

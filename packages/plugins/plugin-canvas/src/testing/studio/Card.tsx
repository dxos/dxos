//
// Copyright 2026 DXOS.org
//

//
// The deck's `card()` as a canvas element kind: a Phosphor icon, a title, a soft raised panel, and an optional
// coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's fill level. The look
// comes from the deck tokens in `theme.css`, so the card follows the canvas's mode.
//
// Both of the deck's variants are this one kind, as they are one `card()` there: a card of nothing but an icon and a
// title is the `simple` row, and one that carries chips, a body or a footer draws through the shared card frame —
// which is what the `compact` variant is. Chips are a field rather than a kind of their own so the grid, the
// wrapping and the ghost state are laid out once (`Chip.tsx`) instead of per slide.
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
  iconSymbol,
} from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

import { ChipList, Chips } from './Chip.tsx';
import { type Styled, toneValue } from './FeedCard.tsx';

export const cardFields = {
  /** The card's title, in the core base's `label`, so it still reads where the kind is unknown. */
  label: Schema.String,
  /** The glyph and its weight, as the core card prototype's frame draws them. */
  icon: Schema.optional(IconSpec),
  /** An accent, drawn as the card's outline (`#2d6fff`). */
  tone: Schema.optional(Schema.String.annotate({ title: 'Tone' })),
  /**
   * The deck's card variants: `full` (the default) and `compact` draw through the shared card frame, `simple` is the
   * one-line row of an EDGE service — icon, title, and the footer under the title with no rule over it.
   */
  variant: Schema.optional(Schema.Literals(['full', 'compact', 'simple']).annotate({ title: 'Variant' })),
  /** A row or grid of chips in the card's body: what the layer holds, or which services it runs. */
  chips: Schema.optional(ChipList.annotate({ title: 'Chips' })),
  body: Schema.optional(Schema.String.annotate({ title: 'Body' })),
  footer: Schema.optional(Schema.String.annotate({ title: 'Footer' })),
};

export const CardNode = Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal('card'), ...cardFields });

type CardFields = Schema.Struct.Type<typeof cardFields>;

const isCardNode = (node: NodeViewProps['node']): node is NodeViewProps['node'] & CardFields => node.type === 'card';

const CardNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isCardNode(node)) {
    return null;
  }
  const tone = toneValue(node.tone);
  const symbol = iconSymbol(node.icon ?? {});
  // A variable rather than a literal in the prop: a style that sets custom properties is not a fresh `CSSProperties`.
  const style: Styled = tone ? { '--sd-tone': tone } : {};
  if (node.variant === 'simple') {
    return (
      <div
        className='studio-card studio-card-simple dx-cover flex flex-col justify-center rounded-xl overflow-hidden'
        data-testid='card-node'
        data-tone={tone ? true : undefined}
        style={style}
      >
        <div className='flex items-center min-w-0'>
          {symbol && <Icon.Icon icon={symbol} classNames='studio-card-icon shrink-0' />}
          <TextPart part='label' text={node.label} editing={editing} classNames='grow truncate'>
            {node.label}
          </TextPart>
        </div>
        {node.footer && <div className='studio-card-note font-mono truncate'>{node.footer}</div>}
      </div>
    );
  }
  const framed = node.chips !== undefined || node.body !== undefined || node.footer !== undefined;
  if (framed) {
    return (
      <div
        className='studio-card dx-cover rounded-xl overflow-hidden'
        data-testid='card-node'
        data-tone={tone ? true : undefined}
        style={{ padding: '12px 18px', ...style }}
      >
        {/* The core card prototype's frame draws the header, body and footer and makes each a part; the chips are
            what this variant adds between the header and the body. */}
        <CardFrame node={node} editing={editing} classNames='studio-card-frame p-0 gap-[7px]'>
          {node.chips ? <Chips {...node.chips} /> : null}
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
      <TextPart part='label' text={node.label} editing={editing} classNames='studio-card-title grow truncate'>
        {node.label}
      </TextPart>
    </div>
  );
};

export const cardSpec: ElementKindSpec = {
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

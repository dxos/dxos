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
  textOf,
} from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

import { ChipList, Chips, chipsOf } from './Chip.tsx';
import { type Styled, TONES, toneValue } from './FeedCard.tsx';

//
// The card kind: the deck's `.d-card.simple` — a Phosphor icon, a title, a soft raised shadow, and an optional
// coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's fill level.
//

/**
 * A row a card lists: its text, and a glyph of its own in place of the bullet. `tone` is a name rather than one of
 * {@link TONES}, so a row naming a tone the deck does not have still draws, in the card's own colour.
 */
export const CardItem = Schema.Struct({
  text: Schema.String,
  icon: Schema.optional(Schema.String),
  tone: Schema.optional(Schema.String),
});
export type CardItem = Schema.Schema.Type<typeof CardItem>;

/** What this kind adds to the core card, kept under `data`. */
export const CardData = Schema.Struct({
  /** An accent, drawn as the card's outline. A name, not a colour: {@link toneValue} resolves only these. */
  tone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Tone' })),
  /** The glyph's own colour, with no outline on the card: what the Composer slide gives its plugin cards. */
  iconTone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Icon tone' })),
  /**
   * The deck's card variants: `full` (the default) and `compact` draw through the shared card frame, `simple` is the
   * one-line row of an EDGE service — icon, title, and the footer under the title with no rule over it.
   */
  variant: Schema.optional(Schema.Literals(['full', 'compact', 'simple']).annotate({ title: 'Variant' })),
  /** A row or grid of chips in the card's body: what the layer holds, or which services it runs. */
  chips: Schema.optional(Schema.Union([ChipList, Schema.String]).annotate({ title: 'Chips' })),
  /** The rows the card lists under its title, which the text form writes in braces after the node. */
  items: Schema.optional(Schema.Array(CardItem).annotate({ title: 'Rows' })),
});

/**
 * A card's rows: each a bullet in the glyph's gutter and its text in the title's column, so a list reads down the
 * same two columns as the header above it.
 */
const CardRows = ({ items }: { items: readonly CardItem[] }) => (
  <ul className='studio-card-rows min-w-0 shrink-0' data-testid='card-rows'>
    {items.map(({ text, icon, tone }, index) => {
      const symbol = icon ? iconSymbol({ type: icon }) : undefined;
      const colour = toneValue(tone);
      const style: Styled = colour ? { '--sd-tone': colour } : {};
      return (
        <li key={index} className='studio-card-row' style={style}>
          <span className='studio-card-bullet' aria-hidden='true'>
            {symbol ? <Icon.Icon icon={symbol} style={{ width: 18, height: 18 }} /> : '•'}
          </span>
          <span className='min-w-0'>{text}</span>
        </li>
      );
    })}
  </ul>
);

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
  // Through `textOf`, which reads the node and then the kind's own bag: these live under `data` now, and reading
  // only the node left the simple card's footer blank.
  const footer = textOf(node, 'footer');
  const body = textOf(node, 'body');
  const tone = toneValue(data.tone);
  // The glyph takes the card's tone where it has one, its own where the slide colours only the glyph.
  const glyph = tone ?? toneValue(data.iconTone);
  const symbol = iconSymbol(iconOf(node) ?? {});
  // A variable rather than a literal in the prop: a style that sets custom properties is not a fresh `CSSProperties`.
  const style: Styled = glyph ? { '--sd-tone': glyph } : {};
  const rows = data.items?.length ? data.items : undefined;

  // The deck's `.d-card.simple`: one row of icon and title, with the footer and any rows under the title and no rule
  // over them.
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
        {(footer !== undefined || editing?.part === 'data.footer') && (
          <TextPart
            part='data.footer'
            text={footer ?? ''}
            editing={editing}
            classNames='studio-card-note font-mono truncate'
          >
            {footer}
          </TextPart>
        )}
        {rows ? <CardRows items={rows} /> : null}
      </div>
    );
  }

  // Anything the card holds beyond its title draws through the core card's frame, which makes each region a part;
  // the chips and the rows are what this kind adds between the header and the body.
  if (data.chips !== undefined || rows !== undefined || body !== undefined || footer !== undefined) {
    return (
      <div
        className='studio-card dx-cover rounded-xl overflow-hidden'
        data-testid='card-node'
        data-tone={tone ? true : undefined}
        style={{ padding: '12px 18px', ...style }}
      >
        <CardFrame node={node} editing={editing} classNames='studio-card-frame p-0 gap-[7px]'>
          {chipsOf(data.chips) ? <Chips {...chipsOf(data.chips)!} /> : null}
          {rows ? <CardRows items={rows} /> : null}
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
  // The card paints its own panel, radius and shadows, so the frame must paint none: otherwise the node's own box
  // sits behind it at the look's radius (16px against the card's 12px) and its `overflow-hidden` clips the card's
  // corners — which is the flattened corner the tone outline showed. `unclipped` lets the raised shadow, which is
  // drawn outside the frame, survive too.
  bare: true,
  unclipped: true,
  // Composite: the title first, so Enter on a selected card edits it, then the body and footer the frame draws.
  parts: [{ field: 'label' }, { field: 'data.body', multiline: true }, { field: 'data.footer' }],
};

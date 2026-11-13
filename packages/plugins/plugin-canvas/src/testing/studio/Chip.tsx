//
// Copyright 2026 DXOS.org
//

//
// The deck's `chip()` (studio `assets/deck/lib/components.mjs`, `.d-chip` in `deck.css`): a pill of icon, label and
// an optional mono note. It appears two ways, and both are drawn by {@link Chip} here so the grid, the wrapping and
// the ghost state are written once:
//
//  - inside a card, as its `chips` field — a 3-column grid of flat chips on the ECHO layers slide, a wrapping row on
//    the Architecture slide, where a *ghost* chip is a service that runs at the EDGE but not on the client;
//  - as a node of its own on the Plugins slide, one chip stretched to a shared width under each module card.
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

import { type Styled, TONES, toneValue } from './FeedCard.tsx';

/** One chip of a card's row or grid. */
export const ChipItem = Schema.Struct({
  icon: Schema.optional(Schema.String.annotate({ title: 'Icon' })),
  label: Schema.String.annotate({ title: 'Label' }),
  /** A mono suffix (`every write`, `Effect Schema`); body chips only. */
  note: Schema.optional(Schema.String.annotate({ title: 'Note' })),
  tone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Tone' })),
  /** Present elsewhere, not here: a dashed outline with no fill. */
  ghost: Schema.optional(Schema.Boolean.annotate({ title: 'Ghost' })),
});
export type ChipItem = Schema.Schema.Type<typeof ChipItem>;

/** A card's chips: a wrapping row, or a grid when `cols` is set. */
export const ChipList = Schema.Struct({
  items: Schema.Array(ChipItem),
  /** Columns of the grid; without it the chips wrap as a row. */
  cols: Schema.optional(Schema.Number.annotate({ title: 'Columns' })),
  /** The deck's flat chips: a small radius and a flatter shadow, used inside a card. */
  flat: Schema.optional(Schema.Boolean.annotate({ title: 'Flat' })),
  /** The column gap the slide chose, in scene units, where the columns line up with something below. */
  columnGap: Schema.optional(Schema.Number.annotate({ title: 'Column gap' })),
});
export type ChipList = Schema.Schema.Type<typeof ChipList>;

export type ChipProps = ChipItem & {
  /** The large chip of a standalone node: the deck's `.d-chip-fill.lg`. */
  large?: boolean;
  flat?: boolean;
  children?: React.ReactNode;
};

/** One chip. `children` replaces the label, so a node kind can make its own label editable in place. */
export const Chip = ({ icon, label, note, tone, ghost, large, flat, children }: ChipProps) => {
  const value = toneValue(tone);
  const symbol = iconSymbol({ type: icon });
  const style: Styled = value ? { '--sd-tone': value } : {};
  return (
    <div
      className='studio-chip flex items-center min-w-0'
      data-testid='studio-chip'
      data-tone={value && !ghost ? true : undefined}
      data-ghost={ghost ? true : undefined}
      data-large={large ? true : undefined}
      data-flat={flat ? true : undefined}
      style={style}
    >
      {/* The glyph is sized inline: the icon recipe's own size class would otherwise win over a stylesheet rule of
          the same specificity, and a chip's glyph is a fixed share of its type size rather than a theme step. */}
      {symbol && (
        <Icon.Icon
          icon={symbol}
          classNames='studio-chip-icon shrink-0'
          style={{ width: large ? 27 : 20, height: large ? 27 : 20 }}
        />
      )}
      {children ?? <span className='truncate'>{label}</span>}
      {note !== undefined && <small className='studio-chip-note font-mono truncate'>{note}</small>}
    </div>
  );
};

/** A card's chips, as the deck lays them out: a grid of `cols` columns, or a wrapping row. */
export const Chips = ({ items, cols, flat, columnGap }: ChipList) => (
  <div
    className='studio-chips min-w-0'
    data-grid={cols ? true : undefined}
    style={{
      ...(cols ? { gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` } : {}),
      ...(columnGap !== undefined ? { columnGap } : {}),
    }}
    data-testid='studio-chips'
  >
    {items.map((item, index) => (
      <Chip key={index} {...item} flat={flat} />
    ))}
  </div>
);

//
// The standalone chip: a node kind of its own, stretched to one shared width under the module it consumes.
//

/** The kind's own fields, kept under `data` (decision 21); the title and glyph are the core card's. */
export const ChipData = Schema.Struct({
  tone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Tone' })),
  note: Schema.optional(Schema.String.annotate({ title: 'Note' })),
  ghost: Schema.optional(Schema.Boolean.annotate({ title: 'Ghost' })),
});

export const ChipNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('chip'),
  label: Schema.String,
  icon: Schema.optional(IconSpec),
  data: Schema.optional(ChipData),
});

const ChipNodeView = ({ node, editing }: NodeViewProps) => {
  const data = kindData(ChipData, node);
  if (node.type !== 'chip' || !data) {
    return null;
  }
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';
  return (
    <div className='dx-cover flex items-center' data-testid='chip-node'>
      <Chip icon={iconOf(node)?.type} label={label} note={data.note} tone={data.tone} ghost={data.ghost} large>
        <TextPart part='label' text={label} editing={editing} classNames='truncate'>
          {label}
        </TextPart>
      </Chip>
    </div>
  );
};

export const chipSpec: ElementKindSpec = {
  // Five ports a side: a true middle to tie a trunk to, and room either side of it for a fan of edges
  // that converge on one card.
  portsPerSide: 5,
  name: 'Chip',
  icon: 'ph--tag--regular',
  key: 'H',
  schema: ChipNode,
  component: ChipNodeView,
  create: ({ id, z, center, size }) => ({ type: 'chip', id, z, center, size, label: 'Chip' }),
  // The core card's title and glyph are what a chip shows; its tone, note and ghost state are its own.
  extends: 'card',
  // Nominal units (one unit is the major grid cell, 48px): the deck's 262 x 47 chip, give or take.
  defaultSize: { width: 5.5, height: 1 },
  resizable: true,
  minSize: { width: 72, height: 28 },
  parts: [{ field: 'label' }],
  // The pill is the shape: the kind draws its own outline and fill.
  bare: true,
};

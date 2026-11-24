//
// Copyright 2026 DXOS.org
//

//
// A row's heading as a canvas element kind: a glyph over a title, with no panel behind them. A slide whose rows are
// named down its left edge gives each row one of these in the cell beside its cards.
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

/** What this kind adds to the core card, kept under `data`. */
export const HeadingData = Schema.Struct({
  /** The glyph's colour. A name, not a colour: {@link toneValue} resolves only these. */
  tone: Schema.optional(Schema.Literals(TONES).annotate({ title: 'Tone' })),
});

export const HeadingNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('heading'),
  label: Schema.String,
  icon: Schema.optional(IconSpec),
  data: Schema.optional(HeadingData),
});

const HeadingNodeView = ({ node, editing }: NodeViewProps) => {
  const data = kindData(HeadingData, node);
  if (node.type !== 'heading' || !data) {
    return null;
  }
  const label = 'label' in node && typeof node.label === 'string' ? node.label : '';
  const tone = toneValue(data.tone);
  const symbol = iconSymbol(iconOf(node) ?? {});
  // A variable rather than a literal in the prop: a style that sets custom properties is not a fresh `CSSProperties`.
  const style: Styled = tone ? { '--sd-tone': tone } : {};
  return (
    <div
      className='studio-heading dx-cover flex flex-col items-center justify-center'
      data-testid='heading-node'
      style={style}
    >
      {/* Sized inline: the icon recipe's own size class would win over a rule in the theme. */}
      {symbol && (
        <Icon.Icon icon={symbol} classNames='studio-heading-icon shrink-0' style={{ width: 44, height: 44 }} />
      )}
      <TextPart part='label' text={label} editing={editing} classNames='studio-heading-title max-w-full truncate'>
        {label}
      </TextPart>
    </div>
  );
};

export const headingSpec: ElementKindSpec = {
  name: 'Heading',
  icon: 'ph--text-h--regular',
  key: 'J',
  schema: HeadingNode,
  component: HeadingNodeView,
  create: ({ id, z, center, size }) => ({ type: 'heading', id, z, center, size, label: 'Heading' }),
  // The core card's title and glyph are what a heading shows; only its tone is its own.
  extends: 'card',
  // Nominal units (one unit is the major grid cell, 48px).
  defaultSize: { width: 4, height: 2 },
  resizable: true,
  parts: [{ field: 'label' }],
  // A heading is its glyph and its text: no box is drawn behind them.
  bare: true,
};

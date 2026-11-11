//
// Copyright 2026 DXOS.org
//

//
// The deck's `card({ variant: 'simple' })` as a canvas element kind: a Phosphor icon, a title, a soft raised panel,
// and an optional coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's
// fill level. The look comes from the deck tokens in `theme.css`, so the card follows the canvas's mode.
//

import './theme.css';

import * as Schema from 'effect/Schema';
import React from 'react';

import { type ElementKindSpec, type NodeViewProps, TextPart } from '@dxos/react-ui-canvas';
import * as Icon from '@dxos/react-ui/Icon';
import { Scene } from '@dxos/scene';

import { type Styled, toneValue } from './FeedCard.tsx';

//
// The card kind: the deck's `.d-card.simple` — a Phosphor icon, a title, a soft raised shadow, and an optional
// coloured outline. `tone` is the card's own field rather than `style.tone`, which is the hue's fill level.
//

export const cardFields = {
  /** The card's title, in the core base's `label`, so it still reads where the kind is unknown. */
  label: Schema.String,
  /** A Phosphor icon name as the deck writes it (`users-three`), without the `ph--…--regular` wrapping. */
  icon: Schema.optional(Schema.String.annotate({ title: 'Icon' })),
  /** An accent, drawn as the card's outline (`#2d6fff`). */
  tone: Schema.optional(Schema.String.annotate({ title: 'Tone' })),
};

export const CardNode = Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal('card'), ...cardFields });

const isCardNode = (
  node: NodeViewProps['node'],
): node is NodeViewProps['node'] & Schema.Struct.Type<typeof cardFields> => node.type === 'card';

const CardNodeView = ({ node, editing }: NodeViewProps) => {
  if (!isCardNode(node)) {
    return null;
  }
  const tone = toneValue(node.tone);
  // A variable rather than a literal in the prop: a style that sets custom properties is not a fresh `CSSProperties`.
  const style: Styled = tone ? { '--sd-tone': tone } : {};
  return (
    <div
      className='studio-card dx-cover flex items-center gap-3 px-4 rounded-xl'
      data-testid='card-node'
      data-tone={tone ? true : undefined}
      style={style}
    >
      <Icon.Icon icon={`ph--${node.icon ?? 'square'}--regular`} size='lg' classNames='studio-card-icon shrink-0' />
      <TextPart part='label' text={node.label} editing={editing} classNames='grow truncate text-lg'>
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
  defaultSize: { width: 236, height: 66 },
  resizable: true,
  parts: [{ field: 'label' }],
};

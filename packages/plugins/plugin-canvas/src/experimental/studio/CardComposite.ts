//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';

import { type ElementKindSpec, templateCompositeId } from '@dxos/react-ui-canvas';
import { Scene } from '@dxos/scene';

import { STUDIO_CARD_SIZE, STUDIO_CARD_TEMPLATE } from './card-template.ts';
import { CardData } from './Card.tsx';

/** The composite id every placement of this kind names; one definition, many instances. */
export const STUDIO_CARD_COMPOSITE = templateCompositeId('studio-card');

/**
 * The same fields the painted `card` kind takes, so a drawing can be moved between the two: what differs is where
 * the shape comes from, not what a card says.
 */
export const StudioCardCompositeNode = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('studio-card'),
  label: Schema.String,
  icon: Schema.optional(Schema.Struct({ type: Schema.String })),
  body: Schema.optional(Schema.String),
  footer: Schema.optional(Schema.String),
  data: Schema.optional(CardData),
});

/**
 * The studio card drawn from a composite rather than a React view: the canvas places an Instance of
 * {@link STUDIO_CARD_TEMPLATE} and binds each part to a field of the node, so the parts are edited in place, the
 * data stays typed, and a variant is a placement with different values rather than a branch in a component.
 *
 * `template` is what makes it reusable: a kind that declares one needs no `create` of its own — the registry
 * synthesises one placing the instance — and every placement shares the single definition.
 */
export const studioCardCompositeSpec: ElementKindSpec = {
  // Five ports a side, as the painted card has: a true middle for a trunk, and room either side for a fan.
  portsPerSide: 5,
  // The card prototype owns the `icon`, `body` and `footer` slots; without it a kind's own fields must sit under
  // `data`, and the composite binds to top-level names.
  extends: 'card',
  name: 'Studio card (composite)',
  icon: 'ph--cards-three--regular',
  schema: StudioCardCompositeNode,
  template: STUDIO_CARD_TEMPLATE,
  create: ({ id, z, center, size }) => ({
    type: 'studio-card',
    id,
    z,
    center,
    size,
    composite: STUDIO_CARD_COMPOSITE,
    label: 'Card',
    body: 'Body',
    footer: 'Footer',
    icon: { type: 'ph--command--regular' },
  }),
  // Nominal units (one unit is the major grid cell, 48px).
  defaultSize: { width: STUDIO_CARD_SIZE.width / 48, height: STUDIO_CARD_SIZE.height / 48 },
  resizable: true,
  // The composite paints the frame, so the node's own must not: a second box behind it at the look's radius is what
  // clipped the painted card's corners.
  bare: true,
  unclipped: true,
  parts: [{ field: 'label' }, { field: 'body', multiline: true }, { field: 'footer' }],
};

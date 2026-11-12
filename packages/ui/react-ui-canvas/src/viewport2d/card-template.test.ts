//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { type Bounds, type Node, type PlacedComposite } from '@dxos/scene';

import { CARD_SIZE, CARD_TEMPLATE, type CardNode } from '../components/index.ts';
import { type RenderList2D } from '../model/index.ts';
import { drawnParts } from '../utils/index.ts';
import { compileTemplate, isCompiled } from './template.ts';

const COMPOSITE = 'template:card';

const composite = (): RenderList2D => {
  const result = compileTemplate(CARD_TEMPLATE, COMPOSITE);
  if (!isCompiled(result)) {
    throw new Error(result.problems.join(' '));
  }
  return result.composite;
};

/** A card as the tool makes one: its own typed fields, and the Instance fields that place the Object. */
type Card = CardNode & Pick<PlacedComposite, 'composite' | 'overrides'>;

const card = (size = CARD_SIZE, overrides?: PlacedComposite['overrides']): Card => ({
  type: 'card',
  id: 'card-1',
  z: 'a0',
  center: { x: 0, y: 0 },
  size,
  composite: COMPOSITE,
  label: 'Title',
  body: 'Body',
  footer: 'Footer',
  icon: { type: 'rocket' },
  ...(overrides ? { overrides } : {}),
});

/** A part's box in scene coordinates, as the instance draws it. */
const boxOf = (view: RenderList2D, id: string): Bounds => {
  const node: Node | undefined = view.nodes[id];
  if (!node) {
    throw new Error(`No part ${id}; the card drew ${Object.keys(view.nodes).join(', ')}.`);
  }
  const { center, size } = node;
  return { x: center.x - size.width / 2, y: center.y - size.height / 2, ...size };
};

describe('the card template', () => {
  test('compiles to the parts a card is made of', () => {
    expect(Object.keys(composite().nodes).sort()).toEqual(['body', 'footer', 'frame', 'icon', 'rule', 'title']);
  });

  test('binds each region to the card’s own field', () => {
    const view = drawnParts(card(), composite(), () => [{ field: 'text', multiline: true }]);
    expect(Reflect.get(view.nodes.title ?? {}, 'text')).toEqual('Title');
    expect(Reflect.get(view.nodes.body ?? {}, 'text')).toEqual('Body');
    expect(Reflect.get(view.nodes.footer ?? {}, 'text')).toEqual('Footer');
  });

  test('binds the glyph, which is not text, under its own name', () => {
    const view = drawnParts(card(), composite(), () => [{ field: 'label' }]);
    expect(Reflect.get(view.nodes.icon ?? {}, 'icon')).toEqual({ type: 'rocket' });
  });

  test('keeps the glyph and the footer where they are as the card grows', () => {
    const small = drawnParts(card(), composite());
    const large = drawnParts(card({ width: CARD_SIZE.width + 96, height: CARD_SIZE.height + 96 }), composite());
    // The glyph keeps its corner: same size, same offset from the top left.
    expect(boxOf(small, 'icon').width).toEqual(boxOf(large, 'icon').width);
    const inset = (view: RenderList2D, id: string, frame: Bounds) => ({
      left: boxOf(view, id).x - frame.x,
      bottom: frame.y + frame.height - (boxOf(view, id).y + boxOf(view, id).height),
    });
    const smallFrame = boxOf(small, 'frame');
    const largeFrame = boxOf(large, 'frame');
    expect(inset(small, 'icon', smallFrame).left).toEqual(inset(large, 'icon', largeFrame).left);
    // The footer keeps the floor.
    expect(inset(small, 'footer', smallFrame).bottom).toEqual(inset(large, 'footer', largeFrame).bottom);
    // The body takes what is left, so it is the part that grew.
    expect(boxOf(large, 'body').height).toBeGreaterThan(boxOf(small, 'body').height);
  });

  test('grows the body into a hidden footer, and the hairline goes with it', () => {
    const whole = drawnParts(card(), composite());
    const without = drawnParts(card(CARD_SIZE, { footer: { hidden: true } }), composite());
    expect(without.nodes.footer).toBeUndefined();
    expect(without.nodes.rule).toBeUndefined();
    const grown = boxOf(without, 'body');
    const before = boxOf(whole, 'body');
    expect(grown.y).toEqual(before.y);
    // The body now reaches the floor the footer used to stand on.
    expect(grown.y + grown.height).toEqual(boxOf(whole, 'footer').y + boxOf(whole, 'footer').height);
  });

  test('widens the title into a hidden glyph', () => {
    const whole = drawnParts(card(), composite());
    const without = drawnParts(card(CARD_SIZE, { icon: { hidden: true } }), composite());
    expect(without.nodes.icon).toBeUndefined();
    expect(boxOf(without, 'title').x).toEqual(boxOf(whole, 'icon').x);
    expect(boxOf(without, 'title').width).toBeGreaterThan(boxOf(whole, 'title').width);
  });

  test('turning a part off is the instance’s own, not the definition’s', () => {
    const definition = composite();
    drawnParts(card(CARD_SIZE, { footer: { hidden: true } }), definition);
    expect(definition.nodes.footer?.hidden).toBeUndefined();
  });
});

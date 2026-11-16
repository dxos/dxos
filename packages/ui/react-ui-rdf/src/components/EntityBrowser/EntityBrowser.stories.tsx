//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';
import { expect, userEvent, waitFor, within } from 'storybook/test';

import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { type EntityCardModel, type EntityCardProperty, type EntityCardValue } from '../../model/index.ts';
import { EntityBrowser } from './EntityBrowser.tsx';
import { ENTITY_HUES } from './EntityCard.tsx';

/** Classes with weights, so the type filter has a long tail to fold into its overflow menu. */
const TYPES: ReadonlyArray<[type: string, weight: number]> = [
  ['Person', 30],
  ['Question', 22],
  ['Topic', 14],
  ['Organization', 10],
  ['Channel', 8],
  ['Product', 6],
  ['Place', 4],
  ['Event', 3],
  ['Concept', 2],
  ['Thing', 1],
];

const PREDICATES = ['asked', 'works-on', 'uses', 'has-account', 'mentions', 'answered', 'member-of', 'located-in'];

/** A small deterministic generator, so the store is the same on every load. */
const seeded = (seed: number) => {
  let state = seed;
  return () => {
    state = (state * 1_103_515_245 + 12_345) % 2_147_483_648;
    return state / 2_147_483_648;
  };
};

/** A synthetic store of `count` entities across {@link TYPES}, each with 0–5 properties naming other entities. */
const makeCards = (count: number): EntityCardModel[] => {
  const random = seeded(42);
  const total = TYPES.reduce((sum, [, weight]) => sum + weight, 0);
  const pickType = () => {
    let roll = random() * total;
    for (const [type, weight] of TYPES) {
      roll -= weight;
      if (roll < 0) {
        return type;
      }
    }
    return TYPES[0][0];
  };
  const heads = Array.from({ length: count }, (_, index) => {
    const type = pickType();
    return { id: `entity-${index}`, label: `${type} ${index}`, type };
  });
  return heads.map((head) => {
    const properties: EntityCardProperty[] = PREDICATES.slice(0, Math.floor(random() * 6)).map((predicate) => ({
      predicate,
      label: predicate,
      values: Array.from({ length: 1 + Math.floor(random() * 4) }, () => {
        const target = heads[Math.floor(random() * heads.length)];
        const value: EntityCardValue = { kind: 'entity', id: target.id, label: target.label, type: target.type };
        return value;
      }),
    }));
    return { ...head, properties, inverse: [] };
  });
};

const ENTITY_COUNT = 5_000;

const CARDS = makeCards(ENTITY_COUNT);

const TYPE_BY_ID = new Map(CARDS.map((card) => [card.id, card.type]));

const DefaultStory = ({ cards }: { cards: readonly EntityCardModel[] }) => {
  const [selected, setSelected] = useState<string | undefined>(undefined);
  return <EntityBrowser cards={cards} hues={ENTITY_HUES} selected={selected} onSelect={setSelected} />;
};

const meta = {
  title: 'ui/react-ui-rdf/EntityBrowser',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'column' })],
  parameters: { translations },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

/** 5,000 synthetic entities across ten classes: only the cards near the viewport render, and the type row filters. */
export const Large: Story = {
  args: { cards: CARDS },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getAllByTestId('entity-card').length).toBeGreaterThan(0));
    // Virtualized: a screenful (plus overscan) of the 5,000 cards is in the DOM.
    await expect(canvas.getAllByTestId('entity-card').length).toBeLessThan(100);

    const [first] = canvas.getAllByTestId('entity-type-filter.item');
    await expect(first).toHaveTextContent(/^Person \d+$/);
    await userEvent.click(first);
    await waitFor(() => expect(first).toHaveAttribute('aria-checked', 'true'));
    // Every card the filter leaves is a Person.
    await waitFor(() => {
      const shown = canvas.getAllByTestId('entity-card').map((card) => card.getAttribute('data-entity-id') ?? '');
      return expect(new Set(shown.map((id) => TYPE_BY_ID.get(id)))).toEqual(new Set(['Person']));
    });

    // Choosing the chosen class again clears the filter.
    await userEvent.click(first);
    await waitFor(() => expect(first).toHaveAttribute('aria-checked', 'false'));
  },
};

export const Empty: Story = {
  args: { cards: [] },
};

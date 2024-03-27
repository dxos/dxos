//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { BookBookmark, StackSimple } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { AttentionProvider, PlankHeading, plankHeadingIconProps, Deck } from '@dxos/react-ui-deck';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';

import { type StackSectionItem } from './Section';
import { Stack } from './Stack';

faker.seed(3);

const SimpleContent = ({ data }: { data: { title?: string; body?: string } }) => (
  <>
    <div className='text-xl mlb-2'>{data.title}</div>
    <p>{data.body}</p>
  </>
);

const rollItems = (n: number): StackSectionItem[] => {
  return [...Array(n)].map(() => ({
    id: faker.string.uuid(),
    icon: BookBookmark,
    object: {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      body: faker.lorem.paragraph(),
    },
  }));
};

const DemoStackPlank = () => {
  const [items] = useState(rollItems(12));
  return (
    <>
      <PlankHeading.Root classNames='pli-px'>
        <PlankHeading.Button>
          <StackSimple {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label>{faker.lorem.words(3)}</PlankHeading.Label>
      </PlankHeading.Root>
      <Stack items={items} SectionContent={SimpleContent} id={faker.string.uuid()} classNames='pli-px' />
    </>
  );
};

export default {
  title: 'react-ui-stack/StackDeck',
  component: Deck.Root,
  decorators: [withTheme],
  args: {},
};

export const Simple = {
  args: {},
  render: () => {
    const [attended] = useState(new Set());
    return (
      <Mosaic.Root>
        <AttentionProvider attended={attended}>
          <Mosaic.DragOverlay />
          <Deck.Root>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
            <Deck.Plank>
              <DemoStackPlank />
            </Deck.Plank>
          </Deck.Root>
        </AttentionProvider>
      </Mosaic.Root>
    );
  },
};

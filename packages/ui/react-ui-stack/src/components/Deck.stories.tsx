//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { BookBookmark, CaretLeft, CaretRight, SidebarSimple, StackSimple } from '@phosphor-icons/react';
import React, { useState } from 'react';

import { faker } from '@dxos/random';
import { Button, Main } from '@dxos/react-ui';
import { AttentionProvider, PlankHeading, plankHeadingIconProps, Deck as NaturalDeck } from '@dxos/react-ui-deck';
import { Mosaic } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';

import { SectionToolbar, type StackSectionItem } from './Section';
import { Stack } from './Stack';

faker.seed(3);

const Toolbar = () => {
  return (
    <SectionToolbar classNames='flex items-center gap-2'>
      <p>File</p>
      <p>Edit</p>
      <p>View</p>
    </SectionToolbar>
  );
};

const SimpleContent = ({ data }: { data: { title?: string; body?: string } }) => (
  <>
    <Toolbar />
    <div className='text-xl mlb-2'>{data.title}</div>
    <p>{data.body}</p>
  </>
);

const rollItems = (n: number): StackSectionItem[] => {
  return [...Array(n)].map(() => ({
    id: faker.string.uuid(),
    icon: BookBookmark,
    isResizable: true,
    object: {
      id: faker.string.uuid(),
      title: faker.lorem.words(3),
      body: faker.lorem.paragraph(),
    },
  }));
};

const DemoStackPlank = ({ toolbar }: { toolbar?: boolean }) => {
  const [items] = useState(rollItems(12));
  return (
    <>
      <PlankHeading.Root classNames='pli-px'>
        <PlankHeading.Button>
          <StackSimple {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label>{faker.lorem.words(3)}</PlankHeading.Label>
      </PlankHeading.Root>
      {toolbar && <Toolbar />}
      <Stack
        items={items}
        SectionContent={SimpleContent}
        id={faker.string.uuid()}
        classNames={[
          'p-px overflow-y-auto row-end-[content-end]',
          toolbar ? 'row-start-[content-start]' : 'row-start-[toolbar-start]',
        ]}
      />
    </>
  );
};

export default {
  // NOTE(thure): This is intentionally organized under `react-ui-deck` so that related stories appear together in Storybook despite needing to live in separate packages based on dependencies.
  title: 'react-ui-deck/Deck',
  component: NaturalDeck.Root,
  decorators: [withTheme],
  args: {},
};

export const StaticBasicStacks = {
  args: {},
  render: () => {
    const [attended] = useState(new Set());
    return (
      <Mosaic.Root>
        <AttentionProvider attended={attended}>
          <Mosaic.DragOverlay />
          <NaturalDeck.Root>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
          </NaturalDeck.Root>
        </AttentionProvider>
      </Mosaic.Root>
    );
  },
};

export const DynamicBasicStacks = () => {
  const [attended] = useState(new Set());
  const [navOpen, setNavOpen] = useState(true);
  const [c11yOpen, setC11yOpen] = useState(true);
  return (
    <Mosaic.Root>
      <AttentionProvider attended={attended}>
        <Main.Root complementarySidebarOpen={c11yOpen} navigationSidebarOpen={navOpen}>
          <Main.Overlay />
          <Mosaic.DragOverlay />
          <Main.Notch>
            <Button variant='ghost' classNames='p-1' onClick={() => setNavOpen(!navOpen)}>
              <SidebarSimple />
            </Button>
            <Button variant='ghost' classNames='p-1'>
              <CaretLeft />
            </Button>
            <Button variant='ghost' classNames='p-1'>
              <CaretRight />
            </Button>
            <Button variant='ghost' classNames='p-1' onClick={() => setC11yOpen(!c11yOpen)}>
              <SidebarSimple mirrored />
            </Button>
          </Main.Notch>
          <Main.NavigationSidebar>
            <DemoStackPlank />
          </Main.NavigationSidebar>
          <NaturalDeck.Root>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
            <NaturalDeck.Plank>
              <DemoStackPlank />
            </NaturalDeck.Plank>
          </NaturalDeck.Root>
          <Main.ComplementarySidebar>
            <DemoStackPlank />
          </Main.ComplementarySidebar>
        </Main.Root>
      </AttentionProvider>
    </Mosaic.Root>
  );
};

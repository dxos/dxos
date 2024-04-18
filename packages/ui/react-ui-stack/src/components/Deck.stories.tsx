//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import { BookBookmark, CaretLeft, CaretRight, SidebarSimple, StackSimple, X } from '@phosphor-icons/react';
import React, { type PropsWithChildren, useEffect, useState } from 'react';

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

type PlankProps = { items: StackSectionItem[]; label: string; id: string };

const rollStackPlank = (n: number): PlankProps => ({
  items: rollItems(n),
  id: faker.string.uuid(),
  label: faker.lorem.words(3),
});

const StackPlank = ({ label, items, id, children }: PropsWithChildren<PlankProps>) => {
  return (
    <>
      <PlankHeading.Root classNames='pli-px'>
        <PlankHeading.Button>
          <StackSimple {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label classNames='grow'>{label}</PlankHeading.Label>
        {children}
      </PlankHeading.Root>
      <Stack
        items={items}
        SectionContent={SimpleContent}
        id={id}
        classNames='p-px overflow-y-auto row-end-[content-end] row-start-[toolbar-start] mbs-0 mbe-0'
      />
    </>
  );
};

const DemoStackPlank = () => {
  const [props] = useState(rollStackPlank(12));
  return <StackPlank {...props} />;
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
  const [c11yOpen, setC11yOpen] = useState(false);
  const [planks] = useState(
    [...Array(12)]
      .map(() => rollStackPlank(12))
      .reduce((acc: Record<string, PlankProps>, plank) => {
        acc[plank.id] = plank;
        return acc;
      }, {}),
  );
  const [openPlanks, setOpenPlanks] = useState<Set<string>>(new Set());
  useEffect(() => {
    console.log('[openPlanks]', openPlanks);
  }, [openPlanks]);
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
          <Main.NavigationSidebar classNames='p-2'>
            {Object.values(planks).map(({ label, id }) => {
              return (
                <Button
                  key={id}
                  variant={openPlanks.has(id) ? 'primary' : 'default'}
                  classNames='truncate is-full block mlb-2'
                  onClick={() =>
                    setOpenPlanks((prev) => {
                      prev.has(id) ? prev.delete(id) : prev.add(id);
                      console.log('[click]', prev);
                      return new Set(Array.from(prev));
                    })
                  }
                >
                  {label}
                </Button>
              );
            })}
          </Main.NavigationSidebar>
          <NaturalDeck.Root>
            {Array.from(openPlanks).map((id) => {
              const plank = planks[id];
              return (
                <NaturalDeck.Plank key={plank.id}>
                  <StackPlank {...plank}>
                    <Button
                      variant='ghost'
                      classNames='p-1'
                      onClick={() =>
                        setOpenPlanks((prev) => {
                          prev.delete(plank.id);
                          return new Set(Array.from(prev));
                        })
                      }
                    >
                      <X />
                    </Button>
                  </StackPlank>
                </NaturalDeck.Plank>
              );
            })}
          </NaturalDeck.Root>
          <Main.ComplementarySidebar>
            <span>To do.</span>
          </Main.ComplementarySidebar>
        </Main.Root>
      </AttentionProvider>
    </Mosaic.Root>
  );
};

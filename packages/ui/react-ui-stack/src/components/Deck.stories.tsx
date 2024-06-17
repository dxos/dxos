//
// Copyright 2024 DXOS.org
//

import '@dxosTheme';

import {
  Books,
  CardsThree,
  CaretLeft,
  CaretLineLeft,
  CaretLineRight,
  CaretRight,
  SidebarSimple,
  TextAa,
  X,
} from '@phosphor-icons/react';
import React, { type PropsWithChildren, useState } from 'react';

import { faker } from '@dxos/random';
import { Button, Main } from '@dxos/react-ui';
import {
  AttentionProvider,
  PlankHeading,
  plankHeadingIconProps,
  Deck as NaturalDeck,
  Plank,
} from '@dxos/react-ui-deck';
import { Mosaic, type MosaicDataItem } from '@dxos/react-ui-mosaic';
import { withTheme } from '@dxos/storybook-utils';
import { arrayMove } from '@dxos/util';

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

const SimpleContent = ({ data }: { data: MosaicDataItem & { title?: string; body?: string } }) => (
  <>
    <Toolbar />
    <div className='text-xl mlb-2'>{data.title}</div>
    <p>{data.body}</p>
  </>
);

const rollItems = (n: number): StackSectionItem[] => {
  return [...Array(n)].map(() => ({
    id: faker.string.uuid(),
    icon: TextAa,
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
          <CardsThree {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label classNames='flex-1 truncate'>{label}</PlankHeading.Label>
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
  return (
    <Plank.Root>
      <Plank.Content>
        <StackPlank {...props} />
      </Plank.Content>
      <Plank.ResizeHandle />
    </Plank.Root>
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
    const [attended] = useState(new Set<string>());
    return (
      <Mosaic.Root>
        <AttentionProvider attended={attended}>
          <Mosaic.DragOverlay />
          <NaturalDeck.Root classNames='fixed inset-0 z-0'>
            <DemoStackPlank />
            <DemoStackPlank />
            <DemoStackPlank />
            <DemoStackPlank />
            <DemoStackPlank />
            <DemoStackPlank />
            <DemoStackPlank />
          </NaturalDeck.Root>
        </AttentionProvider>
      </Mosaic.Root>
    );
  },
};

const IncrementButtons = ({
  index,
  setOpenPlanks,
  openPlanks,
}: {
  index: number;
  openPlanks: string[];
  setOpenPlanks: (setter: (prevOpenPlanksSet: Set<string>) => Set<string>) => void;
}) => {
  return (
    <>
      <Button
        disabled={index < 1}
        variant='ghost'
        classNames='p-1'
        onClick={() =>
          setOpenPlanks((prev: Set<string>) => {
            return new Set([...arrayMove(openPlanks, index, index - 1), ...Array.from(prev)]);
          })
        }
      >
        <CaretLeft />
      </Button>
      <Button
        disabled={index > openPlanks.length - 2}
        variant='ghost'
        classNames='p-1'
        onClick={() =>
          setOpenPlanks((prev) => {
            return new Set([...arrayMove(openPlanks, index, index + 1), ...Array.from(prev)]);
          })
        }
      >
        <CaretRight />
      </Button>
    </>
  );
};

const MENU = 'menu';

export const DynamicBasicStacks = () => {
  const [planks] = useState(
    [...Array(12)]
      .map(() => rollStackPlank(12))
      .reduce((acc: Record<string, PlankProps>, plank) => {
        acc[plank.id] = plank;
        return acc;
      }, {}),
  );
  const [attended] = useState(new Set<string>());

  const [navOpen, setNavOpen] = useState(true);
  const [c11yOpen, setC11yOpen] = useState(false);

  const [navContent, setDirectNavContent] = useState<string | null>(MENU);
  const [c11yContent, setDirectC11yContent] = useState<string | null>(null);

  const [openPlanksSet, setDirectOpenPlanks] = useState<Set<string>>(new Set([MENU]));
  const openPlanks = Array.from(openPlanksSet);
  const openPlanksInDeck = openPlanks.filter((id) => ![navContent, c11yContent].includes(id));

  const setNavContent = (nextContent: string | null) => {
    setDirectNavContent(nextContent);
    setNavOpen(!!nextContent);
  };

  const setC11yContent = (nextContent: string | null) => {
    setDirectC11yContent(nextContent);
    setC11yOpen(!!nextContent);
  };

  const setOpenPlanks = (setter: (prevOpenPlanksSet: Set<string>) => Set<string>) => {
    const nextOpenPlanksSet = setter(openPlanksSet);
    setDirectOpenPlanks(nextOpenPlanksSet);
    if (navContent && !nextOpenPlanksSet.has(navContent)) {
      setNavContent(null);
    }
    if (c11yContent && !nextOpenPlanksSet.has(c11yContent)) {
      setC11yContent(null);
    }
  };

  console.log('[open planks]', openPlanksInDeck, openPlanksSet);

  const menuChildren = (
    <>
      <PlankHeading.Root classNames='pli-px'>
        <PlankHeading.Button>
          <Books {...plankHeadingIconProps} />
        </PlankHeading.Button>
        <PlankHeading.Label classNames='grow'>Menu</PlankHeading.Label>
        {c11yContent === MENU ? (
          <Button variant='ghost' classNames='p-1' onClick={() => setC11yContent(null)}>
            <CaretLineLeft />
          </Button>
        ) : navContent === MENU ? (
          <Button variant='ghost' classNames='p-1' onClick={() => setNavContent(null)}>
            <CaretLineRight />
          </Button>
        ) : (
          <>
            <Button variant='ghost' classNames='p-1' onClick={() => setNavContent(MENU)}>
              <CaretLineLeft />
            </Button>
            <IncrementButtons
              openPlanks={openPlanksInDeck}
              index={openPlanksInDeck.indexOf(MENU)}
              setOpenPlanks={setOpenPlanks}
            />
            <Button variant='ghost' classNames='p-1' onClick={() => setC11yContent(MENU)}>
              <CaretLineRight />
            </Button>
          </>
        )}
      </PlankHeading.Root>
      <div role='none' className='p-1'>
        {Object.values(planks).map(({ label, id }) => {
          return (
            <Button
              key={id}
              variant={openPlanksSet.has(id) ? 'primary' : 'default'}
              classNames='truncate is-full block mlb-2'
              onClick={() =>
                setOpenPlanks((prev) => {
                  prev.has(id) ? prev.delete(id) : prev.add(id);
                  return new Set(Array.from(prev));
                })
              }
            >
              {label}
            </Button>
          );
        })}
      </div>
    </>
  );

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
            <Button variant='ghost' classNames='p-1' onClick={() => setC11yOpen(!c11yOpen)}>
              <SidebarSimple mirrored />
            </Button>
          </Main.Notch>
          <Main.NavigationSidebar>
            {navContent &&
              (navContent === MENU ? (
                menuChildren
              ) : (
                <StackPlank {...planks[navContent]}>
                  <Button variant='ghost' classNames='p-1' onClick={() => setNavContent(null)}>
                    <CaretLineRight />
                  </Button>
                </StackPlank>
              ))}
          </Main.NavigationSidebar>
          <Main.ComplementarySidebar>
            {c11yContent &&
              (c11yContent === MENU ? (
                menuChildren
              ) : (
                <StackPlank {...planks[c11yContent]}>
                  <Button variant='ghost' classNames='p-1' onClick={() => setC11yContent(null)}>
                    <CaretLineLeft />
                  </Button>
                </StackPlank>
              ))}
          </Main.ComplementarySidebar>
          <NaturalDeck.Root classNames='fixed inset-0 z-0'>
            {openPlanksInDeck.map((id, index, arr) =>
              id === MENU ? (
                <Plank.Root key={MENU}>
                  <Plank.Content>{menuChildren}</Plank.Content>
                  <Plank.ResizeHandle />
                </Plank.Root>
              ) : (
                <Plank.Root key={id}>
                  <Plank.Content>
                    <StackPlank {...planks[id]}>
                      <Button variant='ghost' classNames='p-1' onClick={() => setNavContent(id)}>
                        <CaretLineLeft />
                      </Button>
                      <IncrementButtons {...{ index, setOpenPlanks, openPlanks: openPlanksInDeck }} />
                      <Button variant='ghost' classNames='p-1' onClick={() => setC11yContent(id)}>
                        <CaretLineRight />
                      </Button>
                      <Button
                        variant='ghost'
                        classNames='p-1'
                        onClick={() =>
                          setOpenPlanks((prev) => {
                            prev.delete(id);
                            return new Set(Array.from(prev));
                          })
                        }
                      >
                        <X />
                      </Button>
                    </StackPlank>
                  </Plank.Content>
                  <Plank.ResizeHandle />
                </Plank.Root>
              ),
            )}
          </NaturalDeck.Root>
        </Main.Root>
      </AttentionProvider>
    </Mosaic.Root>
  );
};

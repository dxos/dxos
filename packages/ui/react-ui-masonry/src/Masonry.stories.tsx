//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { createContext, useCallback, useContext, useState } from 'react';

import { random } from '@dxos/random';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
import * as Icon from '@dxos/react-ui/Icon';
import * as Layout from '@dxos/react-ui/Layout';
import * as Menu from '@dxos/react-ui/Menu';
import * as Panel from '@dxos/react-ui/Panel';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { Masonry, type MasonryRootProps } from './Masonry.tsx';

random.seed(1);

/** Item counts the toolbar can switch between to exercise the layout under different loads. */
const ITEM_COUNTS = [10, 100, 200, 500] as const;

/** Fisher-Yates shuffle (seeded) so switching sets re-randomizes tile order. */
const shuffle = <T,>(array: readonly T[]): T[] => {
  const copy = [...array];
  for (let index = copy.length - 1; index > 0; index--) {
    const swap = random.number.int({ min: 0, max: index });
    [copy[index], copy[swap]] = [copy[swap], copy[index]];
  }
  return copy;
};

type PersonData = {
  id: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  image?: string;
  emails?: { value: string; label?: string }[];
  notes?: string;
};

// A small fixed pool of inline (data-URI) images, cycled by index, so the bench is fully
// self-contained — even the 500 preset issues zero network requests. Distinct hues keep cards varied.
const IMAGE_POOL = [
  '#e11d48',
  '#db2777',
  '#c026d3',
  '#9333ea',
  '#7c3aed',
  '#4f46e5',
  '#2563eb',
  '#0891b2',
  '#059669',
  '#65a30d',
  '#ca8a04',
  '#ea580c',
].map(
  (color) =>
    `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns='http://www.w3.org/2000/svg' width='256' height='256'><rect width='256' height='256' fill='${color}'/></svg>`,
    )}`,
);

// Generate plain (non-ECHO) data so even the largest preset mounts instantly — the masonry is a
// pure layout component, so seeding a database would only add unrelated cost. Variable notes and a
// cycled image make cards differ in height and exercise the column-balancing layout.
const createPeople = (count: number): PersonData[] =>
  Array.from({ length: count }, (_, index) => {
    const fullName = random.person.fullName();
    const slug = fullName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.+|\.+$/g, '');
    return {
      id: `person-${index}`,
      fullName,
      jobTitle: random.person.jobTitle(),
      department: random.commerce.department(),
      image: IMAGE_POOL[index % IMAGE_POOL.length],
      emails: [
        { value: `${slug}@example.com` },
        ...(index % 3 === 0 ? [{ label: 'work', value: `${slug}@work.example.com` }] : []),
      ],
      notes: index % 2 === 0 ? random.lorem.sentences(random.number.int({ min: 1, max: 4 })) : undefined,
    };
  });

/** Removes a person from the story that shows the card; a tile is given only its data, so the story passes this down. */
const DeleteContext = createContext<(id: string) => void>(() => {});

/** One line of a card under its title: an icon in the start rail and text beside it. */
type GalleryRow = {
  icon: string;
  text: string;
  /** How many lines the text may run to before it is cut; one by default. */
  lines?: number;
};

/** What a gallery card shows, whatever it is a card of: a person, an organization. */
export type GalleryItem = {
  id: string;
  title: string;
  /** The icon beside the title, which says what kind of thing the card is. */
  icon: string;
  image?: string;
  rows: GalleryRow[];
};

const personItem = ({ id, fullName, jobTitle, department, image, emails, notes }: PersonData): GalleryItem => ({
  id,
  title: fullName,
  icon: 'ph--user--regular',
  image,
  rows: [
    ...(jobTitle || department
      ? [{ icon: 'ph--briefcase--regular', text: [jobTitle, department].filter(Boolean).join(' · ') }]
      : []),
    ...(emails ?? []).map((email) => ({ icon: 'ph--envelope-simple--regular', text: email.value })),
    ...(notes ? [{ icon: 'ph--note--regular', text: notes, lines: 4 }] : []),
  ],
});

// Seed the largest preset once so switching counts is a cheap slice.
const PEOPLE = createPeople(ITEM_COUNTS[ITEM_COUNTS.length - 1]).map(personItem);

/**
 * A `grid` card: the picture, then a header and rows that share the card's rails, so the title starts at the same
 * edge as the text of the rows under it, with an icon in the start rail of each and the menu in the end rail.
 */
const StoryItem = ({ data: { id, title, icon, image, rows } }: { data: GalleryItem }) => {
  const onDelete = useContext(DeleteContext);
  return (
    <Card.Root grid size='sm'>
      {image && <Card.Poster alt={title} src={image} />}
      <Card.Header>
        <Layout.Block>
          <Icon.Icon icon={icon} />
        </Layout.Block>
        <Card.Title>{title}</Card.Title>
        <Card.Menu label={`Actions for ${title}`}>
          <Menu.Item
            item={{ value: 'delete', label: 'Delete', icon: 'ph--trash--regular' }}
            onClick={() => onDelete(id)}
          />
        </Card.Menu>
      </Card.Header>
      {rows.map(({ icon, text, lines }) => (
        <Card.Row key={`${icon}:${text}`} icon={icon} align={lines ? 'start' : undefined}>
          <Card.Text variant='muted' lines={lines}>
            {text}
          </Card.Text>
        </Card.Row>
      ))}
    </Card.Root>
  );
};

// A random subset of the generated people is rendered so the toolbar can switch the item count
// (bulk render under load, re-shuffled each time) and add/remove single tiles (the small-edit
// reflow animation).
const DefaultStory = (props: MasonryRootProps) => {
  const [visible, setVisible] = useState<GalleryItem[]>(() => shuffle(PEOPLE).slice(0, ITEM_COUNTS[0]));

  const addOne = () =>
    setVisible((current) => {
      const shown = new Set(current.map((person) => person.id));
      const candidates = PEOPLE.filter((person) => !shown.has(person.id));
      if (candidates.length === 0) {
        return current;
      }
      const person = candidates[random.number.int({ min: 0, max: candidates.length - 1 })];
      const next = [...current];
      next.splice(random.number.int({ min: 0, max: current.length }), 0, person);
      return next;
    });

  const remove = useCallback((id: string) => setVisible((current) => current.filter((person) => person.id !== id)), []);

  const removeOne = () =>
    setVisible((current) => {
      if (current.length === 0) {
        return current;
      }
      const index = random.number.int({ min: 0, max: current.length - 1 });
      return current.filter((_, position) => position !== index);
    });

  return (
    <DeleteContext.Provider value={remove}>
      <Panel.Root>
        <Panel.Header>
          <Toolbar.Root>
            {ITEM_COUNTS.map((count) => (
              <Button.Root key={count} onClick={() => setVisible(shuffle(PEOPLE).slice(0, count))}>
                {count}
              </Button.Root>
            ))}
            <Button.Root onClick={addOne}>Add one</Button.Root>
            <Button.Root onClick={removeOne}>Remove one</Button.Root>
            <Button.Root onClick={() => setVisible([])}>Clear</Button.Root>
          </Toolbar.Root>
        </Panel.Header>
        <Panel.Body>
          <Masonry.Root {...props} Tile={StoryItem}>
            <Masonry.Content>
              <Masonry.Viewport items={visible} getId={(person) => person.id} />
            </Masonry.Content>
          </Masonry.Root>
        </Panel.Body>
      </Panel.Root>
    </DeleteContext.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-masonry/Masonry',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
  },
  argTypes: {
    animate: { control: 'boolean' },
  },
  args: {
    animate: true,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

//
// Docs
//

type DocsStoryProps = {
  /** The cards to show; without them, some of the generated people. */
  items?: GalleryItem[];
};

/** How many of the generated people the gallery shows when it is given none. */
const DOCS_PEOPLE = 24;

const DocsStory = ({ items: initial = PEOPLE.slice(0, DOCS_PEOPLE) }: DocsStoryProps) => {
  const [items, setItems] = useState(initial);
  const remove = useCallback((id: string) => setItems((current) => current.filter((item) => item.id !== id)), []);
  return (
    <DeleteContext.Provider value={remove}>
      <div className='fixed inset-0 flex dx-base-surface'>
        <Masonry.Root Tile={StoryItem} minColumnWidth={10}>
          <Masonry.Content>
            <Masonry.Viewport items={items} getId={(item) => item.id} />
          </Masonry.Content>
        </Masonry.Root>
      </div>
    </DeleteContext.Provider>
  );
};

/** The docs' gallery: cards of different heights in columns at least 10rem wide; a card's menu deletes it. */
export const Docs: StoryObj<DocsStoryProps> = {
  render: (args) => <DocsStory {...args} />,
};

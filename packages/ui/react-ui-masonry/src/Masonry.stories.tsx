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

export type PersonData = {
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

// Seed the largest preset once so switching counts is a cheap slice.
const PEOPLE = createPeople(ITEM_COUNTS[ITEM_COUNTS.length - 1]);

/** Removes a person from the story that shows the card; a tile is given only its data, so the story passes this down. */
const DeleteContext = createContext<(id: string) => void>(() => {});

/**
 * A person as a `grid` card: the photo, then a header and rows that share the card's rails, so the name starts at the
 * same edge as the text of the rows under it, with an icon in the start rail of each and the menu in the end rail.
 */
const StoryItem = ({ data: person }: { data: PersonData }) => {
  const { id, fullName, jobTitle, department, image, emails, notes } = person;
  const onDelete = useContext(DeleteContext);
  const role = [jobTitle, department].filter(Boolean).join(' · ');
  return (
    <Card.Root grid>
      {image && <Card.Poster alt={fullName ?? ''} src={image} />}
      <Card.Header>
        <Layout.Block>
          <Icon.Icon icon='ph--user--regular' />
        </Layout.Block>
        <Card.Title>{fullName}</Card.Title>
        <Card.Menu label={`Actions for ${fullName}`}>
          <Menu.Item
            item={{ value: 'delete', label: 'Delete', icon: 'ph--trash--regular' }}
            onClick={() => onDelete(id)}
          />
        </Card.Menu>
      </Card.Header>
      {role && (
        <Card.Row icon='ph--briefcase--regular'>
          <Card.Text variant='muted'>{role}</Card.Text>
        </Card.Row>
      )}
      {emails?.map((email) => (
        <Card.Row key={email.value} icon='ph--envelope-simple--regular'>
          <Card.Text variant='muted'>{email.value}</Card.Text>
        </Card.Row>
      ))}
      {notes && (
        <Card.Row icon='ph--note--regular' align='start'>
          <Card.Text variant='muted'>{notes}</Card.Text>
        </Card.Row>
      )}
    </Card.Root>
  );
};

// A random subset of the generated people is rendered so the toolbar can switch the item count
// (bulk render under load, re-shuffled each time) and add/remove single tiles (the small-edit
// reflow animation).
const DefaultStory = (props: MasonryRootProps) => {
  const [visible, setVisible] = useState<PersonData[]>(() => shuffle(PEOPLE).slice(0, ITEM_COUNTS[0]));

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
  /** The people to show; without them, some of the generated ones. */
  people?: PersonData[];
};

/** How many of the generated people the gallery shows when it is given none. */
const DOCS_PEOPLE = 24;

const DocsStory = ({ people: initial = PEOPLE.slice(0, DOCS_PEOPLE) }: DocsStoryProps) => {
  const [people, setPeople] = useState(initial);
  const remove = useCallback((id: string) => setPeople((current) => current.filter((person) => person.id !== id)), []);
  return (
    <DeleteContext.Provider value={remove}>
      <div className='fixed inset-0 flex dx-base-surface'>
        <Masonry.Root Tile={StoryItem} minColumnWidth={10}>
          <Masonry.Content>
            <Masonry.Viewport items={people} getId={(person) => person.id} />
          </Masonry.Content>
        </Masonry.Root>
      </div>
    </DeleteContext.Provider>
  );
};

/** The docs' gallery: person cards of different heights in columns at least 10rem wide; a card's menu deletes it. */
export const Docs: StoryObj<DocsStoryProps> = {
  render: (args) => <DocsStory {...args} />,
};

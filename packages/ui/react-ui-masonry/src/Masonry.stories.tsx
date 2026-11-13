//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { random } from '@dxos/random';
import * as Button from '@dxos/react-ui/Button';
import * as Card from '@dxos/react-ui/Card';
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

// Seed the largest preset once so switching counts is a cheap slice.
const PEOPLE = createPeople(ITEM_COUNTS[ITEM_COUNTS.length - 1]);

const StoryItem = ({ data: person }: { data: PersonData }) => {
  const { fullName, jobTitle, department, image, emails, notes } = person;
  const role = [jobTitle, department].filter(Boolean).join(' · ');
  return (
    <Card.Root>
      <Card.Header>
        <Card.Title>{fullName}</Card.Title>
      </Card.Header>
      {image && <Card.Poster alt={fullName ?? ''} src={image} />}
      {role && (
        <Card.Row classNames='px-2'>
          <Card.Text variant='muted'>{role}</Card.Text>
        </Card.Row>
      )}
      {emails && emails.length > 0 && (
        <Card.Row classNames='px-2'>
          <Card.Text variant='muted'>{emails.map((email) => email.value).join(', ')}</Card.Text>
        </Card.Row>
      )}
      {notes && (
        <Card.Row classNames='px-2 pb-2'>
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

  const removeOne = () =>
    setVisible((current) => {
      if (current.length === 0) {
        return current;
      }
      const index = random.number.int({ min: 0, max: current.length - 1 });
      return current.filter((_, position) => position !== index);
    });

  return (
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

type Photo = { id: string; title: string; color: string; height: number; caption?: string };

const PHOTOS: Photo[] = [
  { id: '1', title: 'Harbor', color: '#0891b2', height: 80, caption: 'Boats at first light.' },
  { id: '2', title: 'Dunes', color: '#ca8a04', height: 48 },
  { id: '3', title: 'Forest', color: '#059669', height: 104, caption: 'A path through the pines, after rain.' },
  { id: '4', title: 'Peaks', color: '#4f46e5', height: 64 },
  { id: '5', title: 'Market', color: '#e11d48', height: 88, caption: 'Saturday stalls.' },
  { id: '6', title: 'Canyon', color: '#ea580c', height: 56 },
  { id: '7', title: 'Lagoon', color: '#2563eb', height: 72, caption: 'Still water, no wind.' },
  { id: '8', title: 'Meadow', color: '#65a30d', height: 60 },
  { id: '9', title: 'Glacier', color: '#0ea5e9', height: 120, caption: 'Blue ice under a grey sky.' },
  { id: '10', title: 'Orchard', color: '#16a34a', height: 52 },
  { id: '11', title: 'Lighthouse', color: '#dc2626', height: 96, caption: 'The lamp turns at dusk.' },
  { id: '12', title: 'Desert', color: '#d97706', height: 68 },
  { id: '13', title: 'Bridge', color: '#7c3aed', height: 84, caption: 'Fog over the river.' },
  { id: '14', title: 'Reef', color: '#0d9488', height: 44 },
  { id: '15', title: 'Vineyard', color: '#9333ea', height: 112, caption: 'Rows down to the lake.' },
  { id: '16', title: 'Tundra', color: '#64748b', height: 58 },
  { id: '17', title: 'Waterfall', color: '#0284c7', height: 100, caption: 'Spray on the ferns.' },
  { id: '18', title: 'Prairie', color: '#a16207', height: 50 },
  { id: '19', title: 'Island', color: '#0f766e', height: 76, caption: 'One palm, one hut.' },
  { id: '20', title: 'Volcano', color: '#b91c1c', height: 92 },
  { id: '21', title: 'Marsh', color: '#4d7c0f', height: 54, caption: 'Herons at low tide.' },
  { id: '22', title: 'Summit', color: '#4338ca', height: 108 },
  { id: '23', title: 'Harvest', color: '#c2410c', height: 62, caption: 'Bales in the field.' },
  { id: '24', title: 'Cove', color: '#0369a1', height: 46 },
  { id: '25', title: 'Aurora', color: '#7e22ce', height: 116, caption: 'Green light over the bay.' },
  { id: '26', title: 'Garden', color: '#15803d', height: 66 },
  { id: '27', title: 'Quarry', color: '#78716c', height: 82, caption: 'Swimmers on the ledge.' },
  { id: '28', title: 'Lake', color: '#1d4ed8', height: 56 },
  { id: '29', title: 'Mesa', color: '#b45309', height: 98, caption: 'Red rock at noon.' },
  { id: '30', title: 'Fjord', color: '#155e75', height: 70 },
  { id: '31', title: 'Pier', color: '#be123c', height: 86, caption: 'Gulls on every post.' },
  { id: '32', title: 'Steppe', color: '#57534e', height: 48 },
];

const PhotoTile = ({ data: photo }: { data: Photo }) => (
  <Card.Root>
    <div style={{ height: photo.height, background: photo.color }} />
    <Card.Header>
      <Card.Title>{photo.title}</Card.Title>
    </Card.Header>
    {photo.caption && (
      <Card.Row classNames='pb-2'>
        <Card.Text variant='muted' lines={2}>
          {photo.caption}
        </Card.Text>
      </Card.Row>
    )}
  </Card.Root>
);

/** The docs' gallery: photos of different heights in columns at least 9rem wide. */
export const Docs: Story = {
  render: () => (
    <div className='fixed inset-0 flex dx-base-surface'>
      <Masonry.Root Tile={PhotoTile} minColumnWidth={9}>
        <Masonry.Content>
          <Masonry.Viewport items={PHOTOS} getId={(photo) => photo.id} />
        </Masonry.Content>
      </Masonry.Root>
    </div>
  ),
};

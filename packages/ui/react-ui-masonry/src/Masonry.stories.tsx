//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo, useState } from 'react';

import { random } from '@dxos/random';
import { Card, Panel, Toolbar } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { Masonry, type MasonryRootProps } from './Masonry';

random.seed(1);

/** Item counts the toolbar can switch between to exercise the layout under different loads. */
const ITEM_COUNTS = [100, 200, 500] as const;

type PersonData = {
  id: string;
  fullName: string;
  jobTitle?: string;
  department?: string;
  image?: string;
  emails?: { value: string; label?: string }[];
  notes?: string;
};

// Generate plain (non-ECHO) data so even the largest preset mounts instantly — the masonry is a
// pure layout component, so seeding a database would only add unrelated cost. Variable notes and a
// distinct image per person make cards differ in height and exercise the column-balancing layout.
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
      image: `https://picsum.photos/seed/${random.string.uuid()}/256/256`,
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
      {image && <Card.Poster alt={fullName ?? ''} image={image} />}
      {role && (
        <Card.Row classNames='px-2'>
          <Card.Text variant='description'>{role}</Card.Text>
        </Card.Row>
      )}
      {emails && emails.length > 0 && (
        <Card.Row classNames='px-2'>
          <Card.Text variant='description'>{emails.map((email) => email.value).join(', ')}</Card.Text>
        </Card.Row>
      )}
      {notes && (
        <Card.Row classNames='px-2 pb-2'>
          <Card.Text variant='description'>{notes}</Card.Text>
        </Card.Row>
      )}
    </Card.Root>
  );
};

// A slice of the generated people is rendered so the toolbar can switch the item count (bulk
// render under load) and add/remove single tiles (the small-edit reflow animation).
const DefaultStory = (props: MasonryRootProps) => {
  const [limit, setLimit] = useState<number>(ITEM_COUNTS[0]);
  const visible = useMemo(() => PEOPLE.slice(0, limit), [limit]);

  return (
    <Panel.Root>
      <Panel.Toolbar asChild>
        <Toolbar.Root>
          {ITEM_COUNTS.map((count) => (
            <Toolbar.Button key={count} onClick={() => setLimit(count)}>
              {count}
            </Toolbar.Button>
          ))}
          <Toolbar.Button onClick={() => setLimit((value) => Math.min(PEOPLE.length, value + 1))}>
            Add one
          </Toolbar.Button>
          <Toolbar.Button onClick={() => setLimit((value) => Math.max(0, value - 1))}>Remove one</Toolbar.Button>
        </Toolbar.Root>
      </Panel.Toolbar>
      <Panel.Content>
        <Masonry.Root {...props} Tile={StoryItem}>
          <Masonry.Content>
            <Masonry.Viewport items={visible} getId={(person) => person.id} />
          </Masonry.Content>
        </Masonry.Root>
      </Panel.Content>
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

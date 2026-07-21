//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Filter, Obj } from '@dxos/echo';
import { useQuery } from '@dxos/echo-react';
import { random } from '@dxos/random';
import { useClientStory, withClientProvider } from '@dxos/react-client/testing';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { Person } from '@dxos/types';

import { Masonry, type MasonryRootProps } from './Masonry';

random.seed(1);

const generator: ValueGenerator = random as any;

const StoryItem = ({ data: person }: { data: Person.Person }) => {
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

const DefaultStory = (props: MasonryRootProps) => {
  const { space } = useClientStory();
  const people = useQuery(space?.db, Filter.type(Person.Person));

  return (
    <Masonry.Root {...props} Tile={StoryItem}>
      <Masonry.Content>
        <Masonry.Viewport items={people} getId={(person) => person.id} />
      </Masonry.Content>
    </Masonry.Root>
  );
};

const meta = {
  title: 'ui/react-ui-masonry/Masonry',
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      types: [Person.Person],
      createIdentity: true,
      createSpace: true,
      onCreateSpace: async ({ space }) => {
        const createObjects = createObjectFactory(space.db, generator);
        const objects = await createObjects([{ type: Person.Person, count: 36 }]);

        // The generator only populates fields with a GeneratorAnnotation and skips array fields;
        // enrich each person (job data, distinct image, emails, variable-length notes) so cards vary
        // in height and exercise the column-balancing layout.
        objects
          .filter((object): object is Person.Person => Obj.instanceOf(Person.Person, object))
          .forEach((person, index) => {
            Obj.update(person, (person: Obj.Mutable<Person.Person>) => {
              person.jobTitle = random.person.jobTitle();
              person.department = random.commerce.department();
              person.image = `https://picsum.photos/seed/${random.string.uuid()}/256/256`;
              const slug = (person.fullName ?? 'user')
                .toLowerCase()
                .replace(/[^a-z0-9]+/g, '.')
                .replace(/^\.+|\.+$/g, '');
              person.emails = [
                { value: `${slug}@example.com` },
                ...(index % 3 === 0 ? [{ label: 'work', value: `${slug}@work.example.com` }] : []),
              ];
              if (index % 2 === 0) {
                person.notes = random.lorem.sentences(random.number.int({ min: 1, max: 4 }));
              }
            });
          });
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

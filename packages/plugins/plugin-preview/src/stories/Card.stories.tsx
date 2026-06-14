//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { withPluginManager } from '@dxos/app-framework/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { random } from '@dxos/random';
import { Card } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import { type Expando } from '@dxos/schema';
import { type Organization, type Person, type Pipeline, type Task } from '@dxos/types';

import { translations } from '#translations';

import { ExpandoCard, FormCard, JsonCard, OrganizationCard, PersonCard, ProjectCard, TaskCard } from '../cards';
import {
  DefaultStory,
  createExpando,
  createOrganization,
  createPerson,
  createPersonEmpty,
  createProject,
  createTableEmpty,
  createTask,
  createUnknown,
} from './testing';

random.seed(999);

const meta = {
  title: 'plugins/plugin-preview/cards/Card',
  render: DefaultStory,
  decorators: [
    // `Card` and its descendants in `@dxos/react-ui` consume `ThemeContext`
    // for tx-token resolution; without this the stories trip the surface's
    // `ErrorBoundary` with "Missing ThemeContext" and the storybook test
    // assert-no-error fails.
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    // TODO(wittjosiah): Try to write story which does not depend on plugin manager.
    withPluginManager({ plugins: corePlugins() }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
  tags: ['cards'],
} satisfies Meta<typeof DefaultStory>;

export default meta;

export const _Form: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: FormCard,
    createObject: createPerson,
    image: true,
  },
};

export const _FormEditable: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: FormCard,
    createObject: createPerson,
    image: true,
    componentProps: { readonly: false, layout: 'full' },
  },
};

/**
 * Empty-state variant: the subject has no resolvable schema so `FormCard` renders
 * `<Card.Body><Card.Row><Card.Text variant='description'>No preview</Card.Text></Card.Row></Card.Body>`.
 * Use this story to verify the empty message lands in the card's center column.
 */
export const _FormEmpty: StoryObj<typeof DefaultStory> = {
  args: {
    Component: FormCard,
    createObject: createUnknown,
  },
};

/**
 * No-values variant: the subject has a valid schema (Person) but no populated
 * fields, so `FormCard` falls through to the same empty state instead of
 * rendering an empty scrollarea.
 */
export const _FormNoValues: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: FormCard,
    createObject: createPersonEmpty,
  },
};

/**
 * Table-like variant: the subject has values only in form-hidden fields
 * (`view`, `sizes` annotated `FormInputAnnotation.set(false)`). `FormCard`
 * must consult the schema's form-input annotations — not just `Object.keys` —
 * to recognize this case and fall through to the empty state.
 */
export const _FormTableEmpty: StoryObj<typeof DefaultStory<any>> = {
  args: {
    Component: FormCard,
    createObject: createTableEmpty,
  },
};

export const _Person: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: PersonCard,
    createObject: createPerson,
    image: true,
  },
};

export const _PersonNoImage: StoryObj<typeof DefaultStory<Person.Person>> = {
  args: {
    Component: PersonCard,
    createObject: createPerson,
  },
};

export const _Organization: StoryObj<typeof DefaultStory<Organization.Organization>> = {
  args: {
    Component: OrganizationCard,
    createObject: createOrganization,
    image: true,
  },
};

export const _OrganizationNoImage: StoryObj<typeof DefaultStory<Organization.Organization>> = {
  args: {
    Component: OrganizationCard,
    createObject: createOrganization,
  },
};

export const _Pipeline: StoryObj<typeof DefaultStory<Pipeline.Pipeline>> = {
  args: {
    Component: ProjectCard,
    createObject: createProject,
    image: true,
  },
};

export const _Task: StoryObj<typeof DefaultStory<Task.Task>> = {
  args: {
    Component: TaskCard,
    createObject: createTask,
    image: true,
  },
};

export const _Expando: StoryObj<typeof DefaultStory<Expando.Expando>> = {
  args: {
    Component: ExpandoCard,
    createObject: createExpando,
  },
};

export const _Json = {
  render: () => {
    const data = {
      subject: {
        id: random.string.uuid(),
        name: random.person.fullName(),
        email: random.internet.email(),
        tags: [random.lorem.word(), random.lorem.word(), random.lorem.word()],
        nested: {
          count: random.number.int({ max: 100 }),
          active: random.datatype.boolean(),
        },
      },
    };

    return (
      <div className='flex justify-center p-16'>
        <div className='dx-card-min-width dx-card-max-width'>
          <Card.Root>
            <Card.Header>
              <Card.Block />
              <Card.Title>JSON</Card.Title>
            </Card.Header>
            <JsonCard data={data} />
          </Card.Root>
        </div>
      </div>
    );
  },
};

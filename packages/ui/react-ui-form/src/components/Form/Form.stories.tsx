//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useCallback, useState } from 'react';

import { Obj, Tag, Type } from '@dxos/echo';
import { type AnyProperties } from '@dxos/echo/internal';
import { log } from '@dxos/log';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Tooltip } from '@dxos/react-ui';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Organization, Person, TestLayout } from '../../testing';
import { type ExcludeId, omitId } from '../../util';
import { Form, type FormRootProps } from './Form';

type DefaultStoryProps<T extends AnyProperties> = {
  schema?: Schema.Schema<T>;
} & FormRootProps<T>;

const DefaultStory = <T extends AnyProperties = AnyProperties>({
  schema,
  values: valuesProp,
  ...props
}: DefaultStoryProps<T>) => {
  const [values, setValues] = useState<Partial<T>>(valuesProp ?? {});
  const spaces = useSpaces();
  const space = spaces[0];
  const handleSave = useCallback<NonNullable<FormRootProps<T>['onSave']>>((values) => {
    log.info('save', { values, meta });
    setValues(values);
  }, []);

  const handleCancel = useCallback<NonNullable<FormRootProps<T>['onCancel']>>(() => {
    log.info('cancel');
    setValues(valuesProp ?? {});
  }, []);

  if (!space) {
    return <Loading />;
  }

  return (
    <Tooltip.Provider>
      <TestLayout json={{ values, schema: schema?.ast }}>
        <Form.Root
          schema={schema}
          defaultValues={values}
          db={space.db}
          onSave={handleSave}
          onCancel={handleCancel}
          {...props}
        >
          <Form.Viewport scroll>
            <Form.Content>
              <Form.Section label='Section' description='This is a section' />
              <Form.FieldSet />
              <Form.Actions />
            </Form.Content>
          </Form.Viewport>
        </Form.Root>
      </TestLayout>
    </Tooltip.Provider>
  );
};

const meta = {
  title: 'ui/react-ui-form/Form',
  component: Form.Root,
  render: DefaultStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Tag.Tag, Organization, Person],
      onCreateSpace: ({ space }) => {
        [
          ...Array.from({ length: 3 }).map((_, i) => Obj.make(Tag.Tag, { label: `Tag ${i}` })),
          ...Array.from({ length: 50 }).map((_, i) => Obj.make(Organization, { name: `Organization ${i}` })),
        ].map((obj) => space.db.add(obj));
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<DefaultStoryProps<any>>;

export default meta;

type Story<T extends AnyProperties> = StoryObj<DefaultStoryProps<T>>;

const PersonSchema = Type.getSchema(Person);

const values: Partial<Person> = {
  name: 'Alice',
  location: [40.7128, -74.006],
  tasks: ['task 1', 'task 2'],
  birthday: '1990-05-12',
  meetingAt: '2026-06-01T15:30:00.000Z',
  reminderAt: '09:00:00',
};

export const Default: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    autoSave: true,
  },
};

export const Readonly: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    readonly: true,
  },
};

export const Static: Story<ExcludeId<typeof PersonSchema>> = {
  args: {
    schema: omitId(PersonSchema),
    values,
    layout: 'static',
  },
};

export const Empty: Story<ExcludeId<typeof PersonSchema>> = {
  args: {},
};

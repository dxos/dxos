//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React, { useState } from 'react';

import { Annotation, Obj, Ref } from '@dxos/echo';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Organization, TestLayout } from '../../../../../testing';
import { Form } from '../../../Form';

// Picker: select an existing Organization.
const RefSchema = Schema.Struct({
  employer: Ref.Ref(Organization).annotations({ title: 'Employer' }),
}).pipe(Schema.mutable);

// Inline: edit the referenced Organization's fields in a nested form.
const InlineSchema = Schema.Struct({
  employer: Ref.Ref(Organization).pipe(
    Schema.annotations({ title: 'Employer' }),
    Annotation.FormInlineAnnotation.set(true),
  ),
}).pipe(Schema.mutable);

const RefStory = ({ schema }: { schema: Schema.Schema<any> }) => {
  const spaces = useSpaces();
  const space = spaces[0];
  const [values, setValues] = useState<Record<string, unknown>>({});
  if (!space) {
    return <Loading />;
  }

  return (
    <TestLayout json={values}>
      <Form.Root
        schema={schema}
        values={values}
        db={space.db}
        onValuesChanged={(values) => setValues((prev) => ({ ...prev, ...values }))}
        // `name` is required; the inline create starts from `{}`, so seed a default the form can then edit.
        onCreate={(_type, props: any) => space.db.add(Obj.make(Organization, { name: 'New organization', ...props }))}
      >
        <Form.Viewport>
          <Form.Content>
            <Form.FieldSet />
          </Form.Content>
        </Form.Viewport>
      </Form.Root>
    </TestLayout>
  );
};

const meta = {
  title: 'ui/react-ui-form/FormField/RefField',
  render: RefStory,
  decorators: [
    withTheme(),
    withLayout({ layout: 'fullscreen' }),
    withClientProvider({
      createIdentity: true,
      createSpace: true,
      types: [Organization],
      onCreateSpace: ({ space }) => {
        Array.from({ length: 8 }).forEach((_, i) =>
          space.db.add(Obj.make(Organization, { name: `Organization ${i}` })),
        );
      },
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof RefStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    schema: RefSchema,
  },
};

export const Inline: Story = {
  args: {
    schema: InlineSchema,
  },
};

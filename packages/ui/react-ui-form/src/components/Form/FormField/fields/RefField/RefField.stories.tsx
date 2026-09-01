//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import * as Struct from 'effect/Struct';
import React, { useState } from 'react';

import { Annotation, Obj, Ref } from '@dxos/echo';
import { useSpaces } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { Loading, withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '#translations';

import { Organization, TestLayout } from '../../../../../testing/index.ts';
import { Form } from '../../../Form.tsx';

// Picker: select an existing Organization.
const RefSchema = Schema.Struct({
  employer: Ref.Ref(Organization).annotate({ title: 'Employer' }),
}).mapFields(Struct.map(Schema.mutableKey));

// Inline: edit the referenced Organization's fields in a nested form.
const InlineSchema = Schema.Struct({
  employer: Ref.Ref(Organization).pipe(
    Schema.annotate({ title: 'Employer' }),
    Annotation.FormInlineAnnotation.set(true),
  ),
}).mapFields(Struct.map(Schema.mutableKey));

const RefStory = ({ schema }: { schema: Schema.Codec<any, any> }) => {
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

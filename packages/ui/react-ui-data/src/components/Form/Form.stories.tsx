//
// Copyright 2024 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useCallback, useState } from 'react';

import { AST, Format, S } from '@dxos/echo-schema';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { Form, type FormProps } from './Form';
import translations from '../../translations';
import { TestLayout, TestPanel } from '../testing';

const TestSchema = S.Struct({
  name: S.optional(S.String.annotations({ [AST.TitleAnnotationId]: 'Name' })),
  active: S.optional(S.Boolean.annotations({ [AST.TitleAnnotationId]: 'Active' })),
  rank: S.optional(S.Number.annotations({ [AST.TitleAnnotationId]: 'Rank' })),
  website: S.optional(Format.URI.annotations({ [AST.TitleAnnotationId]: 'Website' })),
  location: S.optional(Format.LatLng.annotations({ [AST.TitleAnnotationId]: 'Location' })),
}).pipe(S.mutable);

type TestType = S.Schema.Type<typeof TestSchema>;

type StoryProps = FormProps<TestType>;

const DefaultStory = ({ values: initialValues }: StoryProps) => {
  const [values, setValues] = useState(initialValues);

  const handleSave = useCallback<NonNullable<FormProps<TestType>['onSave']>>((values) => {
    setValues(values);
  }, []);

  return (
    <TestLayout json={{ values, schema: TestSchema.ast.toJSON() }}>
      <TestPanel>
        <Form<TestType> schema={TestSchema} values={values} onSave={handleSave} />
      </TestPanel>
    </TestLayout>
  );
};

const meta: Meta<StoryProps> = {
  title: 'ui/react-ui-data/Form',
  component: Form,
  render: DefaultStory,
  decorators: [withLayout({ fullscreen: true }), withTheme],
  parameters: {
    translations,
  },
};

export default meta;

type Story = StoryObj<StoryProps>;

export const Default: Story = {
  args: {
    values: {
      name: 'DXOS',
      active: true,
    },
  },
};

//
// Copyright 2024 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Schema from 'effect/Schema';
import React from 'react';

import { random } from '@dxos/random';
import { Button, Input } from '@dxos/react-ui';
import { withLayout, withTheme } from '@dxos/react-ui/testing';

import { translations } from '../../translations';
import { Settings } from './Settings';

random.seed(132);

const DefaultStory = () => {
  return (
    <Settings.Viewport>
      <Settings.Section title='Settings' description={random.lorem.paragraphs(1)}>
        <Settings.Item title={random.lorem.sentence(2)} description={random.lorem.paragraphs(1)}>
          <Input.TextInput placeholder='Input' />
        </Settings.Item>
        <Settings.Item title={random.lorem.sentence(2)} description={random.lorem.paragraphs(2)}>
          <Input.Switch />
        </Settings.Item>
        <Settings.Item title={random.lorem.sentence(3)} description={random.lorem.paragraphs(2)}>
          <Button>Test</Button>
        </Settings.Item>
      </Settings.Section>
      <Settings.Section title='Panel Example'>
        <Settings.Panel>
          <h3 className='text-lg mb-2'>Members</h3>
          <p className='text-description'>Content inside a panel.</p>
        </Settings.Panel>
      </Settings.Section>
    </Settings.Viewport>
  );
};

const meta = {
  title: 'ui/react-ui-form/Settings',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

const TestViewModes = ['preview', 'readonly', 'source'] as const;
const TestViewMode = Schema.Union(...TestViewModes.map((mode) => Schema.Literal(mode)));

const TestSettings = Schema.mutable(
  Schema.Struct({
    viewMode: TestViewMode.annotations({ title: 'View mode', description: 'Default document view mode.' }),
    toolbar: Schema.optional(Schema.Boolean.annotations({ title: 'Show toolbar', description: 'Display formatting toolbar.' })),
    fontSize: Schema.optional(Schema.Number.annotations({ title: 'Font size', description: 'Editor font size in pixels.' })),
    placeholder: Schema.optional(Schema.String.annotations({ title: 'Placeholder', description: 'Default placeholder text.' })),
    debug: Schema.optional(Schema.Boolean.annotations({ title: 'Debug mode', description: 'Enable debug features.' })),
  }),
);

type TestSettings = Schema.Schema.Type<typeof TestSettings>;

const FieldSetStory = () => {
  const [values, setValues] = React.useState<TestSettings>({
    viewMode: 'preview',
    toolbar: true,
    fontSize: 14,
    debug: false,
  });

  return (
    <Settings.Viewport>
      <Settings.Section title='Plugin Settings (Auto-generated)'>
        <Settings.FieldSet
          schema={TestSettings}
          values={values}
          onValuesChanged={setValues}
          visible={(path, values) => path !== 'placeholder' || !!values.debug}
        />
      </Settings.Section>
    </Settings.Viewport>
  );
};

export const FieldSet: Story = {
  render: FieldSetStory,
};

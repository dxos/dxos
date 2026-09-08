//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { translations } from '#translations';

import { Field, Fieldset } from '../components';
import { withLayoutVariants, withTheme } from '../testing';

type StoryArgs = {
  disabled?: boolean;
  invalid?: boolean;
};

/**
 * One small form set, repeated on each surface of the elevation ladder, so the input surfaces,
 * borders and focus bands can be read against the host they sit on rather than in isolation.
 */
const DefaultStory = ({ disabled, invalid }: StoryArgs) => (
  <Fieldset.Root disabled={disabled} invalid={invalid} classNames='flex flex-col'>
    <Fieldset.Legend>Profile</Fieldset.Legend>
    <Fieldset.HelperText>Shown to other members of the space.</Fieldset.HelperText>
    <Field.Root>
      <Field.Label>Display name</Field.Label>
      <Field.Input placeholder='Alice' />
    </Field.Root>
    <Field.Root>
      <Field.Label>Bio</Field.Label>
      <Field.Textarea placeholder='A line or two.' rows={2} />
      <Field.HelperText>Plain text; links are not rendered.</Field.HelperText>
    </Field.Root>
    <Field.Root validationValence={invalid ? 'error' : undefined}>
      <Field.Label>Handle</Field.Label>
      <Field.Input placeholder='alice' start={<span className='text-sm'>@</span>} />
      {invalid ? (
        <Field.ErrorText>That handle is taken.</Field.ErrorText>
      ) : (
        <Field.HelperText>Letters, digits and dashes.</Field.HelperText>
      )}
    </Field.Root>
    <Field.Switch>Show my presence</Field.Switch>
    <Fieldset.ErrorText>Some fields need attention.</Fieldset.ErrorText>
  </Fieldset.Root>
);

const meta = {
  title: 'ui/react-ui-core/playground/Elevation',
  component: DefaultStory,
  decorators: [withTheme(), withLayoutVariants({ classNames: 'w-[36rem]' })],
  parameters: { layout: 'centered', translations },
  args: { disabled: false, invalid: false },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Invalid: Story = {
  args: { invalid: true },
};

export const Disabled: Story = {
  args: { disabled: true },
};

//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { translations } from '#translations';

import { Fieldset, Input } from '../components';
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
    <Input.Root>
      <Input.Label>Display name</Input.Label>
      <Input.TextInput placeholder='Alice' />
    </Input.Root>
    <Input.Root>
      <Input.Label>Bio</Input.Label>
      <Input.TextArea placeholder='A line or two.' rows={2} />
      <Input.DescriptionAndValidation>
        <Input.Description>Plain text; links are not rendered.</Input.Description>
      </Input.DescriptionAndValidation>
    </Input.Root>
    <Input.Root validationValence={invalid ? 'error' : undefined}>
      <Input.Label>Handle</Input.Label>
      <Input.TextInput placeholder='alice' start={<span className='text-sm'>@</span>} />
      <Input.DescriptionAndValidation>
        {invalid ? (
          <Input.Validation>That handle is taken.</Input.Validation>
        ) : (
          <Input.Description>Letters, digits and dashes.</Input.Description>
        )}
      </Input.DescriptionAndValidation>
    </Input.Root>
    <Input.Root>
      <div className='flex items-center gap-2'>
        <Input.Switch />
        <Input.Label>Show my presence</Input.Label>
      </div>
    </Input.Root>
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

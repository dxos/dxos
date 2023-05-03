//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { MessageValence } from '@dxos/aurora-types';

import {
  Description,
  DescriptionAndValidation,
  InputRoot,
  Label,
  PinInput as NaturalPinInput,
  TextInput as NaturalTextInput,
  Validation
} from './Input';

type StoryInputProps = Partial<{
  label: string;
  placeholder: string;
  disabled: boolean;
  description: string;
  labelVisuallyHidden: boolean;
  descriptionVisuallyHidden: boolean;
  size: 'pin';
  validationMessage: string;
  validationValence: MessageValence;
}>;

const StoryInput = ({
  size,
  label,
  description,
  labelVisuallyHidden,
  descriptionVisuallyHidden,
  validationValence,
  validationMessage,
  ...props
}: StoryInputProps) => {
  // TODO(thure): Implement
  return (
    <InputRoot {...{ validationValence }}>
      <Label srOnly={labelVisuallyHidden}>{label}</Label>
      {size === 'pin' && <NaturalPinInput {...props} />}
      {size !== 'pin' && <NaturalTextInput {...props} />}
      <DescriptionAndValidation srOnly={descriptionVisuallyHidden}>
        {validationMessage && (
          <>
            <Validation>{validationMessage}</Validation>{' '}
          </>
        )}
        <Description>{description}</Description>
      </DescriptionAndValidation>
    </InputRoot>
  );
};

export default {
  component: StoryInput,
  // TODO(thure): Refactor
  argTypes: {
    label: { control: 'text' },
    description: { control: 'text' },
    validationMessage: { control: 'text' },
    validationValence: {
      control: 'select',
      options: ['success', 'info', 'warning', 'error']
    },
    size: {
      control: 'select',
      options: ['md', 'lg', 'pin']
    }
  }
};

export const Default = {
  args: {
    label: 'Hello',
    placeholder: 'This is an input',
    disabled: false,
    description: undefined,
    labelVisuallyHidden: false,
    descriptionVisuallyHidden: false,
    validationMessage: '',
    validationValence: undefined,
    length: 6
  }
};

export const DensityFine = {
  args: {
    label: 'This is an Input with a density value of ‘fine’',
    placeholder: 'This is a density:fine input',
    disabled: false,
    description: undefined,
    labelVisuallyHidden: false,
    descriptionVisuallyHidden: false,
    validationMessage: '',
    validationValence: undefined,
    length: 6,
    density: 'fine'
  }
};

export const Subdued = {
  args: {
    label: 'Hello',
    placeholder: 'This is a subdued input',
    disabled: false,
    description: undefined,
    labelVisuallyHidden: false,
    descriptionVisuallyHidden: false,
    validationMessage: '',
    validationValence: undefined,
    length: 6,
    variant: 'subdued'
  }
};

export const Disabled = {
  args: {
    label: 'Disabled',
    placeholder: 'This is a disabled input',
    disabled: true
  }
};

export const LabelVisuallyHidden = {
  args: {
    label: 'The label is for screen readers',
    labelVisuallyHidden: true,
    placeholder: 'The label for this input exists but is only read by screen readers'
  }
};

export const InputWithDescription = {
  args: {
    label: 'Described input',
    placeholder: 'This input has an accessible description',
    description: 'This helper text is accessibly associated with the input.'
  }
};

export const InputWithErrorAndDescription = {
  args: {
    label: 'Described invalid input',
    placeholder: 'This input has both an accessible description and a validation error',
    description: 'This description is identified separately in the accessibility tree.',
    validationValence: 'error',
    validationMessage: 'The input has an error.'
  }
};

export const InputWithValidationAndDescription = {
  args: {
    label: 'Described input with validation message',
    placeholder: 'This input is styled to express a validation valence',
    description: 'This description is extra.',
    validationValence: 'success',
    validationMessage: 'This validation message is really part of the description.'
  }
};

export const PinInput = {
  args: {
    label: 'This input is a PIN-style input',
    size: 'pin',
    length: 6,
    description: 'Type in secret you received',
    placeholder: '••••••'
  }
};

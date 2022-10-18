//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Input, InputProps } from './Input';

export default {
  title: 'react-ui/Input',
  component: Input
};

const Template = (props: InputProps) => {
  return <Input {...props} />;
};

export const Default = templateForComponent(Template)({ label: '' });
Default.args = { label: 'Hello', placeholder: 'This is an input', disabled: false, description: undefined, labelVisuallyHidden: false, descriptionVisuallyHidden: false };

export const Disabled = () => (
<Template {...{
  label: 'Disabled',
  placeholder: 'This is a disabled input',
  disabled: true
}} />
);

export const LabelVisuallyHidden = () => (
<Template {...{
  label: 'The label is for screen readers',
  labelVisuallyHidden: true,
  placeholder:
    'The label for this input exists but is only read by screen readers'
}} />
);

export const InputWithDescription = () => (
<Template {...{
  label: 'Described input',
  placeholder: 'This input has an accessible description',
  description: 'This helper text is accessibly associated with the input.'
}} />
);

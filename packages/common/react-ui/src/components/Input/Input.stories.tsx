//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../dev-util';
import { Input, InputProps } from './Input';

export default {
  title: 'react-ui/Input',
  component: Input
};

const Template = (props: InputProps) => {
  return <Input {...props} />;
};

const defaultProps = { label: '' };

export const Default = templateForComponent(Template)(defaultProps);
Default.args = { label: 'Hello', placeholder: 'This is an input' };

export const Disabled = templateForComponent(Template)(defaultProps);
Disabled.args = {
  label: 'Disabled',
  placeholder: 'This is a disabled input',
  disabled: true
};

export const LabelVisuallyHidden = templateForComponent(Template)(defaultProps);
LabelVisuallyHidden.args = {
  label: 'The label is for screen readers',
  labelVisuallyHidden: true,
  placeholder:
    'The label for this input exists but is only read by screen readers'
};

export const InputWithDescription =
  templateForComponent(Template)(defaultProps);
InputWithDescription.args = {
  label: 'Described input',
  placeholder: 'This input has an accessible description',
  description: 'This helper text is accessibly associated with the input.'
};

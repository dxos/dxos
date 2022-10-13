//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { Input } from './Input';

export default {
  title: 'react-ui/Input'
};

export const Default = () => {
  return <Input {...{ label: 'Hello', placeholder: 'This is an input' }} />;
};

export const Disabled = () => {
  return <Input {...{ label: 'Disabled', placeholder: 'This is a disabled input', disabled: true }} />;
};

export const LabelVisuallyHidden = () => {
  return <Input {...{ label: 'The label is for screen readers', labelVisuallyHidden: true, placeholder: 'The label for this input exists but is only read by screen readers' }} />;
};

export const InputWithDescription = () => {
  return <Input {...{ label: 'Described input', placeholder: 'This input has an accessible description', description: 'This helper text is accessibly associated with the input.' }} />;
};

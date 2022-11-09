//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import React from 'react';

import { templateForComponent } from '../../testing';
import { PinInput, PinInputProps } from './PinInput';

export default {
  title: 'react-ui/PinInput',
  component: PinInput
};

const Template = (props: PinInputProps) => {
  return <PinInput {...props} />;
};

export const Default = templateForComponent(Template)({ label: '', length: 6 });
Default.args = {
  label: 'Hello',
  length: 6
};

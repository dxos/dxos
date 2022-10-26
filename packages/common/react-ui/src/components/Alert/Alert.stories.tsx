//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';
import { Info } from 'phosphor-react';
import React from 'react';

import { templateForComponent } from '../../testing';
import { Alert, AlertProps } from './Alert';

export default {
  title: 'react-ui/Alert',
  component: Alert
};

const Template = ({ children, ...props }: AlertProps) => {
  return <Alert {...props}>{children}</Alert>;
};

export const Default = templateForComponent(Template)({ title: '' });
Default.args = {
  title: (
    <>
      <Info className='inline w-5 h-5 mb-1' weight='duotone' />
      {' Alert title'}
    </>
  ),
  valence: 'error',
  children: 'Alert content'
};

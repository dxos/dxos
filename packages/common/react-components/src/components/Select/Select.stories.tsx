//
// Copyright 2023 DXOS.org
//

import React from 'react';

import '@dxosTheme';
import { Select, SelectProps } from './Select';

export default {
  component: Select,
  actions: { argTypesRegex: '^on.*' }
};

export const Normal = () => {
  return <Select options={[{ title: 'Banana' }, { title: 'Orange' }, { title: 'Pear' }]} />;
};

export const Strings = () => {
  return <Select options={['Banana', 'Orange', 'Pear', 'Apple', 'Plum', 'Grapefruit', 'Pineapple', 'Melon']} />;
};

export const DefaultValue = () => {
  return (
    <Select
      defaultValue='Orange'
      options={['Banana', 'Orange', 'Pear', 'Apple', 'Plum', 'Grapefruit', 'Pineapple', 'Melon']}
    />
  );
};

export const DisabledItems = () => {
  return (
    <Select
      options={[
        'Banana',
        'Orange',
        'Pear',
        'Apple',
        { disabled: true, title: 'Plum' },
        'Grapefruit',
        { disabled: true, title: 'Pineapple' },
        'Melon'
      ]}
    />
  );
};

export const Events = (props: SelectProps) => {
  return (
    <Select
      options={[{ title: 'Banana', id: 'banana' }, 'Orange', 'Pear', 'Apple', 'Grapefruit', 'Melon']}
      {...props}
    />
  );
};

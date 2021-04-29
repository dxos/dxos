//
// Copyright 2021 DXOS.org
//

import { withKnobs } from '@storybook/addon-knobs';
import React from 'react';

export default {
  title: 'Airtable',
  decorators: [withKnobs]
};

export const withPrimary = () => {
  return (
    <div>Primary</div>
  );
};

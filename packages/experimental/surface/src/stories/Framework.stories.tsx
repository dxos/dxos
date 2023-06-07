//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { TestApp } from './TestApp';

export default {
  component: TestApp,
  parameters: {
    layout: 'fullscreen',
  },
};

export const Default = () => <TestApp />;
